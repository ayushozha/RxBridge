"use client";

import type { SubstitutionCompareArtifact } from "@/lib/artifacts";
import type { SubstitutionCandidate } from "@/lib/rescue-types";

function Row({
  c,
  highlight,
}: {
  c: SubstitutionCandidate;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        highlight
          ? "border-brand-400 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <p className="font-medium">
        {c.medication} {c.strength}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {c.form}. {c.rationale}
      </p>
      {c.safetyFlags.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-300">
          {c.safetyFlags.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Candidate alternative, prescriber approval required
      </p>
    </div>
  );
}

/** Side by side of the original prescription and candidate alternatives. */
export default function SubstitutionCompareView({
  artifact,
}: {
  artifact: SubstitutionCompareArtifact;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Original
        </p>
        <Row c={artifact.original} />
      </div>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Candidate alternatives
        </p>
        <div className="space-y-2">
          {artifact.candidates.map((c) => (
            <Row key={c.id} c={c} highlight />
          ))}
        </div>
      </div>
    </div>
  );
}
