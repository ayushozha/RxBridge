"use client";

import type { RescuePacketArtifact } from "@/lib/artifacts";

/** The final patient handoff document, rendered inline as a clean card. */
export default function RescuePacketView({
  artifact,
}: {
  artifact: RescuePacketArtifact;
}) {
  const p = artifact.packet;
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
      <p className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        Rescue packet for {p.patientName}
      </p>
      <dl className="space-y-1 text-slate-700 dark:text-slate-200">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Original</dt>
          <dd className="text-right">{p.originalMedication}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Approved alternative</dt>
          <dd className="text-right">{p.approvedAlternative ?? "Pending"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Prescriber</dt>
          <dd className="text-right">{p.prescriberName ?? "Pending"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Pharmacy</dt>
          <dd className="text-right">{p.pharmacyName ?? "Pending"}</dd>
        </div>
      </dl>

      {p.steps.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700 dark:text-slate-200">
          {p.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      {p.patientScript && (
        <div className="mt-3 rounded-md bg-white/70 p-2 text-xs text-slate-600 dark:bg-black/20 dark:text-slate-300">
          <p className="mb-1 font-semibold">What to say at the pharmacy</p>
          <p>{p.patientScript}</p>
        </div>
      )}
    </div>
  );
}
