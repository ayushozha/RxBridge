"use client";

import { useState } from "react";
import type { ActionButtonsArtifact, RescueAction } from "@/lib/artifacts";

const ROUTE: Record<RescueAction, string> = {
  start_rescue: "/api/rescue/start",
  authorize: "/api/rescue/authorize",
  confirm_fill: "/api/rescue/confirm-fill",
};

/**
 * Action controls embedded in the conversation. Each button drives the
 * deterministic rescue workflow through Agent B's routes. The result (updated
 * case state) is handed back via onResult so the page can refresh the tracker.
 * If the route is not available yet, it shows a clear, non breaking message.
 */
export default function ActionButtonsView({
  artifact,
  onResult,
}: {
  artifact: ActionButtonsArtifact;
  onResult?: (result: unknown) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(action: RescueAction, candidateId?: string) {
    setBusy(action);
    setNote(null);
    try {
      const res = await fetch(ROUTE[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: artifact.caseId, candidateId }),
      });
      if (res.status === 404) {
        setNote("This workflow step is not wired up yet.");
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setNote(json?.error ?? "That step could not be completed.");
        return;
      }
      onResult?.(json);
    } catch {
      setNote("Could not reach the workflow service.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {artifact.actions.map((a) => (
          <button
            key={`${a.action}-${a.candidateId ?? ""}`}
            onClick={() => run(a.action, a.candidateId)}
            disabled={busy !== null}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy === a.action ? "Working" : a.label}
          </button>
        ))}
      </div>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}
