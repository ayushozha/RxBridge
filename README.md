<div align="center">

# 💊 RxBridge

### A conversational healthcare assistant. Patients type or talk in one interface, see their medications and refill timing, and get realtime alerts about shortages and outbreaks.

![Status](https://img.shields.io/badge/status-scaffold%20complete-1f7ae0)
![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![OpenAI](https://img.shields.io/badge/OpenAI-chat%20%2B%20realtime%20voice-412991?logo=openai)
![xAI](https://img.shields.io/badge/xAI-grok%204.3%20realtime%20news-000000?logo=x)
![License](https://img.shields.io/badge/license-none%20checked%20in-lightgrey)

**Text and voice in one interface · three pane workspace · proactive health alerts · patient safety guardrails · server side key**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Status at a Glance](#status-at-a-glance)
- [Screens](#screens)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Repository Map](#repository-map)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Safety and Privacy](#safety-and-privacy)
- [Verification](#verification)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

RxBridge is a conversational healthcare assistant with a three pane workspace:

- **Left**: the conversation history, every question the patient has asked.
- **Center**: the chat, with a Text and Voice switch. In text mode the patient
  types and the reply streams back. In voice mode the patient talks and hears a
  spoken answer in real time over WebRTC. Both modes share one conversation.
- **Right**: the patient's medical data, their medications with refill timing,
  and realtime alerts matched to those medications.

Text replies stream from an OpenAI chat model; voice uses the OpenAI Realtime
speech to speech model over WebRTC. Both share one conservative, patient facing
system prompt: it greets the patient by name, explains health topics in plain
language, never diagnoses or prescribes, and escalates anything that sounds like
an emergency to "call your local emergency number." The prompt also instructs
the model to never use em dash or en dash characters, and the client strips
those characters as a second guard.

The OpenAI key lives **only on the server**. The browser never receives it.
Instead, the server mints a short lived ephemeral token, and the browser uses
that token to open a direct WebRTC connection to OpenAI for the audio stream.

### Proactive health alerts

The app also runs a realtime news subagent. It uses **xAI Grok** (model
`grok-4.3`), which is strong at current events, to search live news and official
sources (the FDA and ASHP drug shortage lists, health agencies, pharmacy
notices) for drug shortages, recalls, disease outbreaks, and supply chain or
weather disruptions. It matches what it finds against the patient's medication
list and refill dates, then tells the patient what to do, for example refill
early, ask the pharmacist about alternatives, or get vaccinated. Refill timing
is computed locally from the patient's own data, never from the model, so the
"are you stocked up" guidance stays accurate. Every alert carries source
citations, and when nothing relevant is happening it says so rather than
inventing a scare.

## Status at a Glance

| Area | State |
|------|-------|
| Text chat (streaming) and voice in one interface | ✅ Implemented |
| Voice in, voice out over WebRTC | ✅ Implemented |
| Three pane layout (history, chat, medical data) | ✅ Implemented |
| Ephemeral token minting (server side key) | ✅ Implemented |
| Shared conversation across text and voice | ✅ Implemented |
| Speaking / listening status, mute, end call | ✅ Implemented |
| Proactive health alerts via Grok realtime news | ✅ Implemented |
| Medication refill urgency from patient data | ✅ Implemented (computed locally) |
| Same origin check and rate limit on paid routes | ✅ Implemented |
| Patient safety system prompt | ✅ Implemented |
| No em dash or en dash in output | ✅ Enforced (prompt + client sanitizer) |
| Light and dark mode | ✅ Implemented (follows OS) |
| Patient data source | 🧪 Sample data (swap for a real, authenticated EHR or pharmacy lookup) |
| Auth / accounts | ⛔ Not in scope (single anonymous session) |
| Conversation persistence | ⛔ Not in scope (in memory per tab) |

## Screens

A three pane workspace: conversation history on the left, the chat with a Text
and Voice switch in the center, and the patient's medical data on the right.

```
┌──────────────┬───────────────────────────┬──────────────────┐
│ RxBridge                                                      │
├──────────────┼───────────────────────────┼──────────────────┤
│ History      │        [ Text | Voice ]   │ Your medical data│
│              │                           │                  │
│ headache?    │  Welcome Ayush, I am your │ Metformin   soon │
│ refill meds  │  personal healthcare      │ Lisinopril   ok  │
│ flu vs cold  │  assistant.               │ Albuterol  now   │
│              │                           │                  │
│              │  🧑 What helps a headache? │ Alerts + sources │
│              │  Rx A few simple things.. │                  │
│              │                           │                  │
│              │  [ Type a message…  Send ]│                  │
└──────────────┴───────────────────────────┴──────────────────┘
```

> Run the app and allow microphone access to use the live voice UI.

## Quick Start

> Prerequisites: **Node.js 18.18+** (Node 20+ recommended) and an OpenAI API
> key. Text chat works with any key. For voice mode you also need Realtime
> access and a browser with microphone permission, on `http://localhost` or
> HTTPS, since microphone capture requires a secure context. For the alerts
> rail you also need an xAI key.

```bash
# 1. Install dependencies
npm install

# 2. Add your OpenAI key
#    (a .env.local with a key is already included in this scaffold;
#     to use your own, copy the example and edit it)
cp .env.example .env.local      # macOS / Linux
#   on Windows PowerShell:  Copy-Item .env.example .env.local
# then open .env.local and set OPENAI_API_KEY=sk-...

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>. Type a message to chat, or switch to Voice, tap
the mic, allow mic access, and start talking.

## Configuration

All configuration is via environment variables in `.env.local` (git ignored).

| Variable | Required | Default | Effect |
|----------|----------|---------|--------|
| `OPENAI_API_KEY` | **Yes** | none | Your OpenAI secret key. Server side only. The routes return a clear 500 if it is missing. |
| `OPENAI_CHAT_MODEL` | No | `gpt-5.5` | Model for the typed text chat mode. |
| `OPENAI_REALTIME_MODEL` | No | `gpt-realtime-2` | Realtime speech to speech model for voice mode. Set to a lighter variant for lower cost. |
| `OPENAI_REALTIME_VOICE` | No | `marin` | The assistant's voice. |
| `XAI_API_KEY` | For alerts | none | Your xAI / Grok key, used server side for the realtime news subagent. Without it, the alerts panel degrades to refill timing only. |
| `XAI_MODEL` | No | `grok-4.3` | Grok model for the news subagent. |

> Never prefix a key with `NEXT_PUBLIC_`. That would ship it to the browser.

## Repository Map

| Path | Role |
|------|------|
| `app/page.tsx` | The three pane UI (client component): history, chat with Text and Voice switch, medical data rail. |
| `app/layout.tsx` | Root layout, metadata, fonts, global CSS import. |
| `app/globals.css` | Tailwind v4 entry, theme tokens, animations. |
| `components/HealthAlerts.tsx` | The medical data rail (client component): medications, refill status, news alerts, sources. |
| `app/api/chat/route.ts` | Server route. Streams the typed text chat reply. Holds the OpenAI key. |
| `app/api/realtime-session/route.ts` | Server route. Mints an ephemeral Realtime token for voice. Holds the OpenAI key. |
| `app/api/health-alerts/route.ts` | Server route. The news subagent: searches via Grok, merges in local refill timing. |
| `lib/use-realtime.ts` | The voice WebRTC hook: connection lifecycle, mic, audio playback, events, transcript, mute. |
| `lib/use-text-chat.ts` | The text chat hook: streams replies from /api/chat into the shared conversation. |
| `lib/xai.ts` | Grok realtime news client. Calls the xAI Responses API with web search and structured output. |
| `lib/patient-data.ts` | Sample patient medication records and refill urgency logic. Swap for a real data source. |
| `lib/request-guard.ts` | Same origin check and in memory rate limit for the paid API routes. |
| `lib/system-prompt.ts` | The assistant's persona and safety rules, sent as session instructions. |
| `lib/sanitize.ts` | Strips em dash and en dash characters from transcript text. |
| `.env.local` | Secrets (git ignored). Loaded automatically by Next.js on the server. |
| `.env.example` | Template for the env file. |

## Architecture

```
   Browser (app/page.tsx + lib/use-realtime.ts)
        │  1. POST /api/realtime-session  (ask for a token)
        ▼
   Next.js Route (app/api/realtime-session/route.ts)   ← OPENAI_API_KEY lives here
        │  POST /v1/realtime/client_secrets  (mint ephemeral token)
        ▼
   OpenAI  ──▶ returns short lived token ──▶ back to the browser
        │
   Browser  2. RTCPeerConnection: mic track out, model audio in,
            "oai-events" data channel for transcript and status
        │  3. POST SDP offer to /v1/realtime/calls with the ephemeral token
        ▼
   OpenAI gpt realtime 2  ◀── live audio both directions ──▶  speakers + transcript
```

- **Frontend**: React 19 + Next.js 15 App Router. The `useRealtime` hook owns
  the `RTCPeerConnection`, microphone, audio playback element, and the
  `oai-events` data channel. It converts realtime events into a transcript and
  speaking / listening flags.
- **Token server**: A single Next.js route calls
  `/v1/realtime/client_secrets` with the secret key and returns only the
  ephemeral token. The browser uses that token to connect directly to OpenAI,
  so audio never round trips through this server.
- **Key isolation**: The secret key is read from `process.env` on the server.
  It is never imported into a client component or sent to the browser.

The proactive alerts use a separate, simpler flow:

```
   Browser (components/HealthAlerts.tsx)
        │  POST /api/health-alerts { patientId }
        ▼
   Next.js Route (app/api/health-alerts/route.ts)   ← XAI_API_KEY lives here
        ├─ reads the patient's meds + refill dates (lib/patient-data.ts)
        ├─ computes refill urgency locally (never from the model)
        └─ asks Grok to search live news (lib/xai.ts)
                 │  POST https://api.x.ai/v1/responses
                 │  tools: [web_search], structured json_schema output
                 ▼
           xAI Grok 4.3  ──▶ structured alerts + source citations
        ▼
   Browser renders refill status, news alerts, and sources
```

- **News subagent**: `lib/xai.ts` calls the xAI Responses API with the
  `web_search` tool and a strict JSON schema, so Grok searches current sources
  and returns structured, cited alerts.
- **Grounded refill timing**: urgency comes from the patient's own supply and
  refill date, computed in `lib/patient-data.ts`, so the model cannot get it
  wrong.
- **Graceful degradation**: if the news call fails or `XAI_API_KEY` is unset,
  the route still returns the refill view with a clear note.

## How It Works

1. The patient taps the orb. The hook asks the server for an ephemeral token.
2. The browser opens a peer connection, attaches the microphone, and prepares
   an audio element for playback.
3. It POSTs its SDP offer to OpenAI's `/v1/realtime/calls` with the ephemeral
   token and sets the returned answer.
4. Audio flows both ways. The data channel delivers transcription deltas and
   turn detection events, which the UI renders as a live transcript with
   speaking and listening status.
5. The patient can mute the mic or end the call at any time.

## Safety and Privacy

- **Not medical advice.** The system prompt forbids diagnosis, prescriptions,
  and invented facts, and requires emergency guidance for red flag symptoms. A
  persistent disclaimer sits under the orb.
- **No data persistence.** The transcript lives only in browser memory for the
  current tab. Nothing is written to disk or a database by this scaffold.
- **Key safety.** `OPENAI_API_KEY` is server only and git ignored. The browser
  only ever holds a short lived ephemeral token. Rotate the secret key if it is
  ever committed or shared.
- **Compliance.** Audio is processed by OpenAI under its data usage policies.
  Review them before handling real patient data, and do not use this scaffold
  for protected health information without a BAA and appropriate compliance
  review.

## Verification

```bash
npm run typecheck   # TypeScript: no type errors
npm run build       # Next.js production build compiles
npm run dev         # Manual: tap orb, allow mic, hear a spoken answer
```

## Contributing

Invariants to preserve when extending this project:

- The OpenAI secret key stays server side. The browser only ever gets an
  ephemeral token. Never reference `OPENAI_API_KEY` from a client component or
  prefix it with `NEXT_PUBLIC_`.
- Keep the safety guardrails in `lib/system-prompt.ts`. Emergency escalation
  and the "not a doctor" framing are load bearing, not decoration.
- Do not use em dash or en dash characters anywhere in source or output. The
  prompt forbids them and `lib/sanitize.ts` strips them from the transcript.
- The disclaimer under the orb must remain visible.

## License

No license file is currently checked in. Add one (for example a `LICENSE` with
MIT) before distributing.
