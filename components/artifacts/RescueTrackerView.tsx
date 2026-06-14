"use client";

import type { RescueTrackerArtifact } from "@/lib/artifacts";

const STATE_ICON = {
  done: "✅",
  active: "⏳",
  pending: "○",
  failed: "❌",
} as const;

const STATE_TEXT = {
  done: "text-emerald-700 dark:text-emerald-300",
  active: "text-brand-600 dark:text-brand-100 font-medium",
  pending: "text-slate-400",
  failed: "text-red-600 dark:text-red-300",
} as const;

/** Live rescue workflow tracker, the spec's right-rail step list, inline. */
export default function RescueTrackerView({
  artifact,
}: {
  artifact: RescueTrackerArtifact;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <ul className="space-y-1.5">
        {artifact.steps.map((step) => (
          <li
            key={step.key}
            className={`flex items-center gap-2 text-sm ${STATE_TEXT[step.state]}`}
          >
            <span aria-hidden className="w-4 text-center">
              {STATE_ICON[step.state]}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
