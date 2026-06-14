"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NegotiationCallArtifact, NegotiationTurn } from "@/lib/artifacts";

/**
 * The live two voice pharmacy negotiation, rendered as a call widget inside the
 * chat. Plays each turn in order, the RxBridge agent (OpenAI voice) and the
 * pharmacy (Grok voice), with a running price ledger, and ends on the agreed
 * price. If a turn has no audio, it is spoken with the browser voice so the
 * call always plays.
 */
export default function NegotiationCallView({
  artifact,
}: {
  artifact: NegotiationCallArtifact;
}) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [revealed, setRevealed] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const speakBrowser = useCallback(
    (turn: NegotiationTurn): Promise<void> =>
      new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          setTimeout(resolve, 1400);
          return;
        }
        const u = new SpeechSynthesisUtterance(turn.text);
        const voices = window.speechSynthesis.getVoices();
        // Two distinct browser voices so the speakers sound different.
        if (voices.length > 1) {
          u.voice = turn.speaker === "agent" ? voices[0] : voices[1] ?? voices[0];
        }
        u.rate = 1.05;
        u.pitch = turn.speaker === "agent" ? 1.0 : 0.85;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const playAudio = useCallback(
    (src: string): Promise<void> =>
      new Promise((resolve) => {
        const el = audioRef.current ?? new Audio();
        audioRef.current = el;
        el.src = src;
        el.onended = () => resolve();
        el.onerror = () => resolve();
        el.play().catch(() => resolve());
      }),
    [],
  );

  const run = useCallback(async () => {
    cancelledRef.current = false;
    setDone(false);
    setRevealed(0);
    for (let i = 0; i < artifact.turns.length; i += 1) {
      if (cancelledRef.current) return;
      setActiveIdx(i);
      setRevealed(i + 1);
      const turn = artifact.turns[i];
      if (turn.audio) await playAudio(turn.audio);
      else await speakBrowser(turn);
      if (cancelledRef.current) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    setActiveIdx(-1);
    setDone(true);
  }, [artifact.turns, playAudio, speakBrowser]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      audioRef.current?.pause();
    };
  }, []);

  function start() {
    setStarted(true);
    void run();
  }

  const shownTurns = artifact.turns.slice(0, revealed);
  const latestPrice = [...shownTurns].reverse().find((t) => t.price)?.price;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Call header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span
              className={`absolute inline-flex size-full rounded-full ${
                done ? "bg-emerald-400" : "animate-ping bg-brand-400"
              }`}
            />
            <span
              className={`relative inline-flex size-2.5 rounded-full ${
                done ? "bg-emerald-500" : "bg-brand-500"
              }`}
            />
          </span>
          <span className="text-sm font-medium">
            {done ? "Call complete" : started ? "On call" : "Ready to call"}{" "}
            {artifact.pharmacyName}
          </span>
        </div>
        {latestPrice != null && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-slate-800">
            ${latestPrice}
          </span>
        )}
      </div>

      {/* Transcript */}
      <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-2">
        {!started && (
          <button
            onClick={start}
            className="w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Place the call to {artifact.pharmacyName}
          </button>
        )}
        {shownTurns.map((turn, i) => {
          const isAgent = turn.speaker === "agent";
          const active = i === activeIdx;
          return (
            <div
              key={i}
              className={`flex flex-col ${isAgent ? "items-start" : "items-end"}`}
            >
              <span className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {isAgent ? "RxBridge agent" : "Pharmacy"} · {turn.voiceLabel}
              </span>
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-1.5 text-sm ${
                  isAgent
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                } ${active ? "ring-2 ring-brand-300" : ""}`}
              >
                {turn.text}
                {turn.price != null && (
                  <span className="ml-1 font-semibold tabular-nums">
                    (${turn.price})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome */}
      {done && (
        <div className="border-t border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Reserved {artifact.medication} at ${artifact.agreedPrice} for same day
          pickup.
        </div>
      )}
    </div>
  );
}
