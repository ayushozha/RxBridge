import type { MedTrend } from "@/lib/rescue-types";
import { getPatient, type Medication } from "@/lib/patient-data";

/**
 * Multi-series chart payload for a single informative "health overview" chart.
 *
 * This is the shape get_health_overview returns. It is intentionally close to
 * MedTrend, but each point carries several named values (one per series) so
 * lib/tool-runtime.ts can render one chart with multiple lines. All values are
 * synthetic demo data.
 */
export interface HealthOverviewSeries {
  key: string;
  label: string;
  unit?: string;
}

export interface HealthOverview {
  label: string;
  unit: string;
  /** Each point is keyed by date plus one numeric field per series key. */
  points: Array<{ date: string } & Record<string, number | string>>;
  series: HealthOverviewSeries[];
}

const TRENDS: Record<string, Record<string, MedTrend>> = {
  ayush: {
    a1c: {
      metric: "a1c",
      label: "A1C",
      unit: "%",
      points: [
        { date: "2025-09-01", value: 8.2 },
        { date: "2025-12-01", value: 7.8 },
        { date: "2026-03-01", value: 7.3 },
        { date: "2026-06-01", value: 7.0 },
      ],
      target: { max: 7, label: "Common target, confirm with clinician" },
    },
    blood_pressure_systolic: {
      metric: "blood_pressure_systolic",
      label: "Systolic blood pressure",
      unit: "mmHg",
      points: [
        { date: "2025-09-01", value: 142 },
        { date: "2025-12-01", value: 136 },
        { date: "2026-03-01", value: 130 },
        { date: "2026-06-01", value: 126 },
      ],
      target: { max: 130, label: "Demo target" },
    },
    days_supply: {
      metric: "days_supply",
      label: "Lowest days of medication on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 18 },
        { date: "2026-06-05", value: 17 },
        { date: "2026-06-06", value: 12 },
        { date: "2026-06-07", value: 11 },
        { date: "2026-06-08", value: 10 },
        { date: "2026-06-09", value: 9 },
        { date: "2026-06-10", value: 7 },
        { date: "2026-06-11", value: 5 },
        { date: "2026-06-12", value: 4 },
        { date: "2026-06-13", value: 3 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
    days_supply_albuterol: {
      metric: "days_supply_albuterol",
      label: "Albuterol inhaler, days on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 12 },
        { date: "2026-06-05", value: 11 },
        { date: "2026-06-06", value: 10 },
        { date: "2026-06-07", value: 9 },
        { date: "2026-06-08", value: 8 },
        { date: "2026-06-09", value: 7 },
        { date: "2026-06-10", value: 6 },
        { date: "2026-06-11", value: 5 },
        { date: "2026-06-12", value: 4 },
        { date: "2026-06-13", value: 3 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
    days_supply_metformin: {
      metric: "days_supply_metformin",
      label: "Metformin, days on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 16 },
        { date: "2026-06-05", value: 15 },
        { date: "2026-06-06", value: 14 },
        { date: "2026-06-07", value: 13 },
        { date: "2026-06-08", value: 12 },
        { date: "2026-06-09", value: 11 },
        { date: "2026-06-10", value: 10 },
        { date: "2026-06-11", value: 9 },
        { date: "2026-06-12", value: 8 },
        { date: "2026-06-13", value: 7 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
  },
  "demo-marcus": {
    a1c: {
      metric: "a1c",
      label: "A1C",
      unit: "%",
      points: [
        { date: "2025-09-01", value: 8.1 },
        { date: "2025-12-01", value: 7.9 },
        { date: "2026-03-01", value: 7.6 },
        { date: "2026-06-01", value: 7.4 },
      ],
      target: { max: 7, label: "Common target, confirm with clinician" },
    },
    blood_pressure_systolic: {
      metric: "blood_pressure_systolic",
      label: "Systolic blood pressure",
      unit: "mmHg",
      points: [
        { date: "2025-09-01", value: 138 },
        { date: "2025-12-01", value: 134 },
        { date: "2026-03-01", value: 131 },
        { date: "2026-06-01", value: 128 },
      ],
      target: { max: 130, label: "Demo target" },
    },
    days_supply: {
      metric: "days_supply",
      label: "Lowest days of medication on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 14 },
        { date: "2026-06-05", value: 13 },
        { date: "2026-06-06", value: 8 },
        { date: "2026-06-07", value: 7 },
        { date: "2026-06-08", value: 6 },
        { date: "2026-06-09", value: 5 },
        { date: "2026-06-10", value: 4 },
        { date: "2026-06-11", value: 3 },
        { date: "2026-06-12", value: 2 },
        { date: "2026-06-13", value: 1 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
    days_supply_semaglutide: {
      metric: "days_supply_semaglutide",
      label: "Semaglutide (Ozempic), days on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 13 },
        { date: "2026-06-05", value: 12 },
        { date: "2026-06-06", value: 11 },
        { date: "2026-06-07", value: 10 },
        { date: "2026-06-08", value: 9 },
        { date: "2026-06-09", value: 8 },
        { date: "2026-06-10", value: 8 },
        { date: "2026-06-11", value: 7 },
        { date: "2026-06-12", value: 6 },
        { date: "2026-06-13", value: 6 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
    days_supply_levothyroxine: {
      metric: "days_supply_levothyroxine",
      label: "Levothyroxine (Synthroid), days on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 13 },
        { date: "2026-06-05", value: 12 },
        { date: "2026-06-06", value: 11 },
        { date: "2026-06-07", value: 10 },
        { date: "2026-06-08", value: 9 },
        { date: "2026-06-09", value: 8 },
        { date: "2026-06-10", value: 7 },
        { date: "2026-06-11", value: 6 },
        { date: "2026-06-12", value: 5 },
        { date: "2026-06-13", value: 4 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
    days_supply_losartan: {
      metric: "days_supply_losartan",
      label: "Losartan, days on hand",
      unit: "days",
      points: [
        { date: "2026-06-04", value: 18 },
        { date: "2026-06-05", value: 17 },
        { date: "2026-06-06", value: 16 },
        { date: "2026-06-07", value: 15 },
        { date: "2026-06-08", value: 14 },
        { date: "2026-06-09", value: 13 },
        { date: "2026-06-10", value: 12 },
        { date: "2026-06-11", value: 11 },
        { date: "2026-06-12", value: 10 },
        { date: "2026-06-13", value: 9 },
      ],
      target: { min: 7, label: "Refill buffer" },
    },
  },
};

export function getMedTrend(patientId: string, metric: string): MedTrend | null {
  const patientTrends = TRENDS[patientId];
  if (!patientTrends) return null;

  const normalized = normalizeMetric(metric);
  const canonical = metricAlias(normalized);
  return (
    patientTrends[metric] ??
    patientTrends[normalized] ??
    patientTrends[canonical] ??
    (normalized.startsWith("days_supply") ? patientTrends.days_supply : null) ??
    null
  );
}

function normalizeMetric(metric: string): string {
  return metric
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function metricAlias(metric: string): string {
  if (metric.includes("ozempic")) return "days_supply_semaglutide";
  if (metric.includes("synthroid")) return "days_supply_levothyroxine";
  if (metric.includes("ventolin")) return "days_supply_albuterol";
  if (metric.includes("glucophage")) return "days_supply_metformin";
  if (metric.includes("lipitor")) return "days_supply_atorvastatin";
  if (metric.includes("adderall")) return "days_supply_amphetamine_mixed_salts";
  return metric;
}

// The 10 dates the overview spans, oldest to newest, ending today.
const OVERVIEW_DATES = [
  "2026-06-04",
  "2026-06-05",
  "2026-06-06",
  "2026-06-07",
  "2026-06-08",
  "2026-06-09",
  "2026-06-10",
  "2026-06-11",
  "2026-06-12",
  "2026-06-13",
];

/** A safe series key for a medication, for example days_supply_semaglutide. */
function supplyKey(med: Medication): string {
  return `days_supply_${med.ingredient.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
}

/**
 * Synthesize a 10 day declining days-of-supply series ending at the
 * medication's current daysSupplyRemaining, so every medication can be charted
 * even without a hand authored fixture. Uses an authored fixture when present.
 */
function seriesForMed(
  patientId: string,
  med: Medication,
): { key: string; trend: MedTrend } {
  const key = supplyKey(med);
  const authored = TRENDS[patientId]?.[key];
  if (authored) return { key: authored.metric, trend: authored };

  const end = med.daysSupplyRemaining;
  // A gentle decline of about one day per day, clamped at zero.
  const points = OVERVIEW_DATES.map((date, i) => {
    const fromEnd = OVERVIEW_DATES.length - 1 - i;
    return { date, value: Math.max(0, end + fromEnd) };
  });
  return {
    key,
    trend: {
      metric: key,
      label: `${med.name}, days on hand`,
      unit: "days",
      points,
      target: { min: 7, label: "Refill buffer" },
    },
  };
}

/**
 * Build one informative multi-series chart of the patient's recent daily days
 * of supply, one line for EVERY medication the patient has. This is what
 * get_health_overview returns so a single chart answers "pull up my health
 * data" or "show all my medications" without long prose. Authored fixtures are
 * used where present; the rest are synthesized from current supply. All values
 * are synthetic demo data.
 */
export function getHealthOverview(patientId: string): HealthOverview | null {
  const patient = getPatient(patientId);
  if (!patient || patient.medications.length === 0) return null;

  const built = patient.medications.map((med) => seriesForMed(patientId, med));

  const series: HealthOverviewSeries[] = built.map(({ key, trend }) => ({
    key,
    label: trend.label,
    unit: trend.unit,
  }));

  // Align every series onto the union of their dates, keyed by date.
  const byDate = new Map<
    string,
    { date: string } & Record<string, number | string>
  >();
  for (const { key, trend } of built) {
    for (const point of trend.points) {
      const row = byDate.get(point.date) ?? { date: point.date };
      row[key] = point.value;
      byDate.set(point.date, row);
    }
  }
  const points = [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  return {
    label: "Your medications, days on hand",
    unit: "days",
    points,
    series,
  };
}
