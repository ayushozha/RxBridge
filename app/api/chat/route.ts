import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { guardRequest } from "@/lib/request-guard";
import { OPENAI_TOOLS } from "@/lib/tools";
import { runTool } from "@/lib/tool-runtime";
import type { Artifact } from "@/lib/artifacts";
import { PRIMARY_PATIENT_ID, getPatient } from "@/lib/patient-data";
import { getHealthOverview } from "@/lib/trends";
import { grokExplainChart } from "@/lib/xai";

/**
 * Streaming text chat with the patient assistant, with tool calls.
 *
 * Flow:
 *   1. Ask the model with the tool list. If it wants tools, run Agent B's
 *      deterministic handlers, collect any artifacts, and feed the tool results
 *      back to the model.
 *   2. Stream the model's final text reply to the client.
 *   3. After the text, append a record separator and a JSON line carrying the
 *      artifacts, which the client renders inline.
 *
 * Voice mode uses the Realtime WebRTC connection. The OPENAI_API_KEY stays
 * server side. The record separator is U+001E.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

// The text chat uses xAI Grok by default, which has a very fast non reasoning
// model, so replies feel instant. Set CHAT_PROVIDER=openai to use OpenAI.
const PROVIDER = process.env.CHAT_PROVIDER ?? "xai";
const USE_XAI = PROVIDER === "xai";

const CHAT_URL = USE_XAI
  ? "https://api.x.ai/v1/chat/completions"
  : "https://api.openai.com/v1/chat/completions";
const CHAT_KEY = USE_XAI
  ? process.env.XAI_API_KEY
  : process.env.OPENAI_API_KEY;
const MODEL = USE_XAI
  ? (process.env.XAI_FAST_MODEL ?? "grok-4.20-0309-non-reasoning")
  : (process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini");

const SEP = String.fromCharCode(30);
const MAX_TOOL_ROUNDS = 6;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type ApiMessage = Record<string, unknown>;

function authHeaders() {
  return {
    Authorization: `Bearer ${CHAT_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 30, windowMs: 60_000 });
  if (blocked) return blocked;

  if (!CHAT_KEY) {
    return Response.json(
      { error: `${USE_XAI ? "XAI_API_KEY" : "OPENAI_API_KEY"} is not set.` },
      { status: 500 },
    );
  }

  let messages: ChatMessage[];
  let patientId = PRIMARY_PATIENT_ID;
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages)) throw new Error("messages must be an array");
    // Use the patient the client has selected, if valid.
    if (typeof body.patientId === "string" && getPatient(body.patientId)) {
      patientId = body.patientId;
    }
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Realtime chart explanation: when the patient asks to understand a chart,
  // explain it live with a fast Grok model using the real chart data. Falls
  // back to a deterministic explanation if the model is unavailable.
  const chartContext = chartExplanationContext(messages, patientId);
  if (chartContext) {
    let reply = await grokExplainChart({
      question: chartContext.question,
      chartSummary: chartContext.summary,
    });
    if (!reply) reply = chartContext.fallback;
    return new Response(reply, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // Tell the model who the current patient is, so tools that need a patientId
  // can be called without asking, and so it greets the right person. This
  // overrides any name baked into the base system prompt.
  const patient = getPatient(patientId);
  const firstName = patient?.displayName.split(" ")[0] ?? "there";
  const context = patient
    ? `The current patient is ${patient.displayName} (patientId "${patient.id}"), region ${patient.region}. Always address this patient as ${firstName}. Ignore any other patient name mentioned earlier in your instructions; ${firstName} is who you are speaking with now.`
    : "";

  const convo: ApiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(context ? [{ role: "system", content: context }] : []),
    ...messages,
  ];

  const artifacts: Artifact[] = [];

  // Tool-call rounds, no streaming, until the model stops requesting tools.
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: MODEL,
          messages: convo,
          tools: OPENAI_TOOLS,
          tool_choice: "auto",
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("OpenAI tool pass error:", res.status, detail.slice(0, 300));
        return Response.json(
          { error: "The assistant is unavailable right now." },
          { status: 502 },
        );
      }
      const json = await res.json();
      const choice = json.choices?.[0];
      const toolCalls = choice?.message?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // No tools wanted, done with the tool phase.
        break;
      }

      // Record the assistant tool-call message, then run each tool.
      convo.push(choice.message);
      for (const call of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? "{}");
        } catch {
          args = {};
        }
        const result = await runTool(call.function?.name, args);
        if (result.artifact) artifacts.push(result.artifact);
        // Give the model the structured result, not just a sentence, so it can
        // chain off real values: the case id and candidate id to authorize and
        // negotiate, the medication names to pick the urgent one, and so on.
        const toolContent = result.data
          ? `${result.summary}\n\nStructured result (use these exact values to continue, do not ask the patient for them):\n${JSON.stringify(result.data)}`
          : result.summary;
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolContent,
        });
      }
    }
  } catch (err) {
    console.error("Chat tool phase failed:", err);
    return Response.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }

  // Final streamed reply. The model now has any tool results in context.
  let upstream: Response;
  try {
    upstream = await fetch(CHAT_URL, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ model: MODEL, stream: true, messages: convo }),
    });
  } catch (err) {
    console.error("Chat stream request failed:", err);
    return Response.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    console.error("OpenAI chat error:", upstream.status, detail.slice(0, 300));
    return Response.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // Append the artifacts payload after the text, if any.
        if (artifacts.length > 0) {
          controller.enqueue(encoder.encode(SEP + JSON.stringify({ artifacts })));
        }
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          if (artifacts.length > 0) {
            controller.enqueue(
              encoder.encode(SEP + JSON.stringify({ artifacts })),
            );
          }
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // ignore partial / non JSON lines
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

interface ChartExplanationContext {
  question: string;
  summary: string;
  fallback: string;
}

/**
 * If the latest user message asks to understand a chart, returns the question,
 * a plain text summary of the real chart data for the fast model, and a
 * deterministic fallback explanation. Returns null otherwise.
 */
function chartExplanationContext(
  messages: ChatMessage[],
  patientId: string,
): ChartExplanationContext | null {
  const latestRaw = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  const latest = latestRaw?.toLowerCase();
  if (!latest) return null;

  const asksAboutChart =
    latest.includes("chart") &&
    (latest.includes("explain") ||
      latest.includes("more") ||
      latest.includes("mean") ||
      latest.includes("understand"));
  if (!asksAboutChart) return null;

  const overview = getHealthOverview(patientId);
  if (!overview || overview.points.length === 0) return null;

  // A compact text rendering of the series so the fast model has the real data.
  const first = overview.points[0];
  const last = overview.points[overview.points.length - 1];
  const lines = overview.series.map((series) => {
    const start = first[series.key];
    const end = last[series.key];
    return `${series.label}: ${start} to ${end} ${series.unit ?? overview.unit} over ${overview.points.length} days`;
  });
  const summary = `Chart: ${overview.label}. Each line is a medication's days of supply on hand, by date.\n${lines.join("\n")}`;

  const finalValues = overview.series
    .map((series) => {
      const value = last[series.key];
      if (typeof value !== "number") return null;
      return `${series.label} ends at ${value} ${series.unit ?? overview.unit}`;
    })
    .filter((line): line is string => line != null)
    .join("; ");

  const fallback = `That chart is showing days of medication on hand over time. Each line is one medication, and the lower the line gets, the closer that medication is to needing refill action.\n\nOn the latest date, ${finalValues}.\n\nThe main thing to watch is the slope. A line near 7 days means it is time to plan the refill early. A line near 3 days means the refill should be handled today, especially for rescue or critical medications.\n\nDo not change doses based on the chart. Use it to decide what to ask your pharmacist or clinician next.`;

  return { question: latestRaw ?? "Explain my chart.", summary, fallback };
}
