/**
 * Pure mappers from rescue domain state to renderable artifacts.
 *
 * Shared by the server routes (which build artifacts from tool results) and the
 * client (which refreshes the tracker after an action button runs). No React,
 * no IO, so it is safe to import anywhere.
 */

import type { RescueCase, RescueStatus } from "@/lib/rescue-types";
import type { RescueTrackerArtifact, RescueTrackerStep } from "@/lib/artifacts";

// Linear rank of every workflow status. A higher rank means further along.
const STATUS_RANK: RescueStatus[] = [
  "case_created",
  "checking_shortage",
  "checking_original_stock",
  "original_unavailable",
  "finding_substitutes",
  "awaiting_prescriber_authorization",
  "prescriber_approved",
  "confirming_pharmacy_stock",
  "alternative_reserved",
  "patient_notified",
];

/**
 * Ordered display steps. `completesAt` is the status by which the step is fully
 * done. A step is done once the case has reached that status or any later one,
 * so earlier steps stay checked as the workflow advances.
 */
const STEP_ORDER: Array<{
  key: string;
  label: string;
  completesAt: RescueStatus;
}> = [
  { key: "case", label: "Case created", completesAt: "case_created" },
  { key: "shortage", label: "Shortage status checked", completesAt: "checking_shortage" },
  { key: "stock", label: "Nearby pharmacy stock checked", completesAt: "checking_original_stock" },
  { key: "unavailable", label: "Original medication unavailable", completesAt: "original_unavailable" },
  { key: "candidate", label: "Candidate alternative found", completesAt: "finding_substitutes" },
  { key: "authorize", label: "Prescriber authorization", completesAt: "prescriber_approved" },
  { key: "confirm", label: "Pharmacy confirmed fill", completesAt: "alternative_reserved" },
  { key: "packet", label: "Patient rescue packet ready", completesAt: "patient_notified" },
];

export function caseToTracker(c: RescueCase): RescueTrackerArtifact {
  const failed =
    c.status === "failed_no_safe_option" || c.status === "prescriber_rejected";
  const currentRank = STATUS_RANK.indexOf(c.status);

  // Index of the first step not yet complete, that one is the active step.
  const firstIncomplete = STEP_ORDER.findIndex(
    (step) => STATUS_RANK.indexOf(step.completesAt) > currentRank,
  );

  const steps: RescueTrackerStep[] = STEP_ORDER.map((step, i) => {
    const stepRank = STATUS_RANK.indexOf(step.completesAt);
    let state: RescueTrackerStep["state"];
    if (stepRank <= currentRank) {
      state = "done";
    } else if (failed) {
      state = "failed";
    } else if (i === firstIncomplete) {
      state = "active";
    } else {
      state = "pending";
    }
    return { key: step.key, label: step.label, state };
  });

  return {
    id: `tracker-${c.id}-${c.status}`,
    type: "rescue_tracker",
    title: "Rescue status",
    caseId: c.id,
    status: c.status,
    steps,
  };
}
