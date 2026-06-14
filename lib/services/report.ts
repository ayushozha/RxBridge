/**
 * Builds the post call rescue report from a completed case.
 *
 * Pulls the important facts (patient, medication, prescriber, pharmacy, agreed
 * price), the workflow timeline, and the negotiation transcript with its price
 * movement, into one structured report the UI renders and can export to PDF or
 * email to a clinician or pharmacy. Synthetic demo data only.
 */

import type { RescueReportArtifact, ReportTranscriptLine } from "@/lib/artifacts";
import type { RescueCase } from "@/lib/rescue-types";
import { getRescueCase } from "@/lib/case-store";
import { getPatient } from "@/lib/patient-data";
import { runNegotiation } from "@/lib/services/negotiation";

const STATUS_LABELS: Record<string, string> = {
  case_created: "Rescue case created",
  checking_shortage: "Shortage status checked",
  checking_original_stock: "Pharmacy stock checked",
  original_unavailable: "Original medication unavailable",
  finding_substitutes: "Candidate alternative found",
  awaiting_prescriber_authorization: "Awaiting prescriber authorization",
  prescriber_approved: "Prescriber authorized the alternative",
  confirming_pharmacy_stock: "Confirming pharmacy stock",
  alternative_reserved: "Alternative reserved at pharmacy",
  patient_notified: "Patient rescue packet ready",
  prescriber_rejected: "Prescriber declined the candidate",
  failed_no_safe_option: "No safe option found",
};

export async function buildReport(
  caseId: string,
): Promise<RescueReportArtifact | null> {
  const rescueCase: RescueCase | undefined = await getRescueCase(caseId);
  if (!rescueCase) return null;

  const patient = getPatient(rescueCase.patientId);
  const candidate = rescueCase.substitutionCandidates.find(
    (c) => c.id === rescueCase.selectedCandidateId,
  );

  // Reuse the negotiation to get the transcript and the price movement.
  const nego = await runNegotiation(caseId);
  const transcript: ReportTranscriptLine[] =
    nego?.turns.map((t) => ({
      speaker: t.speaker,
      text: t.text,
      price: t.price,
    })) ?? [];

  const pricePoints = transcript
    .filter((t) => typeof t.price === "number")
    .map((t) => t.price as number);
  const startingPrice = pricePoints.length ? Math.max(...pricePoints) : null;
  const agreedPrice = nego?.agreedPrice ?? (pricePoints.length ? Math.min(...pricePoints) : null);
  const savings =
    startingPrice != null && agreedPrice != null
      ? Math.max(0, startingPrice - agreedPrice)
      : null;

  // A compact price trail for the mini chart, deduped by value in order.
  const priceTrail: Array<{ step: string; price: number }> = [];
  transcript.forEach((t) => {
    if (typeof t.price === "number") {
      priceTrail.push({
        step: t.speaker === "agent" ? "Agent" : "Pharmacy",
        price: t.price,
      });
    }
  });

  const timeline = rescueCase.timeline.map((item) => ({
    at: item.at,
    label: STATUS_LABELS[item.status] ?? item.status,
  }));

  return {
    id: `report-${rescueCase.id}`,
    type: "rescue_report",
    title: "Rescue report",
    caseId: rescueCase.id,
    generatedAt: new Date().toISOString(),
    patientName: patient?.displayName ?? "Patient",
    region: patient?.region ?? "United States",
    originalMedication: rescueCase.prescription.medication,
    approvedAlternative: candidate?.medication ?? nego?.medication ?? null,
    prescriberName: rescueCase.authorization?.prescriberName ?? null,
    pharmacyName:
      rescueCase.fillConfirmation?.pharmacyName ?? nego?.pharmacyName ?? null,
    agreedPrice,
    startingPrice,
    savings,
    outcome:
      rescueCase.status === "patient_notified"
        ? "Alternative reserved for same day pickup"
        : STATUS_LABELS[rescueCase.status] ?? rescueCase.status,
    timeline,
    transcript,
    priceTrail,
    sources: nego ? [] : [],
  };
}
