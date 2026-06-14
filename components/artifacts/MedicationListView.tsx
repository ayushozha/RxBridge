"use client";

import type { MedicationListArtifact } from "@/lib/artifacts";

const URGENCY_STYLE = {
  overdue: "bg-red-500 text-white",
  soon: "bg-amber-400 text-amber-950",
  ok: "bg-emerald-500 text-white",
} as const;

const URGENCY_LABEL = {
  overdue: "Refill now",
  soon: "Refill soon",
  ok: "On track",
} as const;

/** A compact, scannable medication list rendered inline in the thread. */
export default function MedicationListView({
  artifact,
}: {
  artifact: MedicationListArtifact;
}) {
  return (
    <ul className="space-y-2">
      {artifact.medications.map((m) => (
        <li
          key={m.name}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
        >
          <div className="min-w-0">
            <p className="font-medium">{m.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For {m.treats}. Refill due {m.refillDate}. {m.daysSupplyRemaining}{" "}
              days on hand.
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {m.refillAdvice}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_STYLE[m.urgency]}`}
          >
            {URGENCY_LABEL[m.urgency]}
          </span>
        </li>
      ))}
    </ul>
  );
}
