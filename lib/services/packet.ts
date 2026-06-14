import type { Patient } from "@/lib/patient-data";
import type { RescueCase, RescuePacket } from "@/lib/rescue-types";

export function buildRescuePacket(
  rescueCase: RescueCase,
  patient: Patient,
): RescuePacket {
  const selected = rescueCase.substitutionCandidates.find(
    (candidate) => candidate.id === rescueCase.selectedCandidateId,
  );

  return {
    caseId: rescueCase.id,
    patientName: patient.displayName,
    originalMedication: rescueCase.prescription.medication,
    approvedAlternative: selected?.medication ?? null,
    prescriberName: rescueCase.authorization?.prescriberName ?? null,
    pharmacyName: rescueCase.fillConfirmation?.pharmacyName ?? null,
    steps: packetSteps(rescueCase, selected?.medication),
    patientScript: patientScript(rescueCase, selected?.medication),
    generatedAt: new Date().toISOString(),
  };
}

function packetSteps(rescueCase: RescueCase, alternative?: string): string[] {
  return [
    `${rescueCase.prescription.medication} was reported unavailable.`,
    rescueCase.shortage?.summary ?? "Shortage status was checked.",
    alternative
      ? `${alternative} was identified as a candidate alternative.`
      : "No safe candidate alternative is ready yet.",
    rescueCase.authorization?.approved
      ? `${rescueCase.authorization.prescriberName} authorized the candidate.`
      : "Prescriber authorization is still required.",
    rescueCase.fillConfirmation?.confirmed
      ? `${rescueCase.fillConfirmation.pharmacyName} confirmed it can be filled.`
      : "Pharmacy fill confirmation is still required.",
  ];
}

function patientScript(rescueCase: RescueCase, alternative?: string): string {
  if (!alternative) {
    return `My prescription for ${rescueCase.prescription.medication} cannot be filled. Can you review the shortage information and advise on a safe next step?`;
  }

  if (!rescueCase.authorization?.approved) {
    return `My prescription for ${rescueCase.prescription.medication} is unavailable. RxBridge found ${alternative} as a candidate alternative. Can you review and decide whether to authorize it?`;
  }

  if (!rescueCase.fillConfirmation?.confirmed) {
    return `My prescriber authorized ${alternative} as the alternative for ${rescueCase.prescription.medication}. Can you confirm whether it is in stock and can be filled?`;
  }

  return `My prescriber authorized ${alternative}, and ${rescueCase.fillConfirmation.pharmacyName} confirmed it can be filled. I am ready to pick up or arrange delivery.`;
}
