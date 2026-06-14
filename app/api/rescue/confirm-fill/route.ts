import { guardRequest } from "@/lib/request-guard";
import { confirmPharmacyFill } from "@/lib/services/rescue-workflow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  let body: { caseId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const caseId = String(body.caseId ?? "");
  if (!caseId) {
    return Response.json({ error: "caseId is required." }, { status: 400 });
  }

  const rescueCase = confirmPharmacyFill(caseId);
  if (!rescueCase) {
    return Response.json(
      { error: "Case is missing, not authorized, or has no selected candidate." },
      { status: 404 },
    );
  }

  return Response.json(rescueCase);
}
