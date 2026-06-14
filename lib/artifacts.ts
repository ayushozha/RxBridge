/**
 * Artifact contract (WORKPLAN section 4a).
 *
 * An artifact is structured data attached to an assistant turn. The renderer
 * (components/artifacts/ArtifactRenderer.tsx) switches on `type` and draws the
 * matching interactive component inline in the chat or voice thread.
 *
 * The model never invents this data. It calls a tool, the route runs a
 * deterministic handler, and the result is wrapped as one of these artifacts.
 */

import type { RefillUrgency } from "@/lib/patient-data";
import type {
  RescueStatus,
  SubstitutionCandidate,
  RescuePacket,
} from "@/lib/rescue-types";

export type ArtifactType =
  | "chart"
  | "medication_list"
  | "rescue_tracker"
  | "substitution_compare"
  | "rescue_packet"
  | "action_buttons"
  | "negotiation_call";

export interface BaseArtifact {
  id: string;
  type: ArtifactType;
  title?: string;
}

/** Generic chart artifact, rendered with Recharts. */
export interface ChartArtifact extends BaseArtifact {
  type: "chart";
  chartKind: "line" | "bar" | "area";
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Array<{ key: string; label: string; color?: string; unit?: string }>;
  referenceLines?: Array<{
    axis: "x" | "y";
    value: number | string;
    label?: string;
  }>;
}

/** Medication shape shown in the list artifact. Structurally matches the
 * MedicationRefillView returned by /api/health-alerts. */
export interface MedicationView {
  name: string;
  ingredient: string;
  dose: string;
  treats: string;
  refillDate: string;
  daysSupplyRemaining: number;
  daysUntilRefill: number;
  urgency: RefillUrgency;
  refillAdvice: string;
}

export interface MedicationListArtifact extends BaseArtifact {
  type: "medication_list";
  medications: MedicationView[];
}

export interface RescueTrackerStep {
  key: string;
  label: string;
  state: "done" | "active" | "pending" | "failed";
}

export interface RescueTrackerArtifact extends BaseArtifact {
  type: "rescue_tracker";
  caseId: string;
  status: RescueStatus;
  steps: RescueTrackerStep[];
}

export interface SubstitutionCompareArtifact extends BaseArtifact {
  type: "substitution_compare";
  original: SubstitutionCandidate;
  candidates: SubstitutionCandidate[];
}

export interface RescuePacketArtifact extends BaseArtifact {
  type: "rescue_packet";
  packet: RescuePacket;
}

export type RescueAction = "start_rescue" | "authorize" | "confirm_fill";

export interface ActionButtonsArtifact extends BaseArtifact {
  type: "action_buttons";
  caseId: string;
  actions: Array<{ label: string; action: RescueAction; candidateId?: string }>;
}

/** One spoken turn in the provider negotiation call. */
export interface NegotiationTurn {
  /** Who is speaking. agent is RxBridge (OpenAI voice), pharmacy is Grok voice. */
  speaker: "agent" | "pharmacy";
  /** The provider/voice label shown on screen, for example "GPT Realtime 2". */
  voiceLabel: string;
  text: string;
  /** A price mentioned in this turn, if any, in USD. */
  price?: number;
  /** Base64 data URI of the spoken audio, or null to use browser speech. */
  audio?: string | null;
}

export interface NegotiationCallArtifact extends BaseArtifact {
  type: "negotiation_call";
  caseId: string;
  medication: string;
  pharmacyName: string;
  turns: NegotiationTurn[];
  /** The price both sides agreed on, in USD. */
  agreedPrice: number;
  outcome: "reserved" | "no_deal";
}

export type Artifact =
  | ChartArtifact
  | MedicationListArtifact
  | RescueTrackerArtifact
  | SubstitutionCompareArtifact
  | RescuePacketArtifact
  | ActionButtonsArtifact
  | NegotiationCallArtifact;
