# RxBridge Spec

## Product

**RxBridge** is a chat-first prescription rescue layer for drug shortages.

When a patient cannot fill a prescribed medication, RxBridge helps them move from:

> “My prescription is unavailable.”

To:

> “My prescriber authorized an available alternative and the pharmacy confirmed it can be filled.”

The user interface should feel like **ChatGPT / Claude**: a patient opens a clean chat window, asks what to do, and the system answers using **GPT-5.5** while a deterministic rescue workflow runs underneath.

---

## One-line pitch

**RxBridge brokers a prescriber-authorized, pharmacy-confirmed substitute when a patient’s medication cannot be filled.**

---

## Core thesis

Most medication shortage tools stop at “we could not find your medication.” RxBridge starts there.

The product is not a drug finder. It is a **multi-party coordination broker** between:

1. Patient
2. Prescriber
3. Pharmacy

The AI does not prescribe. The AI coordinates, explains, and prepares the handoff. The prescriber authorizes. The pharmacy confirms. The patient receives a clear rescue packet.

---

## Interface decision

The interface is a **ChatGPT / Claude-style chat application**.

### Main screen

- Center: chat thread
- Bottom: message composer
- Right rail: live rescue status panel
- Top: current case summary
- Optional left rail: synthetic case selector

### Patient can ask

- “My pharmacy said they cannot fill this. What now?”
- “Why can’t I just switch to another drug?”
- “What are you waiting for right now?”
- “Can you explain the alternative in plain English?”
- “What should I ask my doctor?”
- “What should I tell the pharmacy?”

### Assistant should answer

- In plain English
- With current workflow state
- Without giving independent prescribing advice
- With a clear next step
- Using deterministic case data when discussing substitution candidates

---

## MVP user journey

### 1. Patient opens chat

Initial assistant message:

> Hi, I’m RxBridge. I help when a prescription cannot be filled. I can check shortage status, look across pharmacies, prepare candidate alternatives for prescriber review, and coordinate the authorization handoff.

### 2. Patient starts rescue

Patient says:

> My pharmacy said my prescription is unavailable.

User clicks **Start Rescue** or the assistant guides them there.

### 3. Workflow runs

The right rail shows:

```txt
✅ Case created
✅ Shortage status checked
✅ Nearby pharmacy stock checked
❌ Original medication unavailable
✅ Candidate alternative found
⏳ Awaiting prescriber authorization
```

### 4. Prescriber authorization

For demo, a button simulates prescriber approval:

> Authorize candidate

Later, this can be replaced by Grok Voice or Twilio voice.

### 5. Pharmacy confirmation

For demo, a button simulates pharmacy confirmation:

> Confirm pharmacy fill

### 6. Patient receives rescue packet

Final state:

```txt
✅ Original prescription unavailable
✅ Alternative candidate found
✅ Prescriber authorized
✅ Pharmacy confirmed stock
✅ Patient rescue packet ready
```

---

## Non-goals

Do **not** build these for the hackathon MVP:

- Real prescribing
- Real pharmacy inventory integration
- Real EHR integration
- Real PHI ingestion
- Real drug-dose conversion beyond synthetic demo fixtures
- Autonomous medical substitution without prescriber approval
- Insurance coverage workflows
- Billing workflows
- Symptom checker
- Diagnosis assistant

---

## Safety model

### Core safety sentence

**The autonomous part is coordination, not clinical authority.**

### Rules

1. The model cannot choose the final substitute.
2. The model cannot tell the patient to take a medication without prescriber approval.
3. The model can only discuss candidates already returned by deterministic substitution logic.
4. The model must say “candidate alternative” until prescriber approval is recorded.
5. The model should recommend contacting a licensed clinician/pharmacist for patient-specific medical decisions.
6. The demo must use synthetic data only.
7. Do not store real PHI.
8. Do not put API keys in client code.

---

## System architecture

```txt
Patient Chat UI
    ↓
Next.js API routes
    ↓
GPT-5.5 response layer
    ↓
Deterministic RxBridge services
    ├── shortage service
    ├── pharmacy stock service
    ├── substitution rules engine
    ├── safety screen
    ├── authorization state
    └── rescue packet generator
    ↓
Workflow state shown in UI
```

---

## Technology stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router |
| UI | Plain CSS, ChatGPT-style layout |
| Chat model | OpenAI Responses API with `gpt-5.5` |
| Workflow | In-memory MVP state, Inngest-ready scaffold |
| Data | Synthetic demo fixtures |
| Deployment | Vercel |
| Future voice | Grok Voice / Twilio handoff |

---

## Environment variables

Create `.env.local` from `.env.example`.

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.5
USE_LIVE_OPENFDA=false
```

Important:

- Never commit `.env.local`.
- Never expose the OpenAI key with `NEXT_PUBLIC_`.
- The OpenAI call must happen only on the server in `/app/api/chat/route.ts`.

---

## Data model

### RescueCase

```ts
export type RescueCase = {
  id: string;
  patient: PatientProfile;
  prescription: Prescription;
  shortage: ShortageStatus | null;
  pharmacyQuotes: PharmacyStockQuote[];
  substitutionCandidates: SubstitutionCandidate[];
  selectedCandidateId?: string;
  authorization?: Authorization;
  fillConfirmation?: FillConfirmation;
  status: RescueStatus;
  timeline: RescueTimelineItem[];
};
```

### RescueStatus

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
```

---

## Deterministic services

### `shortage.ts`

Checks shortage status.

MVP behavior:

- Return synthetic shortage result.
- Optionally call openFDA later if `USE_LIVE_OPENFDA=true`.

### `pharmacy.ts`

Checks local stock.

MVP behavior:

- Use mock pharmacies.
- Original medication unavailable at all pharmacies.
- Alternative candidate available at one pharmacy.

### `substitution.ts`

Finds candidate alternatives.

MVP behavior:

- Use curated synthetic substitution map.
- Return same-ingredient, different-strength candidate.
- Mark as requiring prescriber approval.

### `safety.ts`

Screens candidate alternatives.

MVP behavior:

- Reject if allergy flag matches.
- Reject if route/form mismatch is unsafe.
- Mark anything therapeutic as “clinician review required.”

### `packet.ts`

Generates final patient rescue packet from structured state.

---

## GPT-5.5 chat behavior

The GPT layer should:

- Answer patient questions in conversational language.
- Explain current workflow status.
- Explain why prescriber approval is required.
- Draft scripts for calling a prescriber or pharmacy.
- Summarize the rescue packet.
- Avoid independent medication decisions.

The GPT layer should **not**:

- Invent alternatives.
- Invent dose conversions.
- Tell the patient to start/stop medication.
- Claim the substitute is safe unless approved by prescriber and confirmed by pharmacist.

---

## Prompting contract

The system prompt should include:

```txt
You are RxBridge, a prescription rescue coordinator for a synthetic hackathon demo.
You are not a doctor and do not prescribe.
You help patients understand shortage workflows and coordinate with clinicians and pharmacies.
Only discuss substitution candidates from the structured case context.
Never invent a medication alternative, dose conversion, or safety claim.
Before prescriber approval, call every option a candidate alternative.
After prescriber approval and pharmacy confirmation, summarize the fill-ready plan.
Use plain English and give one clear next step.
```

---

## API routes

### `POST /api/chat`

Input:

```ts
{
  caseId: string;
  messages: { role: "user" | "assistant"; content: string }[];
}
```

Output:

```ts
{
  message: string;
}
```

### `GET /api/cases?caseId=demo-maya`

Returns current case state.

### `POST /api/rescue/start`

Starts the synthetic rescue workflow.

### `POST /api/rescue/authorize`

Simulates prescriber authorization.

### `POST /api/rescue/confirm-fill`

Simulates pharmacy confirmation.

---

## Demo script

### Start

> “This patient has a prescription they cannot fill. Medication finders stop here. RxBridge starts here.”

### Run rescue

Show the system checking shortage status and pharmacy stock.

### Differentiation

> “We are not asking the AI to prescribe. We are asking it to coordinate the handoff between patient, prescriber, and pharmacy.”

### Approval handoff

Simulate prescriber approval.

### Pharmacy confirmation

Simulate pharmacy confirmation.

### End

> “The patient now has a prescriber-authorized, pharmacy-confirmed path to fill an available alternative.”

---

## Build order for Claude Code

1. Create the Next.js app scaffold.
2. Implement the ChatGPT-style interface.
3. Implement demo case data.
4. Implement in-memory case store.
5. Implement deterministic rescue workflow endpoints.
6. Implement `/api/chat` with GPT-5.5.
7. Add right-rail rescue status panel.
8. Add final rescue packet generation.
9. Polish UI for stage demo.
10. Optional: add Inngest function stub and Grok Voice integration points.

---

## Acceptance criteria

The app is demo-ready if:

- Patient can chat with RxBridge.
- GPT-5.5 answers patient questions from current case state.
- Patient can start a rescue workflow.
- UI shows shortage and stock-check progression.
- Original drug becomes unavailable.
- Candidate alternative appears.
- Prescriber authorization can be simulated.
- Pharmacy confirmation can be simulated.
- Final rescue packet appears.
- The assistant never claims to prescribe independently.

---

## Final tagline

**RxBridge: the prescription rescue layer for drug shortages.**
