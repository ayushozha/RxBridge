/**
 * Server side speech generation for the provider negotiation call.
 *
 * Two distinct AI voices:
 *   - the RxBridge agent speaks with OpenAI (GPT Realtime 2 family voice via the
 *     OpenAI speech endpoint),
 *   - the pharmacy speaks with the xAI Grok Voice Agent API
 *     (wss://api.x.ai/v1/realtime), text in, audio out.
 *
 * Each returns a base64 data URI the browser can play. If a provider is not
 * authorized for audio on this key, or anything fails, we return null and the
 * widget falls back to the browser speech synthesizer, so the call always plays
 * on stage.
 */

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";
const GROK_REALTIME_URL =
  "wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.0";

/** Speak as the RxBridge agent using OpenAI. Returns an mp3 data URI or null. */
export async function speakAgent(text: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
        voice: process.env.OPENAI_AGENT_VOICE ?? "verse",
        input: text,
        response_format: "mp3",
      }),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:audio/mpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Speak as the pharmacy using the Grok Voice Agent API. Connects, sends the
 * line as text, collects the streamed PCM16 audio, and returns a WAV data URI.
 * Returns null if the key is not authorized or anything fails.
 */
// Once Grok audio fails or is unauthorized, skip it for the rest of the
// process so the negotiation does not stall on repeated timeouts. The browser
// speech fallback keeps the call playing.
let grokAudioDisabled = false;

export async function speakPharmacy(text: string): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key || grokAudioDisabled) return null;

  // ws is a Node dependency that may not be installed. Import lazily so a
  // missing module never breaks the build; we just fall back to browser speech.
  let WebSocketImpl: typeof import("ws").WebSocket | undefined;
  try {
    const mod = await import("ws");
    WebSocketImpl = mod.WebSocket ?? (mod.default as unknown as typeof mod.WebSocket);
  } catch {
    return null;
  }
  if (!WebSocketImpl) return null;

  return new Promise<string | null>((resolve) => {
    let settled = false;
    const pcmChunks: Buffer[] = [];
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // ignore
      }
      resolve(value);
    };

    const ws = new WebSocketImpl(GROK_REALTIME_URL, {
      headers: { Authorization: `Bearer ${key}` },
    });

    // Hard timeout so a hung socket never blocks the request. Kept short so a
    // gated key fails fast and the call falls back to browser speech quickly.
    const timer = setTimeout(() => {
      if (pcmChunks.length === 0) grokAudioDisabled = true;
      finish(toWav(pcmChunks));
    }, 4_000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            voice: process.env.XAI_PHARMACY_VOICE ?? "rex",
            instructions:
              "You are a pharmacist on a phone call. Read the given line naturally and briefly.",
            audio: {
              output: { format: { type: "audio/pcm", rate: 24000 } },
            },
          },
        }),
      );
      ws.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text }],
          },
        }),
      );
      ws.send(JSON.stringify({ type: "response.create" }));
    });

    ws.on("message", (raw: Buffer) => {
      let evt: Record<string, unknown>;
      try {
        evt = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (
        evt.type === "response.output_audio.delta" &&
        typeof evt.delta === "string"
      ) {
        pcmChunks.push(Buffer.from(evt.delta, "base64"));
      } else if (evt.type === "response.done") {
        clearTimeout(timer);
        finish(toWav(pcmChunks));
      } else if (evt.type === "error") {
        clearTimeout(timer);
        grokAudioDisabled = true;
        finish(null);
      }
    });

    ws.on("error", () => {
      clearTimeout(timer);
      grokAudioDisabled = true;
      finish(null);
    });
    ws.on("close", () => {
      clearTimeout(timer);
      finish(toWav(pcmChunks));
    });
  });
}

/** Wrap raw PCM16 mono 24kHz chunks as a WAV data URI, or null if empty. */
function toWav(chunks: Buffer[]): string | null {
  if (chunks.length === 0) return null;
  const data = Buffer.concat(chunks);
  const sampleRate = 24000;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  const wav = Buffer.concat([header, data]);
  return `data:audio/wav;base64,${wav.toString("base64")}`;
}
