import type { RescueCase, RescueStatus, RescueTimelineItem } from "@/lib/rescue-types";

const globalCaseStore = globalThis as typeof globalThis & {
  __rxbridgeCases?: Map<string, RescueCase>;
};

const cases = globalCaseStore.__rxbridgeCases ?? new Map<string, RescueCase>();
globalCaseStore.__rxbridgeCases = cases;

export interface CreateCaseInput {
  patientId: string;
  prescription: RescueCase["prescription"];
  now?: Date;
}

export function createRescueCase(input: CreateCaseInput): RescueCase {
  const now = input.now ?? new Date();
  const id = `case-${input.patientId}-${slug(input.prescription.ingredient)}-${now.getTime().toString(36)}`;
  const rescueCase: RescueCase = {
    id,
    patientId: input.patientId,
    prescription: input.prescription,
    shortage: null,
    pharmacyQuotes: [],
    substitutionCandidates: [],
    status: "case_created",
    timeline: [
      timelineItem(
        "case_created",
        `Case created for ${input.prescription.medication}.`,
        now,
      ),
    ],
  };
  cases.set(id, rescueCase);
  return rescueCase;
}

export function getRescueCase(caseId: string): RescueCase | undefined {
  return cases.get(caseId);
}

export function saveRescueCase(rescueCase: RescueCase): RescueCase {
  cases.set(rescueCase.id, rescueCase);
  return rescueCase;
}

export function updateRescueCase(
  caseId: string,
  updater: (rescueCase: RescueCase) => RescueCase,
): RescueCase | undefined {
  const current = getRescueCase(caseId);
  if (!current) return undefined;
  return saveRescueCase(updater(current));
}

export function withTimeline(
  rescueCase: RescueCase,
  status: RescueStatus,
  message: string,
  now = new Date(),
): RescueCase {
  return {
    ...rescueCase,
    status,
    timeline: [...rescueCase.timeline, timelineItem(status, message, now)],
  };
}

export function resetCaseStore() {
  cases.clear();
}

function timelineItem(
  status: RescueStatus,
  message: string,
  at: Date,
): RescueTimelineItem {
  return { at: at.toISOString(), status, message };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
