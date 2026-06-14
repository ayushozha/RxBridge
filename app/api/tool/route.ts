import { guardRequest } from "@/lib/request-guard";
import { runTool } from "@/lib/tool-runtime";

/**
 * Runs a single tool by name and returns its summary plus any artifact.
 *
 * The voice client uses this: when the Realtime model calls a function, the
 * browser cannot run the server only handler, so it posts the call here, gets
 * back the artifact to render and the summary to send to the model as the
 * function output. The text chat route runs tools in process and does not need
 * this endpoint.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = guardRequest(req, Date.now(), { limit: 40, windowMs: 60_000 });
  if (blocked) return blocked;

  let name: string;
  let args: Record<string, unknown>;
  try {
    const body = await req.json();
    name = String(body.name ?? "");
    args = body.args && typeof body.args === "object" ? body.args : {};
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: "Missing tool name." }, { status: 400 });
  }

  const result = await runTool(name, args);
  return Response.json(result);
}
