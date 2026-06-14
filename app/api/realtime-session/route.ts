import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { guardRequest } from "@/lib/request-guard";
import { REALTIME_TOOLS } from "@/lib/tools";
import { PRIMARY_PATIENT_ID, getPatient } from "@/lib/patient-data";

/**
 * Mints a short lived ephemeral client secret for the OpenAI Realtime API.
 *
 * The browser calls this endpoint, gets back a token that is valid for about a
 * minute, and uses it to open a WebRTC connection straight to OpenAI. The real
 * OPENAI_API_KEY never leaves the server. A same origin check and a small rate
 * limit keep the endpoint from being driven as a free token mint.
 */
export const runtime = "nodejs";

const MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2";

/** System instructions plus who the current patient is, so the assistant can
 * call tools that need a patientId without asking. */
function instructions(): string {
  const patient = getPatient(PRIMARY_PATIENT_ID);
  if (!patient) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\nCurrent patient: ${patient.displayName} (patientId "${patient.id}"), region ${patient.region}.`;
}
const VOICE = process.env.OPENAI_REALTIME_VOICE ?? "marin";

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY is not set. Copy .env.example to .env.local and add your key.",
      },
      { status: 500 },
    );
  }

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: MODEL,
          instructions: instructions(),
          tools: REALTIME_TOOLS,
          tool_choice: "auto",
          audio: {
            input: {
              transcription: { model: "gpt-realtime-whisper" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 600,
              },
            },
            output: { voice: VOICE },
          },
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Failed to mint realtime client secret:", res.status, detail);
      return Response.json(
        { error: "Could not start a voice session. Please try again." },
        { status: 502 },
      );
    }

    const data = await res.json();

    // The token lives at value (current shape) or client_secret.value (older
    // shape). Read both so we are resilient to minor response changes.
    const value: string | undefined =
      data?.value ?? data?.client_secret?.value;

    if (!value) {
      console.error("Realtime client secret response had no token:", data);
      return Response.json(
        { error: "Could not start a voice session. Please try again." },
        { status: 502 },
      );
    }

    return Response.json({ token: value, model: MODEL });
  } catch (err) {
    console.error("Realtime session request failed:", err);
    return Response.json(
      { error: "Could not start a voice session. Please try again." },
      { status: 502 },
    );
  }
}
