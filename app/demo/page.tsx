"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_SCRIPT } from "@/lib/demo-script";
import { ArtifactList } from "@/components/artifacts/ArtifactRenderer";

/**
 * Dependable demo replay.
 *
 * Plays a pre-recorded RxBridge conversation (captured from a real run) with
 * zero live API calls, so it cannot fail on stage. Auto advances with a typing
 * effect, and you can pause, step, or restart. The negotiation call artifact
 * plays its real captured audio inside the conversation.
 */

const TYPE_MS = 14; // per character
const PAUSE_AFTER_TURN_MS = 1100;

export default function DemoPage() {
  const turns = DEMO_SCRIPT.turns;
  const [visible, setVisible] = useState(0); // how many turns are shown
  const [typed, setTyped] = useState(""); // partial text of the current turn
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // Reveal one turn with a typing effect, then schedule the next.
  const playTurn = useCallback(
    (index: number) => {
      if (index >= turns.length) {
        setDone(true);
        setPlaying(false);
        return;
      }
      const turn = turns[index];
      setVisible(index + 1);
      setTyped("");

      let i = 0;
      const tick = () => {
        i += Math.max(1, Math.round(turn.text.length / 120));
        setTyped(turn.text.slice(0, i));
        if (i < turn.text.length) {
          timers.current.push(window.setTimeout(tick, TYPE_MS));
        } else {
          setTyped(turn.text);
          // Give artifacts (and the call) a beat, then advance.
          timers.current.push(
            window.setTimeout(() => playTurn(index + 1), PAUSE_AFTER_TURN_MS),
          );
        }
      };
      tick();
    },
    [turns],
  );

  // Drive playback when playing flips on.
  useEffect(() => {
    if (!playing || done) return;
    clearTimers();
    playTurn(visible === 0 ? 0 : visible - 1);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visible, typed]);

  function pause() {
    clearTimers();
    setPlaying(false);
    // Snap the current turn fully visible when pausing.
    if (visible > 0) setTyped(turns[visible - 1].text);
  }
  function resume() {
    if (done) return;
    setPlaying(true);
  }
  function next() {
    clearTimers();
    setPlaying(false);
    if (visible >= turns.length) return;
    setTyped(turns[Math.max(0, visible - 1)].text);
    const ni = visible;
    if (ni >= turns.length) {
      setDone(true);
      return;
    }
    setVisible(ni + 1);
    setTyped(turns[ni].text);
    if (ni + 1 >= turns.length) setDone(true);
  }
  function restart() {
    clearTimers();
    setVisible(0);
    setTyped("");
    setDone(false);
    setPlaying(true);
  }

  const shown = turns.slice(0, visible);

  return (
    <div className="mx-auto flex h-dvh max-w-3xl flex-col px-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 py-3 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">
            Rx
          </div>
          <div>
            <h1 className="text-sm font-semibold sm:text-base">RxBridge demo</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recorded walkthrough for {DEMO_SCRIPT.patientName}. Plays offline.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {playing ? (
            <button
              onClick={pause}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={resume}
              disabled={done}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
            >
              Play
            </button>
          )}
          <button
            onClick={next}
            disabled={done}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200"
          >
            Next
          </button>
          <button
            onClick={restart}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
          >
            Restart
          </button>
        </div>
      </header>

      {/* Conversation */}
      <main ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto py-5">
        {shown.length === 0 ? (
          <p className="px-2 text-center text-sm text-slate-400">
            Starting the recorded demo…
          </p>
        ) : (
          <div className="space-y-4">
            {shown.map((turn, idx) => {
              const isUser = turn.speaker === "user";
              const isLast = idx === shown.length - 1;
              const text = isLast ? typed : turn.text;
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
                      isUser
                        ? "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
                        : "bg-brand-500 text-white"
                    }`}
                    aria-hidden
                  >
                    {isUser ? "🧑" : "Rx"}
                  </div>
                  <div
                    className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                  >
                    <p
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                        isUser
                          ? "bg-brand-500 text-white"
                          : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
                      }`}
                    >
                      {text || "…"}
                    </p>
                    {turn.speaker === "assistant" &&
                      (!isLast || typed === turn.text) && (
                        <div className="w-full">
                          <ArtifactList artifacts={turn.artifacts} />
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <p className="border-t border-slate-200 py-3 text-center text-[11px] leading-snug text-slate-400 dark:border-slate-800">
        Recorded RxBridge walkthrough. General information, not medical advice.
        In an emergency, call your local emergency number.
      </p>
    </div>
  );
}
