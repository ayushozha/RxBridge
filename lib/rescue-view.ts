/**
 * Pure mappers from rescue domain state to renderable artifacts.
 *
 * Shared by the server routes (which build artifacts from tool results) and the
 * client (which refreshes the tracker after an action button runs). No React,
 * no IO, so it is safe to import anywhere.
 */

import type { RescueCase, RescueStatus } from "@/lib/rescue-types";
import type { RescueTrackerArtifact, RescueTrackerStep } from "@/lib/artifacts";

/** Ordered workflow steps and the status at which each becomes done. */
const STEP_ORDER: Array<{ key: string; label: string; reachedAt: RescueStatus[] }> = [
  { key: "case", label: "Case created", reachedAt: ["case_created"] },
  {
    key: "shortage",
    label: "Shortage status checked",
    reachedAt: ["checking_shortage", "original_unavailable", "finding_substitutes"],
  },
  {
    key: "stock",
    label: "Nearby pharmacy stock checked",
    reachedAt: ["checking_original_stock", "original_unavailable", "finding_substitutes"],
  },
  {
    key: "unavailable",
    label: "Original medication unavailable",
    reachedAt: ["original_unavailable", "finding_substitutes"],
  },
  {
    key: "candidate",
    label: "Candidate alternative found",
    reachedAt: ["finding_substitutes", "awaiting_prescriber_authorization"],
  },
  {
    key: "authorize",
    label: "Prescriber authorization",
    reachedAt: ["prescriber_approved", "confirming_pharmacy_stock", "alternative_reserved", "patient_notified"],
  },
  {
    key: "confirm",
    label: "Pharmacy confirmed fill",
    reachedAt: ["alternative_reserved", "patient_notified"],
  },
  {
    key: "packet",
    label: "Patient rescue packet ready",
    reachedAt: ["patient_notified"],
  },
];

// Rank statuses so we can tell which step is currently active.
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

export function caseToTracker(c: RescueCase): RescueTrackerArtifact {
  const failed = c.status === "failed_no_safe_option" || c.status === "prescriber_rejected";
  const currentRank = STATUS_RANK.indexOf(c.status);

  const steps: RescueTrackerStep[] = STEP_ORDER.map((step) => {
    const done = step.reachedAt.includes(c.status);
    if (done) return { key: step.key, label: step.label, state: "done" };

    // The active step is the first not-done step whose earliest status is next.
    const earliest = step.reachedAt
      .map((s) => STATUS_RANK.indexOf(s))
      .filter((r) => r >= 0)
      .sort((a, b) => a - b)[0];
    if (failed && earliest > currentRank)
      return { key: step.key, label: step.label, state: "failed" };
    if (earliest === currentRank + 1)
      return { key: step.key, label: step.label, state: "active" };
    return { key: step.key, label: step.label, state: "pending" };
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
