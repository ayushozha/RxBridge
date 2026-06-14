"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { ChartArtifact } from "@/lib/artifacts";

const PALETTE = ["#1f7ae0", "#0f4f9c", "#e0991f", "#1fa37a", "#c43d3d"];

/**
 * Interactive chart rendered inline in the conversation. Hover for values,
 * toggle series from the legend. Lazy loaded by ArtifactRenderer so it never
 * blocks server rendering.
 */
export default function ChartArtifactView({ artifact }: { artifact: ChartArtifact }) {
  const { chartKind, data, xKey, series, referenceLines } = artifact;

  const refs = (referenceLines ?? []).map((r, i) =>
    r.axis === "y" ? (
      <ReferenceLine
        key={`ref-${i}`}
        y={r.value as number}
        stroke="#94a3b8"
        strokeDasharray="4 4"
        label={{ value: r.label, position: "insideTopRight", fontSize: 10 }}
      />
    ) : (
      <ReferenceLine
        key={`ref-${i}`}
        x={r.value}
        stroke="#94a3b8"
        strokeDasharray="4 4"
        label={{ value: r.label, position: "insideTopRight", fontSize: 10 }}
      />
    ),
  );

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey={xKey} fontSize={11} tickLine={false} />
      <YAxis fontSize={11} tickLine={false} width={36} />
      <Tooltip
        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
      />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      {refs}
    </>
  );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {chartKind === "bar" ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color ?? PALETTE[i % PALETTE.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        ) : chartKind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? PALETTE[i % PALETTE.length]}
                fill={s.color ?? PALETTE[i % PALETTE.length]}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {axes}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color ?? PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
