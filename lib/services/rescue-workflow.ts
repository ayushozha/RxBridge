import { createRescueCase, getRescueCase, saveRescueCase, withTimeline } from "@/lib/case-store";
import { getPatient } from "@/lib/patient-data";
import type { RescueCase } from "@/lib/rescue-types";
import { checkOriginalStock, confirmFill } from "@/lib/services/pharmacy";
import { checkShortage } from "@/lib/services/shortage";
import { findSubstitutionCandidates } from "@/lib/services/substitution";
import { screenCandidates } from "@/lib/services/safety";

export interface StartRescueInput {
  patientId: string;
  medication: string;
}

export async function startRescueWorkflow(
  input: StartRescueInput,
): Promise<RescueCase | null> {
  const patient = getPatient(input.patientId);
  if (!patient) return null;

  const medication = patient.medications.find(
    (m) =>
      m.name.toLowerCase() === input.medication.toLowerCase() ||
      m.ingredient.toLowerCase() === input.medication.toLowerCase(),
  );
  if (!medication) return null;

  let rescueCase = await createRescueCase({
    patientId: patient.id,
    prescription: {
      medication: medication.name,
      ingredient: medication.ingredient,
      strength: medication.dose,
    },
  });

  rescueCase = withTimeline(
    rescueCase,
    "checking_shortage",
    "Checking shortage status.",
  );
  rescueCase = {
    ...rescueCase,
    shortage: await checkShortage(rescueCase.prescription),
  };

  rescueCase = withTimeline(
    rescueCase,
    "checking_original_stock",
    "Checking stock for the original prescription.",
  );
  rescueCase = {
    ...rescueCase,
    pharmacyQuotes: checkOriginalStock(rescueCase.prescription),
  };

  rescueCase = withTimeline(
    rescueCase,
    "original_unavailable",
    "The original prescription is unavailable at the checked pharmacies.",
  );

  rescueCase = withTimeline(
    rescueCase,
    "finding_substitutes",
    "Finding candidate alternatives for prescriber review.",
  );
  const rawCandidates = findSubstitutionCandidates(rescueCase.prescription);
  const safeCandidates = screenCandidates(
    patient,
    rescueCase.prescription,
    rawCandidates,
  );

  if (safeCandidates.length === 0) {
    rescueCase = {
      ...rescueCase,
      substitutionCandidates: [],
    };
    rescueCase = withTimeline(
      rescueCase,
      "failed_no_safe_option",
      "No candidate passed the synthetic safety screen.",
    );
    return await saveRescueCase(rescueCase);
  }

  rescueCase = {
    ...rescueCase,
    substitutionCandidates: safeCandidates,
    selectedCandidateId: safeCandidates[0].id,
  };
  rescueCase = withTimeline(
    rescueCase,
    "awaiting_prescriber_authorization",
    `${safeCandidates[0].medication} is ready for prescriber authorization as a candidate alternative.`,
  );

  return await saveRescueCase(rescueCase);
}

export async function authorizeCandidate(
  caseId: string,
  candidateId: string,
): Promise<RescueCase | null> {
  const rescueCase = await getRescueCase(caseId);
  if (!rescueCase) return null;

  const candidate = rescueCase.substitutionCandidates.find(
    (item) => item.id === candidateId,
  );
  if (!candidate) return null;

  const updated = withTimeline(
    {
      ...rescueCase,
      selectedCandidateId: candidateId,
      authorization: {
        prescriberName: "Dr. Elena Morris",
        approved: true,
        approvedAt: new Date().toISOString(),
        note: "Synthetic demo authorization. Patient-specific decisions require a licensed prescriber.",
      },
    },
    "prescriber_approved",
    `${candidate.medication} was authorized by the prescriber.`,
  );

  return await saveRescueCase(updated);
}

export async function confirmPharmacyFill(
  caseId: string,
): Promise<RescueCase | null> {
  const rescueCase = await getRescueCase(caseId);
  if (!rescueCase?.authorization?.approved || !rescueCase.selectedCandidateId) {
    return null;
  }

  const candidate = rescueCase.substitutionCandidates.find(
    (item) => item.id === rescueCase.selectedCandidateId,
  );
  if (!candidate) return null;

  let updated = withTimeline(
    rescueCase,
    "confirming_pharmacy_stock",
    "Confirming pharmacy stock for the authorized alternative.",
  );
  const fillConfirmation = confirmFill(candidate);
  updated = {
    ...updated,
    fillConfirmation,
  };

  updated = withTimeline(
    updated,
    fillConfirmation.confirmed ? "alternative_reserved" : "failed_no_safe_option",
    fillConfirmation.confirmed
      ? `${fillConfirmation.pharmacyName} confirmed stock for ${candidate.medication}.`
      : "No pharmacy could confirm stock for the authorized alternative.",
  );

  if (fillConfirmation.confirmed) {
    updated = withTimeline(
      updated,
      "patient_notified",
      "Patient rescue packet is ready.",
    );
  }

  return await saveRescueCase(updated);
}
