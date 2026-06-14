"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRealtime, type TranscriptTurn } from "@/lib/use-realtime";
import { useTextChat } from "@/lib/use-text-chat";
import { HealthAlerts } from "@/components/HealthAlerts";
import { ArtifactList } from "@/components/artifacts/ArtifactRenderer";
import { getPatient, PRIMARY_PATIENT_ID } from "@/lib/patient-data";

type Mode = "text" | "voice";

const PATIENT = getPatient(PRIMARY_PATIENT_ID);
const FIRST_NAME = PATIENT?.displayName.split(" ")[0] ?? "there";

export default function RxBridgePage() {
  const [mode, setMode] = useState<Mode>("text");

  const voice = useRealtime();
  const chat = useTextChat();
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // One conversation, drawn from whichever modes have been used. Voice and text
  // turns are simply shown in the order they were produced within each track.
  const conversation: TranscriptTurn[] = useMemo(
    () => [...chat.messages, ...voice.transcript],
    [chat.messages, voice.transcript],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation]);

  const connected = voice.status === "connected";
  const connecting = voice.status === "connecting";

  let voiceStatus = "Tap the mic to start talking";
  if (connecting) voiceStatus = "Connecting";
  else if (connected && voice.assistantSpeaking) voiceStatus = "Speaking";
  else if (connected) voiceStatus = "Listening";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || chat.sending) return;
    chat.send(input);
    setInput("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !chat.sending) {
        chat.send(input);
        setInput("");
      }
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-lg font-bold text-white">
          Rx
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold sm:text-base">RxBridge</h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            Your personal healthcare assistant
          </p>
        </div>
      </header>

      {/* Three panes */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[16rem_1fr_20rem] lg:grid-cols-[18rem_1fr_22rem]">
        {/* Left: conversation history */}
        <aside className="hidden flex-col overflow-y-auto border-r border-slate-200 p-3 dark:border-slate-800 md:flex">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Conversation history
          </h2>
          {conversation.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">
              Your questions will be listed here as you chat.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversation
                .filter((t) => t.speaker === "user" && t.text.trim())
                .map((t) => (
                  <li
                    key={t.id}
                    className="truncate rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    title={t.text}
                  >
                    {t.text}
                  </li>
                ))}
            </ul>
          )}
        </aside>

        {/* Center: chat + voice in one interface */}
        <main className="flex min-w-0 flex-col">
          {/* Mode switch */}
          <div className="flex items-center justify-center gap-1 border-b border-slate-200 p-2 dark:border-slate-800">
            <div className="inline-flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => setMode("text")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === "text"
                    ? "bg-white text-brand-600 shadow dark:bg-slate-700 dark:text-brand-100"
                    : "text-slate-500"
                }`}
              >
                Text
              </button>
              <button
                onClick={() => setMode("voice")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  mode === "voice"
                    ? "bg-white text-brand-600 shadow dark:bg-slate-700 dark:text-brand-100"
                    : "text-slate-500"
                }`}
              >
                Voice
              </button>
            </div>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
            {conversation.length === 0 ? (
              <div className="mx-auto mt-8 max-w-md text-center">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-100">
                  Rx
                </div>
                <h2 className="text-lg font-semibold">
                  Welcome {FIRST_NAME}, I am your personal healthcare assistant.
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Ask me anything about your health, your medications, or the
                  alerts on the right. You can type below, or switch to Voice to
                  talk with me.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex gap-3 ${
                      turn.speaker === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${
                        turn.speaker === "user"
                          ? "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
                          : "bg-brand-500 text-white"
                      }`}
                      aria-hidden
                    >
                      {turn.speaker === "user" ? "🧑" : "Rx"}
                    </div>
                    <div
                      className={`flex max-w-[85%] flex-col gap-1 ${
                        turn.speaker === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <p
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                          turn.speaker === "user"
                            ? "bg-brand-500 text-white"
                            : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
                        } ${turn.done ? "" : "opacity-80"}`}
                      >
                        {turn.text || "…"}
                      </p>
                      {turn.speaker === "assistant" && (
                        <div className="w-full">
                          <ArtifactList
                            artifacts={turn.artifacts}
                            onAction={chat.handleActionResult}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(voice.error || chat.error) && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {voice.error || chat.error}
              </div>
            )}
          </div>

          {/* Composer: text input or voice controls */}
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            {mode === "text" ? (
              <form
                onSubmit={onSubmit}
                className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm focus-within:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  placeholder={`Type a message, ${FIRST_NAME}…`}
                  className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || chat.sending}
                  className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {chat.sending ? "…" : "Send"}
                </button>
              </form>
            ) : (
              <VoiceControls
                connected={connected}
                connecting={connecting}
                assistantSpeaking={voice.assistantSpeaking}
                userSpeaking={voice.userSpeaking}
                muted={voice.muted}
                statusLabel={voiceStatus}
                onConnect={voice.connect}
                onDisconnect={voice.disconnect}
                onToggleMute={voice.toggleMute}
              />
            )}
            <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
              RxBridge gives general information, not medical advice. For
              diagnosis or treatment, consult a healthcare professional. In an
              emergency, call your local emergency number.
            </p>
          </div>
        </main>

        {/* Right: patient medical data + medicines + alerts */}
        <aside className="hidden flex-col overflow-y-auto border-l border-slate-200 p-3 dark:border-slate-800 md:flex">
          <HealthAlerts />
        </aside>
      </div>
    </div>
  );
}

function VoiceControls(props: {
  connected: boolean;
  connecting: boolean;
  assistantSpeaking: boolean;
  userSpeaking: boolean;
  muted: boolean;
  statusLabel: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMute: () => void;
}) {
  const {
    connected,
    connecting,
    assistantSpeaking,
    userSpeaking,
    muted,
    statusLabel,
    onConnect,
    onDisconnect,
    onToggleMute,
  } = props;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={connected || connecting ? undefined : onConnect}
        disabled={connecting}
        aria-label={connected ? "Voice session active" : "Start voice session"}
        className="group relative flex size-24 items-center justify-center rounded-full focus:outline-none"
      >
        <span
          className={`absolute inset-0 rounded-full bg-brand-500/20 transition ${
            assistantSpeaking ? "animate-ping" : ""
          }`}
        />
        <span
          className={`absolute inset-2 rounded-full bg-brand-500/30 transition ${
            userSpeaking ? "animate-pulse" : ""
          }`}
        />
        <span
          className={`relative flex size-16 items-center justify-center rounded-full text-2xl text-white shadow-lg transition ${
            connected
              ? "bg-gradient-to-br from-brand-500 to-brand-700"
              : "bg-slate-400 group-hover:bg-brand-500 dark:bg-slate-600"
          } ${connecting ? "animate-pulse" : ""}`}
        >
          {connected ? (assistantSpeaking ? "🔊" : "🎙") : "🎙"}
        </span>
      </button>

      <p
        className={`text-sm font-medium ${
          connected ? "text-brand-600 dark:text-brand-100" : "text-slate-500"
        }`}
        aria-live="polite"
      >
        {statusLabel}
      </p>

      {connected && (
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMute}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              muted
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={onDisconnect}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
          >
            End call
          </button>
        </div>
      )}
    </div>
  );
}
