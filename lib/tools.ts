/**
 * Tool contract (WORKPLAN section 4b).
 *
 * The assistant produces artifacts by calling these tools. The text route and
 * the voice session expose the same list. Each tool name maps to a
 * deterministic handler that Agent B implements; the route wraps the handler's
 * JSON result into an Artifact for the renderer.
 *
 * Shapes here follow the OpenAI tool / function-calling format so the chat
 * route can pass `OPENAI_TOOLS` straight to the API.
 */

import type { ArtifactType } from "@/lib/artifacts";

export type ToolName =
  | "get_medications"
  | "get_med_trend"
  | "get_health_overview"
  | "start_rescue"
  | "get_rescue_case"
  | "authorize_candidate"
  | "start_negotiation"
  | "confirm_pharmacy_fill"
  | "get_rescue_packet";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  /** Which artifact type the result renders as, or null for text only. */
  artifact: ArtifactType | null;
  parameters: Record<string, unknown>;
}

const STRING = { type: "string" } as const;

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_medications",
    description:
      "List the patient's current medications with refill timing and urgency. Use when the patient asks about their medications, refills, or what they take.",
    artifact: "medication_list",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { patientId: STRING },
      required: ["patientId"],
    },
  },
  {
    name: "get_med_trend",
    description:
      "Return a time series for one lab, vital, or medication supply so it can be charted, for example a1c, blood_pressure_systolic, days_supply, or a per medication days on hand series like days_supply_semaglutide. Use when the patient asks how a single number has changed over time, or when they worry that a shortage, outbreak, war, or other crisis could threaten the supply of a specific medication and want to see how many days they have left.",
    artifact: "chart",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { patientId: STRING, metric: STRING },
      required: ["patientId", "metric"],
    },
  },
  {
    name: "get_health_overview",
    description:
      "Return one multi line chart of the patient's recent key health data so a single visual answers requests like pull up my health data, show my health data from yesterday, or how am I doing. It charts the recent daily days of medication on hand for the patient's critical medications. Use it when the patient asks to see their health data or recent numbers without naming one specific metric.",
    artifact: "chart",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { patientId: STRING },
      required: ["patientId"],
    },
  },
  {
    name: "start_rescue",
    description:
      "Start a prescription rescue case for a medication the patient cannot fill. Returns the live rescue tracker.",
    artifact: "rescue_tracker",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { patientId: STRING, medication: STRING },
      required: ["patientId", "medication"],
    },
  },
  {
    name: "get_rescue_case",
    description:
      "Return the current rescue case state for the tracker artifact. Use to show progress or answer what the workflow is waiting for.",
    artifact: "rescue_tracker",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { caseId: STRING },
      required: ["caseId"],
    },
  },
  {
    name: "authorize_candidate",
    description:
      "Simulate prescriber authorization of a candidate alternative. Only after this is the option no longer a candidate.",
    artifact: "rescue_tracker",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { caseId: STRING, candidateId: STRING },
      required: ["caseId", "candidateId"],
    },
  },
  {
    name: "start_negotiation",
    description:
      "Place a live voice call to the pharmacy to negotiate the price and reserve the authorized alternative. Renders a two voice call (the RxBridge agent and the pharmacy) with a live price ledger. Use after a candidate is authorized, or when the patient asks to call the pharmacy or arrange pickup.",
    artifact: "negotiation_call",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { caseId: STRING },
      required: ["caseId"],
    },
  },
  {
    name: "confirm_pharmacy_fill",
    description:
      "Simulate pharmacy confirmation that the authorized alternative can be filled.",
    artifact: "rescue_tracker",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { caseId: STRING },
      required: ["caseId"],
    },
  },
  {
    name: "get_rescue_packet",
    description:
      "Return the final patient rescue packet once the workflow is complete.",
    artifact: "rescue_packet",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { caseId: STRING },
      required: ["caseId"],
    },
  },
];

/** OpenAI Chat Completions tool array, ready to pass to the API. */
export const OPENAI_TOOLS = TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

/** OpenAI Realtime session tool array. The realtime API uses a flat shape
 * (name, description, parameters at the top level of each function tool). */
export const REALTIME_TOOLS = TOOL_DEFINITIONS.map((t) => ({
  type: "function" as const,
  name: t.name,
  description: t.description,
  parameters: t.parameters,
}));

const BY_NAME: Record<ToolName, ToolDefinition> = TOOL_DEFINITIONS.reduce(
  (acc, t) => {
    acc[t.name] = t;
    return acc;
  },
  {} as Record<ToolName, ToolDefinition>,
);

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return BY_NAME[name as ToolName];
}
