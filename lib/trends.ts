import type { MedTrend } from "@/lib/rescue-types";

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
  return patientTrends[metric] ?? null;
}

/**
 * Per patient list of the days_supply_* series to fold into the recent health
 * overview chart, in display order. These are the daily, actionable supply
 * lines that answer "pull up my health data" and the shortage story.
 */
const OVERVIEW_SUPPLY_METRICS: Record<string, string[]> = {
  ayush: ["days_supply_metformin", "days_supply_albuterol"],
  "demo-marcus": [
    "days_supply_semaglutide",
    "days_supply_levothyroxine",
    "days_supply_losartan",
  ],
};

/**
 * Build one informative multi-series chart of the patient's recent daily days
 * of supply, one line per critical medication. This is what get_health_overview
 * returns so a single chart answers "pull up my health data from yesterday" or
 * "how am I doing" without long prose. All values are synthetic demo data.
 */
export function getHealthOverview(patientId: string): HealthOverview | null {
  const patientTrends = TRENDS[patientId];
  if (!patientTrends) return null;

  const metrics = OVERVIEW_SUPPLY_METRICS[patientId] ?? [];
  const trends = metrics
    .map((metric) => patientTrends[metric])
    .filter((t): t is MedTrend => t != null);
  if (trends.length === 0) return null;

  const series: HealthOverviewSeries[] = trends.map((t) => ({
    key: t.metric,
    label: t.label,
    unit: t.unit,
  }));

  // Align every series onto the union of their dates, keyed by date.
  const byDate = new Map<string, { date: string } & Record<string, number | string>>();
  for (const trend of trends) {
    for (const point of trend.points) {
      const row = byDate.get(point.date) ?? { date: point.date };
      row[trend.metric] = point.value;
      byDate.set(point.date, row);
    }
  }
  const points = [...byDate.values()].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );

  return {
    label: "Your recent health data, days of medication on hand",
    unit: "days",
    points,
    series,
  };
}
