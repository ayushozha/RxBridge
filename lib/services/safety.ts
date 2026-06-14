import type { Patient } from "@/lib/patient-data";
import type { RescueCase, SubstitutionCandidate } from "@/lib/rescue-types";

export function screenCandidates(
  patient: Patient,
  prescription: RescueCase["prescription"],
  candidates: SubstitutionCandidate[],
): SubstitutionCandidate[] {
  const allergyText = patient.medicalHistory
    .filter((item) => item.category === "allergy")
    .map((item) => `${item.title} ${item.details}`.toLowerCase())
    .join(" ");

  return candidates
    .filter((candidate) => !allergyText.includes(candidate.ingredient.toLowerCase()))
    .filter((candidate) => isSafeRouteMatch(prescription.medication, candidate.form))
    .map((candidate) => ({
      ...candidate,
      safetyFlags: uniqueFlags([
        ...candidate.safetyFlags,
        "Prescriber authorization required before use.",
        "Clinician review required for strength, timing, and patient-specific safety.",
      ]),
    }));
}

function isSafeRouteMatch(originalMedication: string, candidateForm: string): boolean {
  const originalForm = inferForm(originalMedication);
  if (originalForm === "unknown") return true;
  if (originalForm === candidateForm) return true;
  if (originalForm === "auto-injector" || candidateForm === "auto-injector") return false;
  if (originalForm === "inhaler" || candidateForm === "inhaler") return false;
  if (originalForm === "injection" || candidateForm === "injection") return false;
  return originalForm === "tablet" && candidateForm === "tablet";
}

function inferForm(medication: string): string {
  const lower = medication.toLowerCase();
  if (lower.includes("inhaler")) return "inhaler";
  if (lower.includes("auto-injector") || lower.includes("epinephrine")) {
    return "auto-injector";
  }
  if (lower.includes("injection") || lower.includes("ozempic")) return "injection";
  if (lower.includes("capsule") || lower.includes("xr")) {
    return "extended-release capsule";
  }
  if (lower.includes("tablet") || lower.includes("levothyroxine") || lower.includes("losartan")) {
    return "tablet";
  }
  return "unknown";
}

function uniqueFlags(flags: string[]): string[] {
  return Array.from(new Set(flags));
}
