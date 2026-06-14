import type { ToolName } from "@/lib/tools";
import type { ToolHandlerResult } from "@/lib/tool-runtime";
import { getRescueCase } from "@/lib/case-store";
import {
  getPatient,
  refillStatus,
  type Patient,
  type RefillUrgency,
} from "@/lib/patient-data";
import { buildRescuePacket } from "@/lib/services/packet";
import {
  authorizeCandidate,
  confirmPharmacyFill,
  startRescueWorkflow,
} from "@/lib/services/rescue-workflow";
import { getHealthOverview, getMedTrend } from "@/lib/trends";
import { runNegotiation } from "@/lib/services/negotiation";
import type { NegotiationCallArtifact } from "@/lib/artifacts";

export type ToolHandlerMap = Partial<
  Record<ToolName, (args: Record<string, unknown>) => Promise<ToolHandlerResult>>
>;

export const toolHandlers: ToolHandlerMap = {
  get_medications: async (args) => {
    const patient = requiredPatient(args.patientId);
    const medications = medicationViews(patient);
    return {
      summary: `Listed ${medications.length} active medications for ${patient.displayName}.`,
      data: { medications },
    };
  },

  get_med_trend: async (args) => {
    const patient = requiredPatient(args.patientId);
    const metric = requiredString(args.metric, "metric");
    const trend = getMedTrend(patient.id, metric);
    if (!trend) throw new Error(`No trend fixture found for ${metric}.`);
    return {
      summary: `${trend.label} trend is ready.`,
      data: trend,
    };
  },

  get_health_overview: async (args) => {
    const patient = requiredPatient(args.patientId);
    const overview = getHealthOverview(patient.id);
    if (!overview) {
      throw new Error(`No health overview data found for ${patient.id}.`);
    }
    return {
      summary: `Recent health data for ${patient.displayName} is ready, ${overview.series.length} medications charted.`,
      data: overview,
    };
  },

  start_rescue: async (args) => {
    const patientId = requiredString(args.patientId, "patientId");
    const medication = requiredString(args.medication, "medication");
    const rescueCase = await startRescueWorkflow({ patientId, medication });
    if (!rescueCase) {
      throw new Error("Could not start rescue case for that patient and medication.");
    }
    return {
      summary: latestSummary(rescueCase.timeline),
      data: { case: rescueCase },
    };
  },

  get_rescue_case: async (args) => {
    const caseId = requiredString(args.caseId, "caseId");
    const rescueCase = getRescueCase(caseId);
    if (!rescueCase) throw new Error(`Case ${caseId} was not found.`);
    return {
      summary: latestSummary(rescueCase.timeline),
      data: { case: rescueCase },
    };
  },

  authorize_candidate: async (args) => {
    const caseId = requiredString(args.caseId, "caseId");
    const candidateId = requiredString(args.candidateId, "candidateId");
    const rescueCase = authorizeCandidate(caseId, candidateId);
    if (!rescueCase) throw new Error("Could not authorize that candidate.");
    return {
      summary: latestSummary(rescueCase.timeline),
      data: { case: rescueCase },
    };
  },

  start_negotiation: async (args) => {
    const caseId = requiredString(args.caseId, "caseId");
    const result = await runNegotiation(caseId);
    if (!result) throw new Error("Could not start the pharmacy negotiation.");
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
    return {
      summary: `Calling ${result.pharmacyName} to negotiate ${result.medication}. Agreed at ${result.agreedPrice} dollars and reserved for same day pickup.`,
      data: { artifact },
    };
  },

  confirm_pharmacy_fill: async (args) => {
    const caseId = requiredString(args.caseId, "caseId");
    const rescueCase = confirmPharmacyFill(caseId);
    if (!rescueCase) {
      throw new Error("Could not confirm pharmacy fill for that case.");
    }
    return {
      summary: latestSummary(rescueCase.timeline),
      data: { case: rescueCase },
    };
  },

  get_rescue_packet: async (args) => {
    const caseId = requiredString(args.caseId, "caseId");
    const rescueCase = getRescueCase(caseId);
    if (!rescueCase) throw new Error(`Case ${caseId} was not found.`);
    const patient = requiredPatient(rescueCase.patientId);
    const packet = buildRescuePacket(rescueCase, patient);
    return {
      summary: "The patient rescue packet is ready.",
      data: { packet },
    };
  },
};

function medicationViews(patient: Patient) {
  const todayIso = new Date().toISOString().slice(0, 10);
  return patient.medications.map((medication) => {
    const status = refillStatus(medication, todayIso);
    return {
      name: medication.name,
      ingredient: medication.ingredient,
      dose: medication.dose,
      treats: medication.treats,
      refillDate: medication.refillDate,
      daysSupplyRemaining: medication.daysSupplyRemaining,
      daysUntilRefill: status.daysUntilRefill,
      urgency: status.urgency,
      refillAdvice: refillAdvice(status.urgency),
    };
  });
}

function refillAdvice(urgency: RefillUrgency): string {
  switch (urgency) {
    case "overdue":
      return "Refill today and ask the pharmacy about pickup, delivery, or transfer options.";
    case "soon":
      return "Refill in the next few days so supply does not run low.";
    default:
      return "No action needed yet. Continue the normal refill schedule.";
  }
}

function latestSummary(
  timeline: Array<{ message: string }> | undefined,
): string {
  return timeline?.[timeline.length - 1]?.message ?? "Rescue case updated.";
}

function requiredPatient(patientId: unknown): Patient {
  const id = requiredString(patientId, "patientId");
  const patient = getPatient(id);
  if (!patient) throw new Error(`Patient ${id} was not found.`);
  return patient;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}
