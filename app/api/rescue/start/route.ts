import { guardRequest } from "@/lib/request-guard";
import { startRescueWorkflow } from "@/lib/services/rescue-workflow";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  let body: { patientId?: unknown; medication?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patientId = String(body.patientId ?? "");
  const medication = String(body.medication ?? "");
  if (!patientId || !medication) {
    return Response.json(
      { error: "patientId and medication are required." },
      { status: 400 },
    );
  }

  const rescueCase = await startRescueWorkflow({ patientId, medication });
  if (!rescueCase) {
    return Response.json(
      { error: "Patient or medication was not found." },
      { status: 404 },
    );
  }

  return Response.json(rescueCase);
}
