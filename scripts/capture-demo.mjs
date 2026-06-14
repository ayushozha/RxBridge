/**
 * Captures the full RxBridge demo as a static, replayable script.
 *
 * Runs the real flow against the local dev server (real gpt-5.5 answers, real
 * chart and rescue data, real negotiation audio) and writes lib/demo-script.ts,
 * a typed constant the /demo page replays with zero live API calls.
 *
 * Usage: node scripts/capture-demo.mjs   (dev server must be on :3000)
 */

import { writeFileSync } from "node:fs";

const BASE = process.env.DEMO_BASE ?? "http://localhost:3000";
const PATIENT = "demo-marcus";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Retry transient failures (cold start drops the first request) up to 4 times.
async function fetchRetry(url, init, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90_000);
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      return res;
    } catch (e) {
      lastErr = e;
      console.log(`  retry ${i + 1}/${attempts} after: ${e.message}`);
      await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

async function postJson(path, body) {
  return fetchRetry(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function tool(name, args) {
  const res = await postJson("/api/tool", { name, args });
  if (!res.ok) throw new Error(`tool ${name} -> HTTP ${res.status}`);
  return res.json();
}

async function chat(messages) {
  // The chat route streams text, then optionally a U+001E separator and a
  // JSON artifacts line. We only need the text for the demo script here.
  const res = await postJson("/api/chat", { messages });
  if (!res.ok || !res.body) throw new Error(`chat -> HTTP ${res.status}`);
  const raw = await res.text();
  const SEP = String.fromCharCode(30);
  return raw.split(SEP)[0].trim();
}

const turns = [];
function userTurn(text) {
  turns.push({ speaker: "user", text });
}
function assistantTurn(text, artifacts) {
  turns.push({ speaker: "assistant", text, artifacts: artifacts ?? [] });
}

async function main() {
  console.log("Capturing demo against", BASE);

  // Beat 1: the problem.
  userTurn(
    "My pharmacy just told me they are out of my Ozempic and they do not know when it will be back. I only have a few days left.",
  );
  const reply1 = await chat([
    { role: "user", content: turns[turns.length - 1].text },
  ]);
  console.log("  beat1 reply chars:", reply1.length);

  // Beat 2: show the supply chart (health overview, multi series).
  const overview = await tool("get_health_overview", { patientId: PATIENT });
  assistantTurn(
    reply1 +
      "\n\nHere is your recent days of supply. Your semaglutide is dropping fast.",
    [overview.artifact],
  );

  // Beat 3: start the rescue, render the tracker.
  userTurn("Please start a rescue for my Ozempic.");
  const start = await tool("start_rescue", {
    patientId: PATIENT,
    medication: "Semaglutide (Ozempic)",
  });
  const caseId = start.artifact.caseId;
  console.log("  caseId:", caseId);
  assistantTurn(
    "I started a rescue case. I checked the shortage, checked nearby pharmacy stock, and found an in stock candidate alternative. It needs prescriber authorization, so I will call to arrange it.",
    [start.artifact],
  );

  // Authorize so the negotiation has an approved candidate.
  const caseRes = await fetchRetry(`${BASE}/api/cases?caseId=${caseId}`, {});
  const caseData = await caseRes.json();
  const candidateId = caseData.substitutionCandidates[0]?.id;
  await tool("authorize_candidate", { caseId, candidateId });

  // Beat 4: the two voice negotiation call, with real audio.
  userTurn("Great, please call the pharmacy and arrange it.");
  const nego = await tool("start_negotiation", { caseId });
  const withAudio = nego.artifact.turns.filter((t) => t.audio).length;
  console.log(
    "  negotiation turns:",
    nego.artifact.turns.length,
    "with audio:",
    withAudio,
  );
  assistantTurn(
    "I am calling the pharmacy now. You can listen in.",
    [nego.artifact],
  );

  // Beat 5: confirm and render the rescue packet.
  await tool("confirm_pharmacy_fill", { caseId });
  const packet = await tool("get_rescue_packet", { caseId });
  assistantTurn(
    "Done. Your alternative is reserved for same day pickup. Here is your rescue packet.",
    [packet.artifact],
  );

  const script = {
    capturedAt: new Date().toISOString(),
    patientId: PATIENT,
    patientName: "Marcus L.",
    turns,
  };

  const out =
    "/**\n" +
    " * Pre-recorded RxBridge demo conversation, captured from a real run.\n" +
    " *\n" +
    " * The /demo page replays this with zero live API calls, so it is a\n" +
    " * dependable fallback if the live demo fails. Audio data uris are real,\n" +
    " * captured from the negotiation route. Regenerate with:\n" +
    " *   node scripts/capture-demo.mjs\n" +
    " */\n\n" +
    'import type { Artifact } from "@/lib/artifacts";\n\n' +
    "export interface DemoTurn {\n" +
    '  speaker: "user" | "assistant";\n' +
    "  text: string;\n" +
    "  artifacts?: Artifact[];\n" +
    "}\n\n" +
    "export interface DemoScript {\n" +
    "  capturedAt: string;\n" +
    "  patientId: string;\n" +
    "  patientName: string;\n" +
    "  turns: DemoTurn[];\n" +
    "}\n\n" +
    "export const DEMO_SCRIPT: DemoScript = " +
    JSON.stringify(script, null, 2) +
    ";\n";

  writeFileSync(new URL("../lib/demo-script.ts", import.meta.url), out, "utf8");
  const bytes = Buffer.byteLength(out, "utf8");
  console.log(
    "Wrote lib/demo-script.ts (",
    Math.round(bytes / 1024),
    "KB,",
    turns.length,
    "turns )",
  );
}

main().catch((e) => {
  console.error("CAPTURE FAILED:", e.message);
  process.exit(1);
});
