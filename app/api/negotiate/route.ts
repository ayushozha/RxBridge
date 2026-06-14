import { guardRequest } from "@/lib/request-guard";
import { runNegotiation } from "@/lib/services/negotiation";
import type { NegotiationCallArtifact } from "@/lib/artifacts";

/**
 * Runs the two voice provider negotiation for a rescue case and returns it as a
 * negotiation_call artifact: the RxBridge agent (OpenAI voice) and the pharmacy
 * (Grok voice) trading prices until they agree and reserve the alternative.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 12, windowMs: 60_000 });
  if (blocked) return blocked;

  let caseId: string;
  try {
    const body = await req.json();
    caseId = String(body.caseId ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!caseId) {
    return Response.json({ error: "Missing caseId." }, { status: 400 });
  }

  const result = await runNegotiation(caseId);
  if (!result) {
    return Response.json({ error: "Unknown rescue case." }, { status: 404 });
  }

  const artifact: NegotiationCallArtifact = {
    id: `negotiation-${result.caseId}`,
    type: "negotiation_call",
    title: "Live pharmacy negotiation",
    caseId: result.caseId,
    medication: result.medication,
    pharmacyName: result.pharmacyName,
    turns: result.turns,
    agreedPrice: result.agreedPrice,
    outcome: result.outcome,
  };

  return Response.json({ artifact, result });
}
