import { getRescueCase } from "@/lib/case-store";
import { guardRequest } from "@/lib/request-guard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 60, windowMs: 60_000 });
  if (blocked) return blocked;

  const caseId = new URL(req.url).searchParams.get("caseId");
  if (!caseId) {
    return Response.json({ error: "caseId is required." }, { status: 400 });
  }

  const rescueCase = await getRescueCase(caseId);
  if (!rescueCase) {
    return Response.json({ error: "Case not found." }, { status: 404 });
  }

  return Response.json(rescueCase);
}
