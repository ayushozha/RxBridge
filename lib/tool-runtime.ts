/**
 * Tool runtime: the bridge between the model's tool calls and Agent B's
 * deterministic handlers.
 *
 * The chat route (and later the voice session) calls runTool(name, args). This
 * module looks up Agent B's handler, runs it, and wraps the structured result
 * into an Artifact for the renderer plus a short text summary the model can use.
 *
 * CONTRACT FOR AGENT B:
 *   Create `lib/services/tool-handlers.ts` exporting:
 *     export const toolHandlers: Record<ToolName, (args) => Promise<ToolHandlerResult>>
 *   where ToolHandlerResult is:
 *     { data: unknown; summary: string }
 *   and `data` matches the artifact payload for that tool:
 *     get_medications        -> { medications: MedicationView[] }
 *     get_med_trend          -> MedTrend
 *     start_rescue           -> { case: RescueCase }
 *     get_rescue_case        -> { case: RescueCase }
 *     authorize_candidate    -> { case: RescueCase }
 *     confirm_pharmacy_fill  -> { case: RescueCase }
 *     get_rescue_packet      -> { packet: RescuePacket }
 *
 * Until that file exists, runTool returns a graceful "not wired yet" summary so
 * the chat keeps working end to end.
 */

import { getToolDefinition, type ToolName } from "@/lib/tools";
import type { Artifact, MedicationView } from "@/lib/artifacts";
import type { MedTrend, RescueCase, RescuePacket } from "@/lib/rescue-types";
import type { HealthOverview } from "@/lib/trends";
import { caseToTracker } from "@/lib/rescue-view";

export interface ToolHandlerResult {
  data: unknown;
  summary: string;
}

export interface RunToolResult {
  /** Short text the model can fold into its reply. */
  summary: string;
  /** The artifact to render inline, or null if none. */
  artifact: Artifact | null;
}

type HandlerMap = Partial<
  Record<ToolName, (args: Record<string, unknown>) => Promise<ToolHandlerResult>>
>;

let cachedHandlers: HandlerMap | null = null;
let triedLoad = false;

async function loadHandlers(): Promise<HandlerMap> {
  if (triedLoad) return cachedHandlers ?? {};
  triedLoad = true;
  try {
    // Agent B provides this module. Dynamic import so a missing file does not
    // break the build or the route.
    const mod = (await import("@/lib/services/tool-handlers")) as {
      toolHandlers?: HandlerMap;
    };
    cachedHandlers = mod.toolHandlers ?? {};
  } catch {
    cachedHandlers = {};
  }
  return cachedHandlers;
}

let artifactSeq = 0;
function artifactId(prefix: string): string {
  artifactSeq += 1;
  return `${prefix}-${artifactSeq}`;
}

/** Turn a handler's structured data into the matching Artifact. */
function toArtifact(name: ToolName, data: unknown): Artifact | null {
  const def = getToolDefinition(name);
  if (!def || !def.artifact || data == null || typeof data !== "object") {
    return null;
  }
  const d = data as Record<string, unknown>;

  switch (def.artifact) {
    case "medication_list":
      return {
        id: artifactId("meds"),
        type: "medication_list",
        title: "Your medications",
        medications: (d.medications as MedicationView[]) ?? [],
      };
    case "chart": {
      // Multi series overview payload: { label, unit, points, series }. The
      // presence of a series array distinguishes it from a single series
      // MedTrend, so get_med_trend keeps working unchanged below.
      if (Array.isArray(d.series)) {
        const overview = data as HealthOverview;
        if (!overview.points || overview.points.length === 0) return null;
        return {
          id: artifactId("chart"),
          type: "chart",
          title: overview.label,
          chartKind: "line",
          data: overview.points,
          xKey: "date",
          series: overview.series.map((s) => ({
            key: s.key,
            label: s.label,
            unit: s.unit,
          })),
        };
      }
      const trend = data as MedTrend;
      if (!trend.points) return null;
      return {
        id: artifactId("chart"),
        type: "chart",
        title: trend.label,
        chartKind: "line",
        data: trend.points.map((p) => ({ date: p.date, value: p.value })),
        xKey: "date",
        series: [{ key: "value", label: trend.label, unit: trend.unit }],
        referenceLines:
          trend.target?.max != null
            ? [{ axis: "y", value: trend.target.max, label: trend.target.label }]
            : undefined,
      };
    }
    case "rescue_tracker": {
      const c = d.case as RescueCase | undefined;
      return c ? caseToTracker(c) : null;
    }
    case "rescue_packet": {
      const packet = d.packet as RescuePacket | undefined;
      return packet
        ? { id: artifactId("packet"), type: "rescue_packet", packet }
        : null;
    }
    case "negotiation_call": {
      // The handler already produced the full artifact; pass it through.
      const art = d.artifact as Artifact | undefined;
      return art && art.type === "negotiation_call"
        ? { ...art, id: artifactId("nego") }
        : null;
    }
    default:
      return null;
  }
}

export async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<RunToolResult> {
  const def = getToolDefinition(name);
  if (!def) {
    return { summary: `Unknown tool ${name}.`, artifact: null };
  }

  const handlers = await loadHandlers();
  const handler = handlers[def.name];
  if (!handler) {
    return {
      summary: `The ${def.name} capability is not connected yet, so I cannot show that data.`,
      artifact: null,
    };
  }

  try {
    const result = await handler(args);
    return {
      summary: result.summary,
      artifact: toArtifact(def.name, result.data),
    };
  } catch (err) {
    console.error(`Tool ${def.name} failed:`, err);
    return {
      summary: `I could not complete ${def.name} just now.`,
      artifact: null,
    };
  }
}
