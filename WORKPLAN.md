# RxBridge Work Plan, Two Agent Split

This document divides the remaining build between two agents working in
parallel:

- **Agent A, Claude** (interface, rendering, artifact runtime, tool plumbing)
- **Agent B, ChatGPT** (deterministic rescue services, data backend, case store)

The split is drawn so the two agents almost never touch the same file. The
contract between them is the **typed artifact and tool definitions** in
`lib/artifacts.ts` and `lib/tools.ts`. Once those types are agreed, each agent
builds against the types, not against the other agent's code.

> Hard rule for both agents: **this is additive, not a rewrite.** Everything
> that exists today keeps working. The chat and voice interface is the product.
> We are making that one interface richer, not replacing it or splitting it.

---

## 1. The core idea (read this first)

The product is a **rich, conversational interface**, exactly like Claude or
ChatGPT, where the assistant does not only talk. It renders **interactive
artifacts inline in the same chat and voice thread**:

- charts the patient can hover, toggle, and read (refill timeline, days of
  supply, A1C trend, blood pressure trend)
- interactive cards and widgets (medication cards, a rescue status tracker with
  live steps, a substitution comparison, a final rescue packet)
- action controls embedded in the conversation (Start Rescue, Authorize
  candidate, Confirm pharmacy fill) that drive the deterministic workflow and
  update the rendered artifact in place

Both input modes feed the **same** thread and the **same** artifact renderer:

- **Text mode**: the assistant streams text, and may attach one or more
  artifacts to a message.
- **Voice mode**: the assistant speaks, and the same artifacts appear in the
  thread next to the spoken turn (the patient hears the summary and sees the
  chart at the same time).

So an artifact is just structured data attached to an assistant turn. The
interface knows how to render each artifact type. This is the keystone: get the
artifact contract right and everything else composes.

---

## 2. What already exists (do not delete, build on top)

These are done and must keep working. Treat them as the foundation.

| Area | File(s) | Status |
|---|---|---|
| 3 pane chat + voice UI | `app/page.tsx` | keep, extend to render artifacts |
| Voice over WebRTC | `lib/use-realtime.ts`, `app/api/realtime-session/route.ts` | keep |
| Text chat streaming | `lib/use-text-chat.ts`, `app/api/chat/route.ts` | keep, extend for artifacts |
| Right rail medical data | `components/HealthAlerts.tsx` | keep, becomes one artifact host |
| Patient + meds + history data | `lib/patient-data.ts` | keep, extend with rescue types |
| Grok realtime news subagent | `lib/xai.ts`, `app/api/health-alerts/route.ts` | keep |
| System prompt | `lib/system-prompt.ts` | keep, extend with tool and artifact rules |
| Safety, no dash rule | `lib/sanitize.ts`, prompt | keep |
| Request guard | `lib/request-guard.ts` | keep, reuse on new routes |

Stack: Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, OpenAI
(`gpt-5.5` text, `gpt-realtime-2` voice), xAI Grok (`grok-4.3`) for news.

---

## 3. New dependency decision

**Charts: use `recharts`.** It is the default React charting library for 2026,
SVG based so it works with the App Router and server rendering, matches React's
component model, and has the largest ecosystem. Canvas libraries (Chart.js) and
low level kits (visx) are heavier than we need for a handful of clean medical
charts.

- React 19 caveat: Recharts needs the `react-is` version pinned to match React
  19. Add this to `package.json` so installs are deterministic:

  ```json
  "overrides": { "react-is": "^19.0.0" }
  ```

- Render every chart inside a client component, lazy loaded with
  `next/dynamic` and `{ ssr: false }`, so it never blocks server rendering.

No other new dependency is needed. Everything else uses the standard library,
React, and what is already installed.

---

## 4. The contract between the two agents

Two new files define the seam. **Agent A owns both files** and writes the types
first, then publishes them in this doc and in a short Slack or comment so Agent
B can build against them immediately. After that, A implements the renderers and
B implements the producers, in parallel.

### 4a. `lib/artifacts.ts` (Agent A writes the types)

An artifact is structured data attached to an assistant turn. The renderer
switches on `type`.

```ts
export type ArtifactType =
  | "chart"
  | "medication_list"
  | "rescue_tracker"
  | "substitution_compare"
  | "rescue_packet"
  | "action_buttons";

export interface BaseArtifact {
  id: string;
  type: ArtifactType;
  title?: string;
}

// Generic chart artifact, rendered with Recharts.
export interface ChartArtifact extends BaseArtifact {
  type: "chart";
  chartKind: "line" | "bar" | "area";
  // X axis key plus one or more numeric series.
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: Array<{ key: string; label: string; color?: string; unit?: string }>;
  // Optional reference markers, for example a target A1C band.
  referenceLines?: Array<{ axis: "x" | "y"; value: number | string; label?: string }>;
}

export interface MedicationListArtifact extends BaseArtifact {
  type: "medication_list";
  // Reuse MedicationRefillView shape from the alerts route.
  medications: MedicationRefillView[];
}

export interface RescueTrackerArtifact extends BaseArtifact {
  type: "rescue_tracker";
  caseId: string;
  status: RescueStatus;               // from section 5
  steps: Array<{ key: string; label: string; state: "done" | "active" | "pending" | "failed" }>;
}

export interface SubstitutionCompareArtifact extends BaseArtifact {
  type: "substitution_compare";
  original: SubstitutionCandidate;    // from section 5
  candidates: SubstitutionCandidate[];
}

export interface RescuePacketArtifact extends BaseArtifact {
  type: "rescue_packet";
  packet: RescuePacket;               // from section 5
}

// Buttons the assistant can place in the thread to drive the workflow.
export interface ActionButtonsArtifact extends BaseArtifact {
  type: "action_buttons";
  caseId: string;
  actions: Array<{ label: string; action: "start_rescue" | "authorize" | "confirm_fill"; candidateId?: string }>;
}

export type Artifact =
  | ChartArtifact
  | MedicationListArtifact
  | RescueTrackerArtifact
  | SubstitutionCompareArtifact
  | RescuePacketArtifact
  | ActionButtonsArtifact;
```

The shared message turn gains an optional `artifacts` field, added without
breaking the existing shape:

```ts
// Extend TranscriptTurn (lib/use-realtime.ts) additively.
export interface TranscriptTurn {
  id: string;
  speaker: "user" | "assistant";
  text: string;
  done: boolean;
  artifacts?: Artifact[];   // NEW, optional, so existing code is unaffected
}
```

### 4b. `lib/tools.ts` (Agent A writes the tool schemas, Agent B implements handlers)

The assistant produces artifacts by calling tools. The text route and the voice
session both expose the same tool list. Each tool name maps to a deterministic
handler that Agent B implements. Tools return JSON that the route turns into an
`Artifact`.

```ts
export const TOOL_DEFINITIONS = [
  { name: "get_medications",        description: "List the patient's medications with refill timing." },
  { name: "get_med_trend",          description: "Return a time series for a lab or vital, for charting (A1C, blood pressure, days of supply)." },
  { name: "start_rescue",           description: "Start a prescription rescue case for an unfillable medication." },
  { name: "get_rescue_case",        description: "Return current rescue case state for the tracker artifact." },
  { name: "authorize_candidate",    description: "Simulate prescriber authorization of a candidate alternative." },
  { name: "confirm_pharmacy_fill",  description: "Simulate pharmacy confirmation of the authorized alternative." },
  { name: "get_rescue_packet",      description: "Return the final rescue packet for the patient." },
] as const;
```

Tool call flow (so both agents picture the same path):

```
patient asks -> model decides to call a tool
  -> route runs Agent B's deterministic handler
  -> handler returns structured JSON
  -> route wraps JSON as an Artifact and attaches it to the assistant turn
  -> Agent A's renderer draws it inline in chat or voice
```

The model never invents chart numbers or rescue state. It only calls tools and
explains the structured result in plain English. This keeps the safety model
intact (coordination, not clinical authority).

---

## 5. Data models (Agent B owns these, in `lib/rescue-types.ts`)

These extend, they do not replace, the existing `lib/patient-data.ts` types
(`Patient`, `Medication`, `MedicalHistoryItem`, `MedicationShortage`). Reuse
those wherever possible.

```ts
export type RescueStatus =
  | "case_created"
  | "checking_shortage"
  | "checking_original_stock"
  | "original_unavailable"
  | "finding_substitutes"
  | "awaiting_prescriber_authorization"
  | "prescriber_approved"
  | "prescriber_rejected"
  | "confirming_pharmacy_stock"
  | "alternative_reserved"
  | "patient_notified"
  | "failed_no_safe_option";

export interface ShortageStatus {
  ingredient: string;
  inShortage: boolean;
  severity: "info" | "watch" | "act_now";
  summary: string;
  source: string;
}

export interface PharmacyStockQuote {
  pharmacyName: string;
  distanceMiles: number;
  medication: string;
  inStock: boolean;
}

export interface SubstitutionCandidate {
  id: string;
  medication: string;
  ingredient: string;
  strength: string;
  form: string;
  rationale: string;
  requiresPrescriberApproval: true;     // always true before approval
  safetyFlags: string[];                // from safety screen
}

export interface Authorization {
  prescriberName: string;
  approved: boolean;
  approvedAt?: string;
  note?: string;
}

export interface FillConfirmation {
  pharmacyName: string;
  confirmed: boolean;
  confirmedAt?: string;
}

export interface RescueTimelineItem {
  at: string;
  status: RescueStatus;
  message: string;
}

export interface RescueCase {
  id: string;
  patientId: string;                     // links to Patient in patient-data.ts
  prescription: { medication: string; ingredient: string; strength: string };
  shortage: ShortageStatus | null;
  pharmacyQuotes: PharmacyStockQuote[];
  substitutionCandidates: SubstitutionCandidate[];
  selectedCandidateId?: string;
  authorization?: Authorization;
  fillConfirmation?: FillConfirmation;
  status: RescueStatus;
  timeline: RescueTimelineItem[];
}

// Time series used by get_med_trend, feeds ChartArtifact.
export interface MedTrendPoint { date: string; value: number; }
export interface MedTrend {
  metric: "a1c" | "blood_pressure_systolic" | "days_supply" | string;
  label: string;
  unit: string;
  points: MedTrendPoint[];
  target?: { min?: number; max?: number; label?: string };
}
```

---

## 6. Where the data comes from

| Data | Source for the demo | Future source |
|---|---|---|
| Patient profile, medications, history | `lib/patient-data.ts` synthetic fixtures (Ayush Ojha, Marcus L.) | authenticated EHR or pharmacy API |
| Lab and vital trends (A1C, BP, days of supply) | new synthetic series in `lib/patient-data.ts` or a `lib/trends.ts` fixture | EHR observations |
| Shortage status | `shortage.ts` synthetic result, optional live openFDA when `USE_LIVE_OPENFDA=true` | openFDA, ASHP |
| Realtime outbreak and shortage news | existing `lib/xai.ts` Grok search, already live | same |
| Pharmacy stock | `pharmacy.ts` mock pharmacies | pharmacy inventory API |
| Substitution candidates | `substitution.ts` curated synthetic map | clinical substitution service |
| Rescue case state | in memory `lib/case-store.ts`, keyed by caseId | durable store, Inngest |

All synthetic. No real PHI. All model and provider calls stay server side. No
key is ever exposed with `NEXT_PUBLIC_`.

---

## 7. Task split

### Agent A, Claude (interface, rendering, runtime)

A1. Write `lib/artifacts.ts` and `lib/tools.ts` (the shared contract). Publish
the types first so Agent B can start. **This unblocks B, do it first.**

A2. Add `recharts` plus the `react-is` override to `package.json`.

A3. Build the artifact renderer:
- `components/artifacts/ArtifactRenderer.tsx` switches on `Artifact.type`.
- `components/artifacts/ChartArtifact.tsx` (Recharts, lazy, ssr false).
- `components/artifacts/MedicationListArtifact.tsx`.
- `components/artifacts/RescueTracker.tsx` (the live step list).
- `components/artifacts/SubstitutionCompare.tsx`.
- `components/artifacts/RescuePacket.tsx`.
- `components/artifacts/ActionButtons.tsx` (calls the rescue routes, then
  refreshes the tracker artifact in place).

A4. Render artifacts in the conversation. In `app/page.tsx`, under each
assistant turn, render `turn.artifacts` via `ArtifactRenderer`. Same rendering
path for text and voice turns. Do not change the existing layout, add to it.

A5. Extend `TranscriptTurn` with the optional `artifacts` field and thread it
through `lib/use-text-chat.ts` and `lib/use-realtime.ts` without breaking the
current text or voice flow.

A6. Wire tool results into turns:
- Text: extend `app/api/chat/route.ts` to support tool calls, attach returned
  artifacts to the streamed assistant message.
- Voice: handle tool call events on the realtime data channel and attach the
  resulting artifact to the matching voice turn.

A7. Extend `lib/system-prompt.ts` with the rescue coordinator rules from the
spec (call every option a candidate alternative until approval, never invent
alternatives or doses, one clear next step) and instructions to use tools and
artifacts rather than describing data in prose.

A8. Validation for A: typecheck, build, and a manual pass where a text question
and a voice question each render a chart and the rescue tracker without removing
any existing behavior.

### Agent B, ChatGPT (deterministic services, data, case store)

B1. `lib/rescue-types.ts`: the data models in section 5.

B2. `lib/case-store.ts`: in memory case store keyed by caseId, create, get,
update, append timeline. Module level Map, reset safe.

B3. Deterministic services, each pure and synthetic:
- `lib/services/shortage.ts`: synthetic shortage result, optional openFDA when
  `USE_LIVE_OPENFDA=true`.
- `lib/services/pharmacy.ts`: mock pharmacies, original unavailable everywhere,
  alternative available at one.
- `lib/services/substitution.ts`: curated synthetic map, same ingredient
  different strength, always `requiresPrescriberApproval: true`.
- `lib/services/safety.ts`: reject on allergy match, reject on unsafe route or
  form mismatch, mark therapeutic swaps as clinician review required.
- `lib/services/packet.ts`: build the final `RescuePacket` from case state.

B4. Trend fixtures: synthetic A1C, blood pressure, and days of supply series in
`lib/trends.ts` (or extend `patient-data.ts`), shaped as `MedTrend` so the chart
artifact can render them. Use the existing patients (Ayush, Marcus).

B5. Rescue API routes (server only, reuse `guardRequest`):
- `POST /api/rescue/start`
- `GET  /api/cases?caseId=...`
- `POST /api/rescue/authorize`
- `POST /api/rescue/confirm-fill`
Each drives the deterministic workflow and returns updated `RescueCase` state.

B6. Tool handlers: implement the handler for each tool in `TOOL_DEFINITIONS`
(section 4b). Input validated, output is the structured JSON the route wraps as
an artifact. `get_med_trend` returns a `MedTrend`. `get_rescue_case` returns the
tracker shape. These are plain server functions A calls from the routes.

B7. Keep openFDA optional and behind the `USE_LIVE_OPENFDA` flag, default false,
so the demo never depends on a live call.

B8. Validation for B: a small script or route test that runs a full case
start -> shortage -> stock -> candidate -> authorize -> confirm -> packet and
prints the final state, proving the workflow and safety screen behave.

---

## 8. Interface boundary, who touches what

To avoid merge conflicts:

- **Agent A only** edits: `app/page.tsx`, `lib/use-text-chat.ts`,
  `lib/use-realtime.ts`, `lib/system-prompt.ts`, `app/api/chat/route.ts`,
  `app/api/realtime-session/route.ts`, everything under `components/artifacts/`,
  `lib/artifacts.ts`, `lib/tools.ts`, `package.json`.
- **Agent B only** edits: `lib/rescue-types.ts`, `lib/case-store.ts`, everything
  under `lib/services/`, `lib/trends.ts`, the new `app/api/rescue/*` and
  `app/api/cases` routes, the tool handler implementations.
- **Shared, change by agreement only**: `lib/patient-data.ts` (B may add trend
  data and rescue fixtures, A reads them). Coordinate before editing.

The seam is the types in `lib/artifacts.ts`, `lib/tools.ts`, and
`lib/rescue-types.ts`. Agree on those, then build in parallel.

---

## 9. Definition of done

- Existing text chat, voice chat, right rail, and Grok alerts all still work,
  nothing removed.
- The patient can ask a question and see an interactive chart rendered inline in
  the chat thread, and the same artifact shows for a voice turn.
- The full rescue workflow runs from the conversation: start rescue, see the
  live tracker, see candidate alternatives, simulate prescriber authorization,
  simulate pharmacy confirmation, and see the final rescue packet, all as
  interactive artifacts in the interface.
- The assistant only renders data returned by deterministic tools, never invents
  alternatives, doses, chart values, or rescue state.
- Typecheck and production build are clean. No em dash or en dash in source.
  Keys stay server side.
```
