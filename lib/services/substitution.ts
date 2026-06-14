import type { RescueCase, SubstitutionCandidate } from "@/lib/rescue-types";

const CANDIDATES: Record<string, SubstitutionCandidate[]> = {
  "amphetamine mixed salts": [
    {
      id: "amp-salts-er-15",
      medication: "Amphetamine salts ER",
      ingredient: "amphetamine mixed salts",
      strength: "15 mg extended-release capsule",
      form: "extended-release capsule",
      rationale:
        "Same active ingredient and release form with a different strength that a prescriber can review.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
    {
      id: "amp-salts-er-25",
      medication: "Amphetamine salts ER",
      ingredient: "amphetamine mixed salts",
      strength: "25 mg extended-release capsule",
      form: "extended-release capsule",
      rationale:
        "Same active ingredient and release form. Strength differs and requires prescriber authorization.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ],
  semaglutide: [
    {
      id: "semaglutide-1mg",
      medication: "Semaglutide injection",
      ingredient: "semaglutide",
      strength: "1 mg weekly pen",
      form: "injection",
      rationale:
        "Same active ingredient with a different weekly pen strength for prescriber review.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ],
  levothyroxine: [
    {
      id: "levothyroxine-88mcg",
      medication: "Levothyroxine",
      ingredient: "levothyroxine",
      strength: "88 mcg tablet",
      form: "tablet",
      rationale:
        "Same active ingredient with a nearby tablet strength. Thyroid labs and clinician guidance are required.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ],
  epinephrine: [
    {
      id: "epinephrine-generic-auto-injector",
      medication: "Generic epinephrine auto-injector",
      ingredient: "epinephrine",
      strength: "0.3 mg auto-injector",
      form: "auto-injector",
      rationale:
        "Same emergency medication in an equivalent auto-injector format for prescriber or pharmacist review.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ],
  losartan: [
    {
      id: "losartan-25mg",
      medication: "Losartan",
      ingredient: "losartan",
      strength: "25 mg tablet",
      form: "tablet",
      rationale:
        "Same active ingredient with a different tablet strength that requires prescriber direction.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ],
};

export function findSubstitutionCandidates(
  prescription: RescueCase["prescription"],
): SubstitutionCandidate[] {
  const key = prescription.ingredient.toLowerCase();
  const candidates = CANDIDATES[key];
  if (candidates) return cloneCandidates(candidates);

  return [
    {
      id: `${key.replace(/[^a-z0-9]+/g, "-") || "med"}-same-ingredient`,
      medication: `${prescription.ingredient} alternative`,
      ingredient: prescription.ingredient,
      strength: "pharmacist-confirmed available strength",
      form: inferForm(prescription.medication),
      rationale:
        "Same ingredient candidate generated for the synthetic demo. A prescriber must approve any switch.",
      requiresPrescriberApproval: true,
      safetyFlags: [],
    },
  ];
}

function cloneCandidates(candidates: SubstitutionCandidate[]): SubstitutionCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    safetyFlags: [...candidate.safetyFlags],
  }));
}

function inferForm(medication: string): string {
  const lower = medication.toLowerCase();
  if (lower.includes("inhaler")) return "inhaler";
  if (lower.includes("injector")) return "auto-injector";
  if (lower.includes("injection") || lower.includes("ozempic")) return "injection";
  if (lower.includes("capsule") || lower.includes("xr")) return "extended-release capsule";
  return "tablet";
}
