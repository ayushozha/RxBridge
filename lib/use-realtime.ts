"use client";

import { useCallback, useRef, useState } from "react";
import { stripDashes } from "@/lib/sanitize";
import type { Artifact } from "@/lib/artifacts";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type Speaker = "user" | "assistant";

export interface TranscriptTurn {
  id: string;
  speaker: Speaker;
  text: string;
  /** false while the turn is still being spoken / transcribed. */
  done: boolean;
  /** Interactive artifacts rendered inline under this turn (charts, trackers). */
  artifacts?: Artifact[];
}

export interface RealtimeState {
  status: ConnectionStatus;
  error: string | null;
  /** true while the assistant is producing audio. */
  assistantSpeaking: boolean;
  /** true while the patient is detected as speaking. */
  userSpeaking: boolean;
  muted: boolean;
  transcript: TranscriptTurn[];
}

const INITIAL_STATE: RealtimeState = {
  status: "idle",
  error: null,
  assistantSpeaking: false,
  userSpeaking: false,
  muted: false,
  transcript: [],
};

/**
 * Drives a voice conversation with the OpenAI Realtime API over WebRTC.
 *
 * Flow:
 *   1. Ask our server for a short lived ephemeral token.
 *   2. Open an RTCPeerConnection, attach the microphone, and play model audio.
 *   3. POST the SDP offer to OpenAI's /v1/realtime/calls with that token.
 *   4. Read events off the "oai-events" data channel to build a live
 *      transcript and track who is speaking.
 */
export function useRealtime() {
  const [state, setState] = useState<RealtimeState>(INITIAL_STATE);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  // Set synchronously at the very start of connect(), before any await, so a
  // second concurrent call cannot slip past the guard during the token fetch.
  const connectingRef = useRef(false);
  // True while a model response is generating. The realtime API rejects a
  // second response.create while one is active, so we queue instead.
  const responseActiveRef = useRef(false);
  const pendingResponseRef = useRef(false);

  const patch = useCallback((p: Partial<RealtimeState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  // Add text to the latest open turn for a speaker, or start a new one.
  // With mode "replace" the open turn's text is overwritten rather than
  // concatenated, which is what a "completed" event needs: it carries the full
  // authoritative transcript, so appending it onto accumulated deltas would
  // double the text.
  const appendToTurn = useCallback(
    (
      speaker: Speaker,
      text: string,
      opts?: { done?: boolean; mode?: "append" | "replace" },
    ) => {
      const clean = stripDashes(text);
      const mode = opts?.mode ?? "append";
      setState((s) => {
        const turns = [...s.transcript];
        const last = turns[turns.length - 1];
        if (last && last.speaker === speaker && !last.done) {
          turns[turns.length - 1] = {
            ...last,
            text: mode === "replace" ? clean : last.text + clean,
            done: opts?.done ?? last.done,
          };
        } else {
          turns.push({
            id: `${speaker}-${turns.length}-${clean.slice(0, 8)}`,
            speaker,
            text: clean,
            done: opts?.done ?? false,
          });
        }
        return { ...s, transcript: turns };
      });
    },
    [],
  );

  const closeTurn = useCallback((speaker: Speaker) => {
    setState((s) => {
      const turns = [...s.transcript];
      const last = turns[turns.length - 1];
      if (last && last.speaker === speaker && !last.done) {
        turns[turns.length - 1] = { ...last, done: true };
      }
      return { ...s, transcript: turns };
    });
  }, []);

  // Attach an artifact to the most recent assistant turn, or start a new
  // assistant turn to carry it if the last turn was the patient.
  const attachArtifact = useCallback((artifact: Artifact) => {
    setState((s) => {
      const turns = [...s.transcript];
      let idx = turns.length - 1;
      while (idx >= 0 && turns[idx].speaker !== "assistant") idx -= 1;
      if (idx >= 0) {
        const t = turns[idx];
        turns[idx] = { ...t, artifacts: [...(t.artifacts ?? []), artifact] };
      } else {
        turns.push({
          id: `assistant-art-${turns.length}`,
          speaker: "assistant",
          text: "",
          done: true,
          artifacts: [artifact],
        });
      }
      return { ...s, transcript: turns };
    });
  }, []);

  // Run a tool the voice model requested, render its artifact, and send the
  // result summary back to the model so it can speak about it.
  const runVoiceTool = useCallback(
    async (callId: string, name: string, rawArgs: string) => {
      let args: Record<string, unknown> = {};
      try {
        args = rawArgs ? JSON.parse(rawArgs) : {};
      } catch {
        args = {};
      }
      let output = "That tool could not be run.";
      try {
        const res = await fetch("/api/tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, args }),
        });
        const json = await res.json();
        if (res.ok) {
          // Give the model the structured result, not just a sentence, so it
          // can chain off real values (case ids, urgent medication, etc.) and
          // does not ask the patient to read them off the screen.
          output = json.summary ?? output;
          if (json.data) {
            output += `\n\nStructured result (use these exact values to continue, do not ask the patient for them):\n${JSON.stringify(json.data)}`;
          }
          if (json.artifact) attachArtifact(json.artifact as Artifact);
        } else {
          output = json.error ?? output;
        }
      } catch {
        // keep the fallback output
      }
      // Send the tool output back to the model. Only ask for a new response if
      // one is not already generating; otherwise queue it and let response.done
      // fire it, so we never hit "active response in progress".
      const dc = dcRef.current;
      if (dc && dc.readyState === "open") {
        dc.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output,
            },
          }),
        );
        if (responseActiveRef.current) {
          pendingResponseRef.current = true;
        } else {
          responseActiveRef.current = true;
          dc.send(JSON.stringify({ type: "response.create" }));
        }
      }
    },
    [attachArtifact],
  );

  const handleEvent = useCallback(
    (event: Record<string, unknown>) => {
      const type = event.type as string | undefined;
      if (!type) return;

      switch (type) {
        // Patient started / stopped speaking (server side VAD).
        case "input_audio_buffer.speech_started":
          patch({ userSpeaking: true });
          break;
        case "input_audio_buffer.speech_stopped":
          patch({ userSpeaking: false });
          break;

        // Live transcription of what the patient said.
        case "conversation.item.input_audio_transcription.delta":
          if (typeof event.delta === "string")
            appendToTurn("user", event.delta);
          break;
        case "conversation.item.input_audio_transcription.completed":
          // The completed event carries the full final transcript. Replace the
          // accumulated deltas with it rather than appending, to avoid doubling.
          if (typeof event.transcript === "string")
            appendToTurn("user", event.transcript, {
              done: true,
              mode: "replace",
            });
          else closeTurn("user");
          break;

        // The assistant's spoken reply, transcribed as it talks.
        case "response.output_audio_transcript.delta":
        case "response.audio_transcript.delta":
          if (typeof event.delta === "string") {
            patch({ assistantSpeaking: true });
            appendToTurn("assistant", event.delta);
          }
          break;
        case "response.output_audio_transcript.done":
        case "response.audio_transcript.done":
          closeTurn("assistant");
          break;

        case "response.created":
          responseActiveRef.current = true;
          break;

        case "response.done": {
          patch({ assistantSpeaking: false });
          closeTurn("assistant");
          responseActiveRef.current = false;
          // If a tool result arrived mid response, ask for the follow up now.
          if (pendingResponseRef.current) {
            pendingResponseRef.current = false;
            const dc = dcRef.current;
            if (dc && dc.readyState === "open") {
              responseActiveRef.current = true;
              dc.send(JSON.stringify({ type: "response.create" }));
            }
          }
          break;
        }

        // The model asked to call a tool. Run it, render the artifact, and
        // send the result back so the model can speak about it.
        case "response.function_call_arguments.done": {
          const callId = event.call_id as string | undefined;
          const name = event.name as string | undefined;
          const args = (event.arguments as string | undefined) ?? "";
          if (callId && name) void runVoiceTool(callId, name, args);
          break;
        }

        case "error": {
          const err = event.error as { message?: string } | undefined;
          patch({ error: err?.message ?? "The voice session hit an error." });
          break;
        }
      }
    },
    [appendToTurn, closeTurn, patch, runVoiceTool],
  );

  const disconnect = useCallback(() => {
    connectingRef.current = false;
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    setState((s) => ({
      ...INITIAL_STATE,
      // keep the transcript visible after hanging up
      transcript: s.transcript,
      status: "idle",
    }));
  }, []);

  const connect = useCallback(async (patientId?: string) => {
    if (pcRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setState({ ...INITIAL_STATE, status: "connecting" });

    try {
      // 1. Get an ephemeral token from our server, scoped to the patient.
      const tokenRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.error ?? "Could not start a voice session.");
      }
      const { token, model } = tokenData as { token: string; model: string };

      // 2. Peer connection + audio playback element.
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      // 3. Microphone capture.
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = mic;
      mic.getTracks().forEach((track) => pc.addTrack(track, mic));

      // 4. Data channel for realtime events.
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.addEventListener("message", (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          // ignore non JSON frames
        }
      });

      pc.addEventListener("connectionstatechange", () => {
        const cs = pc.connectionState;
        if (cs === "connected") patch({ status: "connected" });
        if (cs === "failed" || cs === "disconnected")
          patch({ status: "error", error: "The voice connection dropped." });
      });

      // 5. SDP exchange with OpenAI using the ephemeral token.
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/sdp",
          },
        },
      );

      if (!sdpRes.ok) {
        throw new Error("OpenAI rejected the voice connection.");
      }

      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);
      connectingRef.current = false;
    } catch (err) {
      console.error(err);
      patch({
        status: "error",
        error:
          err instanceof Error ? err.message : "Could not start a voice session.",
      });
      disconnect();
      setState((s) => ({
        ...s,
        status: "error",
        error:
          err instanceof Error
            ? err.message
            : "Could not start a voice session.",
      }));
    }
  }, [disconnect, handleEvent, patch]);

  const toggleMute = useCallback(() => {
    setState((s) => {
      const next = !s.muted;
      micStreamRef.current
        ?.getAudioTracks()
        .forEach((t) => (t.enabled = !next));
      return { ...s, muted: next };
    });
  }, []);

  return { ...state, connect, disconnect, toggleMute };
}
