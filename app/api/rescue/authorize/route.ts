import { guardRequest } from "@/lib/request-guard";
import { authorizeCandidate } from "@/lib/services/rescue-workflow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  let body: { caseId?: unknown; candidateId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const caseId = String(body.caseId ?? "");
  const candidateId = String(body.candidateId ?? "");
  if (!caseId || !candidateId) {
    return Response.json(
      { error: "caseId and candidateId are required." },
      { status: 400 },
    );
  }

  const rescueCase = authorizeCandidate(caseId, candidateId);
  if (!rescueCase) {
    return Response.json(
      { error: "Case or candidate was not found." },
      { status: 404 },
    );
  }

  return Response.json(rescueCase);
}
