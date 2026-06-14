"use client";

import { useCallback, useEffect, useState } from "react";

interface MedicationView {
  name: string;
  dose: string;
  treats: string;
  refillDate: string;
  daysSupplyRemaining: number;
  daysUntilRefill: number;
  urgency: "overdue" | "soon" | "ok";
  refillAdvice: string;
}

type HistoryCategory =
  | "condition"
  | "medication"
  | "procedure"
  | "lab"
  | "allergy"
  | "immunization"
  | "hospitalization"
  | "care-plan";

interface MedicalHistoryItem {
  date: string;
  category: HistoryCategory;
  title: string;
  details: string;
}

interface MedicationShortage {
  medication: string;
  ingredient: string;
  status: "shortage" | "limited" | "watch" | "resolved";
  severity: "info" | "watch" | "act_now";
  summary: string;
  recommendedAction: string;
  source: string;
}

interface Alert {
  headline: string;
  category: string;
  affected_medication: string | null;
  severity: "info" | "watch" | "act_now";
  summary: string;
  recommended_action: string;
}

interface Citation {
  url: string;
  title: string;
}

interface AlertsResponse {
  patient: {
    id: string;
    displayName: string;
    region: string;
    medicalHistory: MedicalHistoryItem[];
    shortageWatchlist: MedicationShortage[];
  };
  generatedAt: string;
  medications: MedicationView[];
  alerts: Alert[];
  overallNote: string;
  citations: Citation[];
  newsError: string | null;
}

const PATIENTS = [
  { id: "ayush", label: "Ayush Ojha" },
  { id: "demo-marcus", label: "Marcus L." },
];

const SEVERITY_STYLE: Record<Alert["severity"], string> = {
  act_now:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200",
  watch:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  info: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
};

const SEVERITY_LABEL: Record<Alert["severity"], string> = {
  act_now: "Act now",
  watch: "Watch",
  info: "Info",
};

const URGENCY_STYLE: Record<MedicationView["urgency"], string> = {
  overdue: "bg-red-500 text-white",
  soon: "bg-amber-400 text-amber-950",
  ok: "bg-emerald-500 text-white",
};

const URGENCY_LABEL: Record<MedicationView["urgency"], string> = {
  overdue: "Refill now",
  soon: "Refill soon",
  ok: "On track",
};

const HISTORY_LABEL: Record<HistoryCategory, string> = {
  allergy: "Allergy",
  "care-plan": "Care plan",
  condition: "Condition",
  hospitalization: "Hospital",
  immunization: "Vaccine",
  lab: "Lab",
  medication: "Medication",
  procedure: "Procedure",
};

const HISTORY_STYLE: Record<HistoryCategory, string> = {
  allergy: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900",
  "care-plan":
    "bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-100 dark:ring-brand-700",
  condition:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  hospitalization:
    "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-200 dark:ring-orange-900",
  immunization:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900",
  lab: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-200 dark:ring-violet-900",
  medication:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900",
  procedure:
    "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-200 dark:ring-cyan-900",
};

const SHORTAGE_STATUS_LABEL: Record<MedicationShortage["status"], string> = {
  shortage: "Shortage",
  limited: "Limited",
  watch: "Watch",
  resolved: "Resolved",
};

export function HealthAlerts({
  patientId: controlledPatientId,
  onPatientChange,
}: {
  /** When provided, the selected patient is controlled by the parent. */
  patientId?: string;
  onPatientChange?: (id: string) => void;
} = {}) {
  const [localPatientId, setLocalPatientId] = useState(PATIENTS[0].id);
  const patientId = controlledPatientId ?? localPatientId;
  const setPatientId = (id: string) => {
    setLocalPatientId(id);
    onPatientChange?.(id);
  };
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load alerts.");
      setData(json as AlertsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load alerts.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Load the patient's medications and alerts on mount and whenever the
  // selected patient changes, so the right rail is populated without a click.
  useEffect(() => {
    check();
  }, [check]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Your medical data</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Medications and refill timing, with realtime alerts matched to them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="patient">
            Patient
          </label>
          <select
            id="patient"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {PATIENTS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={check}
            disabled={loading}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Checking" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {data && (
        <div className="mt-4 space-y-5">
          {/* Medications + refill status */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your medications
            </h3>
            <ul className="space-y-2">
              {data.medications.map((m) => (
                <li
                  key={m.name}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      For {m.treats}. Refill due {m.refillDate}.{" "}
                      {m.daysSupplyRemaining} days on hand.
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
          </div>

          {/* Medical history */}
          {data.patient.medicalHistory.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Medical history
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {data.patient.medicalHistory.length} records
                </span>
              </div>
              <ul className="space-y-2">
                {data.patient.medicalHistory.map((item) => (
                  <li
                    key={`${item.date}-${item.title}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${HISTORY_STYLE[item.category]}`}
                      >
                        {HISTORY_LABEL[item.category]}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {item.date}
                      </span>
                    </div>
                    <p className="mt-1 font-medium">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.details}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deterministic shortage watchlist */}
          {data.patient.shortageWatchlist.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Medication shortage watchlist
              </h3>
              <ul className="space-y-2">
                {data.patient.shortageWatchlist.map((s) => (
                  <li
                    key={`${s.medication}-${s.status}`}
                    className={`rounded-lg border px-3 py-2 ${SEVERITY_STYLE[s.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{s.medication}</p>
                        <p className="text-xs font-medium opacity-75">
                          Ingredient: {s.ingredient}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-black/30">
                        {SHORTAGE_STATUS_LABEL[s.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm opacity-90">{s.summary}</p>
                    <p className="mt-1 text-sm font-medium">
                      What to do: {s.recommendedAction}
                    </p>
                    <p className="mt-1 text-[11px] opacity-70">
                      Source: {s.source}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* News alerts */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Realtime news that may affect you
            </h3>
            {data.newsError ? (
              <p className="text-sm text-slate-500">{data.newsError}</p>
            ) : data.alerts.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                {data.overallNote ||
                  "No active outbreaks or shortages affecting your medications were found."}
              </p>
            ) : (
              <ul className="space-y-2">
                {data.alerts.map((a, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border px-3 py-2 ${SEVERITY_STYLE[a.severity]}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{a.headline}</p>
                      <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide dark:bg-black/30">
                        {SEVERITY_LABEL[a.severity]}
                      </span>
                    </div>
                    {a.affected_medication && (
                      <p className="mt-0.5 text-xs font-medium opacity-80">
                        Affects: {a.affected_medication}
                      </p>
                    )}
                    <p className="mt-1 text-sm opacity-90">{a.summary}</p>
                    <p className="mt-1 text-sm font-medium">
                      What to do: {a.recommended_action}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sources */}
          {data.citations.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sources
              </h3>
              <ul className="space-y-1">
                {data.citations.slice(0, 8).map((c) => (
                  <li key={c.url} className="truncate text-xs">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-100"
                    >
                      {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            Generated {new Date(data.generatedAt).toLocaleString()}. This is
            general information, not medical advice. Confirm refills and any
            changes with your pharmacist or doctor.
          </p>
        </div>
      )}
    </section>
  );
}
