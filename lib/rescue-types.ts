/**
 * Shared rescue workflow data model (WORKPLAN section 5).
 *
 * These types are the contract between Agent A (interface, renders this data)
 * and Agent B (deterministic services, produces this data). They extend, they
 * do not replace, the patient and medication types in lib/patient-data.ts.
 *
 * Agent A publishes these types so the artifact renderers compile now. Agent B
 * implements the services and tool handlers that fill them in.
 */

export type RescueStatus =
  | "case_created"
  | "checking_shortage"
  | "checking_original_stock"
  | "original_unavailable"
  | "finding_substitutes"
  | "awaiting_prescriber_authorization"
  | "prescriber_approved"
  | "prescriber_rejected"
  | "confirming_pharmacy_stock"
  | "alternative_reserved"
  | "patient_notified"
  | "failed_no_safe_option";

export interface ShortageStatus {
  ingredient: string;
  inShortage: boolean;
  severity: "info" | "watch" | "act_now";
  summary: string;
  source: string;
}

export interface PharmacyStockQuote {
  pharmacyName: string;
  distanceMiles: number;
  medication: string;
  inStock: boolean;
}

export interface SubstitutionCandidate {
  id: string;
  medication: string;
  ingredient: string;
  strength: string;
  form: string;
  rationale: string;
  /** Always true before approval. The model must call it a candidate. */
  requiresPrescriberApproval: true;
  safetyFlags: string[];
}

export interface Authorization {
  prescriberName: string;
  approved: boolean;
  approvedAt?: string;
  note?: string;
}

export interface FillConfirmation {
  pharmacyName: string;
  confirmed: boolean;
  confirmedAt?: string;
}

export interface RescueTimelineItem {
  at: string;
  status: RescueStatus;
  message: string;
}

export interface RescueCase {
  id: string;
  patientId: string;
  prescription: { medication: string; ingredient: string; strength: string };
  shortage: ShortageStatus | null;
  pharmacyQuotes: PharmacyStockQuote[];
  substitutionCandidates: SubstitutionCandidate[];
  selectedCandidateId?: string;
  authorization?: Authorization;
  fillConfirmation?: FillConfirmation;
  status: RescueStatus;
  timeline: RescueTimelineItem[];
}

/** Final patient handoff document produced by packet.ts. */
export interface RescuePacket {
  caseId: string;
  patientName: string;
  originalMedication: string;
  approvedAlternative: string | null;
  prescriberName: string | null;
  pharmacyName: string | null;
  steps: string[];
  patientScript: string;
  generatedAt: string;
}

/** Time series for charting (A1C, blood pressure, days of supply). */
export interface MedTrendPoint {
  date: string;
  value: number;
}

export interface MedTrend {
  metric: string;
  label: string;
  unit: string;
  points: MedTrendPoint[];
  target?: { min?: number; max?: number; label?: string };
}
