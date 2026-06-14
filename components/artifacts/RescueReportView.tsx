"use client";

import { useRef } from "react";
import type { RescueReportArtifact } from "@/lib/artifacts";

/**
 * The post call rescue report. Shows the important facts, the price movement,
 * the negotiation transcript, and the workflow timeline in a clean layout, with
 * Export PDF (browser print of just this report) and Email to doctor or
 * pharmacy (opens the mail client prefilled). Synthetic demo data only.
 */
export default function RescueReportView({
  artifact,
}: {
  artifact: RescueReportArtifact;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const generated = new Date(artifact.generatedAt).toLocaleString();
  const maxPrice = Math.max(1, ...artifact.priceTrail.map((p) => p.price));

  function exportPdf() {
    // Open a clean, standalone print window with just the report markup so the
    // PDF is not cluttered by the app shell.
    const node = ref.current;
    if (!node) {
      window.print();
      return;
    }
    const w = window.open("", "_blank", "width=800,height=1000");
    if (!w) {
      window.print();
      return;
    }
    w.document.write(`<!doctype html><html><head><title>RxBridge Rescue Report</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Arial, sans-serif; color: #0f172a; margin: 40px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin: 22px 0 8px; }
        .sub { color: #64748b; font-size: 12px; margin: 0 0 16px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
        .grid div span { color: #64748b; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
        td { padding: 4px 6px; border-bottom: 1px solid #eef2f7; vertical-align: top; }
        .agent { color: #1565c4; font-weight: 600; }
        .pharm { color: #0f766e; font-weight: 600; }
        .note { font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #eef2f7; padding-top: 10px; }
      </style></head><body>${node.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  function emailReport() {
    const lines = [
      `RxBridge prescription rescue report`,
      ``,
      `Patient: ${artifact.patientName}`,
      `Original medication: ${artifact.originalMedication}`,
      `Approved alternative: ${artifact.approvedAlternative ?? "pending"}`,
      `Prescriber: ${artifact.prescriberName ?? "pending"}`,
      `Pharmacy: ${artifact.pharmacyName ?? "pending"}`,
      artifact.agreedPrice != null ? `Agreed price: $${artifact.agreedPrice}` : ``,
      artifact.savings ? `Saved: $${artifact.savings}` : ``,
      `Outcome: ${artifact.outcome}`,
      ``,
      `Generated ${generated}. Please verify in your system of record.`,
    ]
      .filter(Boolean)
      .join("\n");
    const subject = `RxBridge rescue report, ${artifact.patientName}, ${artifact.originalMedication}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Action bar (not part of the printed PDF) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="text-sm font-semibold">Rescue report</span>
        <div className="flex gap-2">
          <button
            onClick={exportPdf}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-600"
          >
            Export PDF
          </button>
          <button
            onClick={emailReport}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            Email to doctor / pharmacy
          </button>
        </div>
      </div>

      {/* The printable report body */}
      <div ref={ref} className="space-y-4 p-4">
        <div>
          <h1 className="text-base font-semibold">
            RxBridge prescription rescue report
          </h1>
          <p className="sub text-xs text-slate-500 dark:text-slate-400">
            {artifact.patientName} · {artifact.region} · generated {generated}
          </p>
        </div>

        {/* Key facts */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Fact label="Original medication" value={artifact.originalMedication} />
            <Fact label="Approved alternative" value={artifact.approvedAlternative ?? "Pending"} />
            <Fact label="Prescriber" value={artifact.prescriberName ?? "Pending"} />
            <Fact label="Pharmacy" value={artifact.pharmacyName ?? "Pending"} />
            <Fact
              label="Agreed price"
              value={artifact.agreedPrice != null ? `$${artifact.agreedPrice}` : "Pending"}
            />
            <Fact
              label="Saved"
              value={artifact.savings ? `$${artifact.savings}` : "$0"}
            />
          </div>
          <p className="mt-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            {artifact.outcome}
          </p>
        </div>

        {/* Price movement mini chart (pure CSS bars, prints cleanly) */}
        {artifact.priceTrail.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Price during the call
            </h2>
            <div className="flex items-end gap-2" style={{ height: 90 }}>
              {artifact.priceTrail.map((p, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-slate-500">
                    ${p.price}
                  </span>
                  <div
                    className={`w-full rounded-t ${p.step === "Agent" ? "bg-brand-500" : "bg-teal-500"}`}
                    style={{ height: `${Math.max(8, (p.price / maxPrice) * 64)}px` }}
                  />
                  <span className="text-[9px] text-slate-400">{p.step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Negotiation transcript */}
        {artifact.transcript.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Negotiation transcript
            </h2>
            <table className="w-full border-collapse text-xs">
              <tbody>
                {artifact.transcript.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1 pr-2 align-top">
                      <span className={t.speaker === "agent" ? "agent text-brand-600" : "pharm text-teal-600"}>
                        {t.speaker === "agent" ? "RxBridge" : "Pharmacy"}
                      </span>
                    </td>
                    <td className="py-1">
                      {t.text}
                      {t.price != null && (
                        <span className="ml-1 font-semibold tabular-nums">
                          (${t.price})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Workflow timeline */}
        {artifact.timeline.length > 0 && (
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Workflow timeline
            </h2>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {artifact.timeline.map((t, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{t.label}</span>
                  <span className="shrink-0 text-slate-400">
                    {new Date(t.at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="note mt-2 border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-400 dark:border-slate-800">
          This report is synthetic demo data. In production it would be shared
          only through a HIPAA compliant channel with the patient's consent. It
          is general information, not medical advice. Verify all details in your
          system of record before acting.
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
