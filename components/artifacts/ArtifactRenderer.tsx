"use client";

import dynamic from "next/dynamic";
import type { Artifact } from "@/lib/artifacts";
import MedicationListView from "./MedicationListView";
import RescueTrackerView from "./RescueTrackerView";
import SubstitutionCompareView from "./SubstitutionCompareView";
import RescuePacketView from "./RescuePacketView";
import ActionButtonsView from "./ActionButtonsView";
import NegotiationCallView from "./NegotiationCallView";
import RescueReportView from "./RescueReportView";

// The chart pulls in Recharts, so load it only on the client, after paint.
const ChartArtifactView = dynamic(() => import("./ChartArtifactView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center text-xs text-slate-400">
      Loading chart…
    </div>
  ),
});

/**
 * Renders a single artifact inline in the conversation. The page maps over a
 * turn's artifacts and calls this for each. onAction lets interactive artifacts
 * (action buttons) hand their result back up so the page can refresh state.
 */
export function ArtifactRenderer({
  artifact,
  onAction,
}: {
  artifact: Artifact;
  onAction?: (result: unknown) => void;
}) {
  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {artifact.title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {artifact.title}
        </p>
      )}
      <ArtifactBody artifact={artifact} onAction={onAction} />
    </div>
  );
}

function ArtifactBody({
  artifact,
  onAction,
}: {
  artifact: Artifact;
  onAction?: (result: unknown) => void;
}) {
  switch (artifact.type) {
    case "chart":
      return <ChartArtifactView artifact={artifact} />;
    case "medication_list":
      return <MedicationListView artifact={artifact} />;
    case "rescue_tracker":
      return <RescueTrackerView artifact={artifact} />;
    case "substitution_compare":
      return <SubstitutionCompareView artifact={artifact} />;
    case "rescue_packet":
      return <RescuePacketView artifact={artifact} />;
    case "action_buttons":
      return <ActionButtonsView artifact={artifact} onResult={onAction} />;
    case "negotiation_call":
      return <NegotiationCallView artifact={artifact} />;
    case "rescue_report":
      return <RescueReportView artifact={artifact} />;
    default:
      return null;
  }
}

/** Renders all artifacts attached to a turn. */
export function ArtifactList({
  artifacts,
  onAction,
}: {
  artifacts?: Artifact[];
  onAction?: (result: unknown) => void;
}) {
  if (!artifacts || artifacts.length === 0) return null;
  return (
    <div className="space-y-2">
      {artifacts.map((a) => (
        <ArtifactRenderer key={a.id} artifact={a} onAction={onAction} />
      ))}
    </div>
  );
}
