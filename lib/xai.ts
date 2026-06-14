/**
 * Realtime-news subagent client for the xAI (Grok) Responses API.
 *
 * This is a thin, server-only wrapper that asks Grok to run a live web/news
 * search (via the web_search tool) and return a STRUCTURED JSON answer that
 * matches a caller-supplied JSON schema. It uses only the built-in global
 * fetch, so it adds no npm dependency and is safe to import from a Next.js
 * App Router route handler running on the Node runtime.
 *
 * Never log or surface the API key. Errors are kept generic so request
 * internals do not leak to clients.
 */

const XAI_ENDPOINT = "https://api.x.ai/v1/responses";
const DEFAULT_MODEL = "grok-4.3";
const DEFAULT_TIMEOUT_MS = 60_000;

/** A single deduped citation backing a Grok answer. */
export interface XaiCitation {
  url: string;
  title: string;
}

/** Annotation shape returned on the message content item. */
interface XaiAnnotation {
  type?: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

interface XaiMessageContent {
  type?: string;
  text?: string;
  annotations?: XaiAnnotation[];
}

interface XaiOutputItem {
  type?: string;
  content?: XaiMessageContent[];
}

interface XaiResponse {
  status?: string;
  error?: unknown;
  output?: XaiOutputItem[];
}

/**
 * Run a realtime web/news search through Grok and parse the answer as T.
 *
 * The schema describes the JSON object Grok must return. The returned data is
 * that parsed object, alongside the deduped citations Grok used.
 */
export async function grokStructuredSearch<T>(args: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<{ data: T; citations: XaiCitation[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set.");
  }

  const model = process.env.XAI_MODEL || DEFAULT_MODEL;

  const body = {
    model,
    input: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    tools: [{ type: "web_search" }],
    text: {
      format: {
        type: "json_schema",
        name: args.schemaName,
        schema: args.schema,
        // strict mode makes Grok return JSON that always matches the schema,
        // so the JSON.parse below is reliable instead of best effort.
        strict: true,
      },
    },
  };

  // Use the caller's signal if provided, otherwise enforce our own timeout.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let signal: AbortSignal;
  if (args.signal) {
    signal = args.signal;
  } else {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(XAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const detail = text.slice(0, 300);
    throw new Error(`xAI request failed (${response.status}): ${detail}`);
  }

  const parsed = (await response.json()) as XaiResponse;

  if (parsed.error || parsed.status !== "completed") {
    const reason = parsed.status ? `status ${parsed.status}` : "request error";
    throw new Error(`xAI did not complete the search (${reason}).`);
  }

  const message = (parsed.output || []).find((item) => item.type === "message");
  // The content array can hold more than one item, and the text lives on the
  // one whose type is "output_text". Do not assume it is at index 0.
  const content =
    message?.content?.find((c) => c.type === "output_text") ??
    message?.content?.[0];
  const rawText = content?.text;
  if (!rawText) {
    throw new Error("Grok returned no message output.");
  }

  let data: T;
  try {
    data = JSON.parse(rawText) as T;
  } catch {
    throw new Error("Grok returned malformed JSON.");
  }

  const citations = collectCitations(content?.annotations);

  return { data, citations };
}

/** Dedupe annotations by url and map them to {url, title}. */
function collectCitations(annotations: XaiAnnotation[] | undefined): XaiCitation[] {
  if (!annotations) {
    return [];
  }

  const seen = new Set<string>();
  const citations: XaiCitation[] = [];

  for (const annotation of annotations) {
    const url = annotation.url;
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const title = annotation.title?.trim() || hostnameOf(url);
    citations.push({ url, title });
  }

  return citations;
}

/** Best-effort hostname for a citation fallback title. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const XAI_CHAT_ENDPOINT = "https://api.x.ai/v1/chat/completions";
const DEFAULT_FAST_MODEL = "grok-4.20-0309-non-reasoning";

export interface PharmacyFinding {
  pharmacyName: string;
  note: string;
  likelyInStock: boolean;
}

/**
 * Finds real pharmacies in the USA that may carry a medication, in realtime,
 * using Grok web search. Returns a short list with a note each, or null if the
 * search is unavailable so the caller can fall back to synthetic pharmacies.
 */
export async function grokFindPharmacies(args: {
  medication: string;
  region: string;
  signal?: AbortSignal;
}): Promise<PharmacyFinding[] | null> {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      pharmacies: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            pharmacyName: { type: "string" },
            note: { type: "string" },
            likelyInStock: { type: "boolean" },
          },
          required: ["pharmacyName", "note", "likelyInStock"],
        },
      },
    },
    required: ["pharmacies"],
  };

  try {
    const { data } = await grokStructuredSearch<{ pharmacies: PharmacyFinding[] }>({
      system:
        "You find real pharmacies in the United States that a patient could realistically use to fill a medication, using current web information. Prefer well known national chains and mail order options. For each, give the pharmacy name, a one line note on availability or how to check stock, and a best guess at whether it likely has the medication. Never use the em dash or en dash characters.",
      user: `Find up to 4 pharmacies in ${args.region} a patient could use to fill ${args.medication} during a shortage. Include at least one mail order option.`,
      schemaName: "pharmacy_finder",
      schema,
      signal: args.signal,
    });
    const list = Array.isArray(data?.pharmacies) ? data.pharmacies : [];
    return list.length > 0 ? list.slice(0, 4) : null;
  } catch {
    return null;
  }
}

export interface NegotiationScriptLine {
  speaker: "agent" | "pharmacy";
  text: string;
  price?: number;
}

/**
 * Generates a natural, human sounding pharmacy negotiation in realtime using a
 * fast Grok model. Returns an ordered list of turns where the RxBridge agent
 * and the pharmacist haggle over price and settle, or null if the model is
 * unavailable so the caller can fall back to a fixed script.
 */
export async function grokNegotiationScript(args: {
  medication: string;
  pharmacyName: string;
  signal?: AbortSignal;
}): Promise<{ lines: NegotiationScriptLine[]; agreedPrice: number } | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.XAI_FAST_MODEL || DEFAULT_FAST_MODEL;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let signal = args.signal;
  if (!signal) {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 20_000);
    signal = controller.signal;
  }

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      lines: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            speaker: { type: "string", enum: ["agent", "pharmacy"] },
            text: { type: "string" },
            price: { type: ["number", "null"] },
          },
          required: ["speaker", "text", "price"],
        },
      },
      agreedPrice: { type: "number" },
    },
    required: ["lines", "agreedPrice"],
  };

  try {
    const res = await fetch(XAI_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model,
        response_format: {
          type: "json_schema",
          json_schema: { name: "negotiation", schema, strict: true },
        },
        messages: [
          {
            role: "system",
            content:
              "You write a short, natural phone negotiation between two people: a patient care agent from RxBridge and a pharmacist. They talk like real humans, with warmth, small acknowledgements, and back and forth haggling over the cash price of a medication that is in shortage. The agent is polite but advocates for a fair out of pocket price. The pharmacist quotes a starting price, the agent pushes back once or twice, and they settle on a middle price and reserve it for same day pickup. Keep it 6 to 8 turns, alternating speakers, starting with the agent. Put the dollar amount in the price field whenever a price is mentioned, null otherwise. Stay realistic and friendly. Never use the em dash or en dash characters.",
          },
          {
            role: "user",
            content: `Medication: ${args.medication}. Pharmacy: ${args.pharmacyName}. Write the negotiation. End with the pharmacist confirming the reservation at the agreed price.`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.lines) || parsed.lines.length === 0) return null;
    const lines: NegotiationScriptLine[] = parsed.lines.map(
      (l: { speaker: string; text: string; price: number | null }) => ({
        speaker: l.speaker === "pharmacy" ? "pharmacy" : "agent",
        text: String(l.text),
        price: typeof l.price === "number" ? l.price : undefined,
      }),
    );
    return { lines, agreedPrice: Number(parsed.agreedPrice) || 0 };
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Explains a chart in realtime using a fast, low latency Grok model.
 *
 * Given a plain text description of the chart data and the patient's question,
 * returns a short, friendly explanation suitable for both reading and speaking.
 * Returns null if the key is missing or the call fails, so the caller can fall
 * back to a deterministic explanation.
 */
export async function grokExplainChart(args: {
  question: string;
  chartSummary: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.XAI_FAST_MODEL || DEFAULT_FAST_MODEL;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let signal = args.signal;
  if (!signal) {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 20_000);
    signal = controller.signal;
  }

  try {
    const res = await fetch(XAI_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are RxBridge, a calm healthcare assistant explaining a chart to a patient. Use the chart data provided. Be warm, plain, and brief, a few short sentences that work read or spoken. Explain what the lines mean and what is worth watching, especially any medication running low. Never tell the patient to change a dose, defer dose and treatment changes to their clinician or pharmacist. Never use the em dash or en dash characters.",
          },
          {
            role: "user",
            content: `Patient question: ${args.question}\n\nChart data:\n${args.chartSummary}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
