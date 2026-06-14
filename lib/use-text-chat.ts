"use client";

import { useCallback, useRef, useState } from "react";
import { stripDashes } from "@/lib/sanitize";
import type { TranscriptTurn } from "@/lib/use-realtime";
import type { Artifact } from "@/lib/artifacts";
import type { RescueCase } from "@/lib/rescue-types";
import { caseToTracker } from "@/lib/rescue-view";

/** The route streams text, then optionally this separator and a JSON line
 * carrying artifacts. The record-separator control character (U+001E) will not
 * appear in normal model text. */
const ARTIFACT_SEPARATOR = String.fromCharCode(30);
const CHAT_TIMEOUT_MS = 45_000;

/**
 * Streaming text chat against /api/chat.
 *
 * Produces the same TranscriptTurn shape the voice hook uses, so the page can
 * render one shared conversation whether the patient is typing or talking.
 * Assistant turns may carry artifacts (charts, trackers) that the page renders
 * inline.
 */
export function useTextChat() {
  const [messages, setMessages] = useState<TranscriptTurn[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);

  const nextId = useCallback((speaker: string) => {
    counter.current += 1;
    return `text-${speaker}-${counter.current}`;
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      setError(null);

      const userTurn: TranscriptTurn = {
        id: nextId("user"),
        speaker: "user",
        text: stripDashes(text),
        done: true,
      };
      const assistantId = nextId("assistant");
      const history = [...messages, userTurn];

      setMessages([
        ...history,
        { id: assistantId, speaker: "assistant", text: "", done: false },
      ]);
      setSending(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history.map((m) => ({ role: m.speaker, content: m.text })),
          }),
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "The assistant could not reply.");
        }

        const streamed = await res.text();

        // After the stream ends, split off any artifacts payload.
        const [bodyText, artifactJson] = streamed.split(ARTIFACT_SEPARATOR);
        let artifacts: Artifact[] | undefined;
        if (artifactJson) {
          try {
            const parsed = JSON.parse(artifactJson);
            if (Array.isArray(parsed.artifacts)) artifacts = parsed.artifacts;
          } catch {
            // ignore a malformed artifact payload, keep the text reply
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: stripDashes(bodyText), done: true, artifacts }
              : m,
          ),
        );
      } catch (e) {
        const message =
          e instanceof DOMException && e.name === "AbortError"
            ? "The assistant took too long to reply. Please try again."
            : e instanceof Error
              ? e.message
              : "The assistant could not reply.";
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: m.text || "Sorry, I could not reply just now.",
                  done: true,
                }
              : m,
          ),
        );
      } finally {
        window.clearTimeout(timeout);
        setSending(false);
      }
    },
    [messages, nextId, sending],
  );

  // When an action button runs a rescue route and gets back updated case
  // state, append a fresh tracker artifact so the conversation reflects it.
  const handleActionResult = useCallback(
    (result: unknown) => {
      // The rescue routes may return the case wrapped as { case } or as the
      // bare RescueCase object. Accept either shape.
      const rescueCase = extractRescueCase(result);
      if (!rescueCase) return;
      const tracker = caseToTracker(rescueCase);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("assistant"),
          speaker: "assistant",
          text: "Here is the updated rescue status.",
          done: true,
          artifacts: [tracker],
        },
      ]);
    },
    [nextId],
  );

  return { messages, sending, error, send, setMessages, handleActionResult };
}

/** Pull a RescueCase out of a route response, whether wrapped or bare. */
function extractRescueCase(result: unknown): RescueCase | null {
  if (!result || typeof result !== "object") return null;
  const obj = result as Record<string, unknown>;
  const wrapped = obj.case;
  if (wrapped && typeof wrapped === "object") return wrapped as RescueCase;
  // Bare case object has an id, status, and timeline.
  if ("id" in obj && "status" in obj && "timeline" in obj) {
    return obj as unknown as RescueCase;
  }
  return null;
}
