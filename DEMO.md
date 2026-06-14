# RxBridge Demo Plan

## Dependable fallback: the /demo replay (use this if the live demo fails)

There is a recorded walkthrough at **/demo** (locally
`http://localhost:3000/demo`) that replays the entire flow with zero live API
calls, so it cannot fail on stage. It was captured from a real run, so the
text, the charts, the rescue tracker, the rescue packet, and the negotiation
call are all genuine, and the call plays its real captured audio (the OpenAI
agent voice is real audio; the Grok pharmacy voice uses the browser speech
fallback until the xAI audio scope is enabled).

How to use it:
- It auto plays. Use the Pause, Next, and Restart buttons in the top right to
  control pacing while you narrate.
- It needs no keys, no network, and no warm up, so it is the safe option if the
  live site is cold, rate limited, or offline.
- The data is baked into `lib/demo-script.ts`. To refresh it after changing the
  flow, run `node scripts/capture-demo.mjs` with the dev server running.

Use the live app for the real thing, and switch to /demo if anything hiccups.

---

## Step by step demo script (what to do on stage)

Run the live app at `http://localhost:3000`. Before you present, send one warm
up message so the first real reply is instant. Then follow these steps. Each
step says exactly what to type or click and what the audience will see.

### Step 0. Open and set the patient
- Open `http://localhost:3000`. The assistant greets the patient by name.
- In the right rail under "Patient", select **Marcus L.** The greeting, the
  medications, and the alerts all switch to Marcus. Marcus is the hero case: he
  has Ozempic, Adderall, levothyroxine and more, several only days from running
  out.

### Step 1. Show the medication picture (the setup)
- Type: **"Are my medications in order?"**
- The assistant replies in about a second and renders an interactive
  **medication list** inline: each medicine with its refill timing and an
  urgency badge (Refill now, Refill soon, On track). This shows the data is
  live and visual, not a wall of text.

### Step 2. Build a chart in realtime (the visualization)
- Type: **"Show me a chart of my days of supply over time."**
- A **line chart** renders inline, built live from Marcus's data, with one line
  per medication trending down toward zero. Point out the steepest line.

### Step 3. Explain the chart in realtime (the intelligence)
- Type: **"Can you explain the chart and what it means?"**
- A fast Grok model reads the actual values and explains them in plain language
  in a second or two ("this line started at 13 days and is down to 6, worth
  watching"). It is generated live, not canned.

### Step 4. The problem hits (the hook)
- Type: **"My pharmacy is out of my Ozempic and I only have a few days left."**
- The assistant acknowledges the shortage and offers to start a rescue. This is
  where other tools stop. RxBridge starts here.

### Step 5. Start the rescue (the core)
- Type: **"Start a rescue for my Ozempic."**
- A live **rescue tracker** renders and advances: case created, shortage
  checked, pharmacy stock checked, original unavailable, candidate alternative
  found, awaiting prescriber authorization. Every earlier step shows a check.

### Step 6. The two agent negotiation call (the differentiator)
- Type: **"Call the pharmacy and arrange it."**
- The **negotiation call widget** appears. Click **Place the call**. Two AI
  voices talk and haggle like real people:
  - the **RxBridge agent** voice is OpenAI Realtime 2.0 (gpt realtime 2 family),
  - the **pharmacy** voice is the latest Grok voice model.
  The script itself is generated live by Grok so the back and forth sounds
  human, with a pharmacist quoting a price, the agent pushing back, and a fair
  middle price agreed. A **live price ledger** updates as they speak, and it
  ends with the alternative reserved for same day pickup.

### Step 7. The payoff
- Type: **"Show me my rescue packet."**
- The **rescue packet** renders: the approved alternative, the pharmacy holding
  it, the agreed price, and what to say at pickup. Close with: a shortage left
  Marcus days from running out, and RxBridge found an alternative and called his
  pharmacy to arrange it, all in one conversation.

### Optional. Voice mode
- Switch the center toggle to **Voice**, tap the mic, and ask the same questions
  out loud. The live voice uses OpenAI Realtime 2.0, and the same charts,
  tracker, and call render next to the spoken answers.

> Models in use: text chat and the realtime chart explanation run on Grok fast
> (`grok-4.20-0309-non-reasoning`) for instant replies. The live patient voice
> uses OpenAI Realtime 2.0 (`gpt-realtime-2`). The negotiation uses the OpenAI
> voice for the agent and the Grok voice model for the pharmacy. The news and
> shortage alerts use Grok 4.3 for accuracy.

---

## One line description (under 200 characters)

> When a drug shortage or outbreak means a patient can't get their medicine,
> RxBridge finds an in-stock alternative and calls the doctor and pharmacy to
> arrange it.

(148 characters. Leads with the problem, lands the solve: find an available
alternative and place the calls so the patient does not go without.)

---

## The thesis (what the demo must prove)

Drug shortages and global outbreaks leave real patients unable to get the
medicine they depend on. Most tools stop at "we could not find your
medication." RxBridge starts there. It:

1. Detects that a medication is unavailable (shortage, outbreak driven demand
   spike, or empty local stock).
2. Finds an in-stock, clinically reasonable alternative.
3. Places the real arrangements: it calls the prescriber to authorize the
   alternative and the pharmacy to confirm and reserve it, using Grok voice, so
   the coordination happens naturally instead of leaving the patient on hold.
4. Hands the patient a clear, fill-ready rescue packet.

Everything else in the app (the medication view, the trend charts, the realtime
news rail) exists to support that core rescue story, not the other way around.

The autonomous part is coordination, not clinical authority. RxBridge never
prescribes. It finds candidates, calls to arrange, and the prescriber
authorizes and the pharmacy confirms.

---

## Hero patient: Marcus

The demo runs on **Marcus L.** (patientId `demo-marcus`). Marcus has a rich,
high-stakes medication list that makes shortages believable and urgent:

- Levothyroxine (4 days left) thyroid, continuity matters
- Semaglutide / Ozempic (6 days left) GLP-1, chronically shortage prone
- Amphetamine salts ER / Adderall XR (1 day left) controlled, supply varies
- Losartan (9 days left) blood pressure
- plus atorvastatin, fluticasone, and an epinephrine auto injector

The shortage and outbreak story lands hard here: a GLP-1 or stimulant shortage
is real and current, and Marcus is days from running out.

**Ayush Ojha** (patientId `ayush`) is shown first as the friendly opening
patient (welcome screen, simpler list), then the demo switches to Marcus for
the rescue. Ayush establishes the warm assistant, Marcus carries the drama.

---

## Demo flow (optimized, rescue first)

### Beat 0. Open on Ayush (5 seconds, set the tone)

RxBridge opens. Three panes: history (left), chat and voice (center), medical
data and medications (right). The assistant greets: "Welcome Ayush, I am your
personal healthcare assistant." This shows the product is warm and personal.
Then switch the patient to Marcus.

### Beat 1. The problem hits (the hook)

As Marcus, the patient says (typed or spoken):

> My pharmacy just told me they are out of my Ozempic and they do not know when
> it will be back. I only have a few days left.

This is the shortage moment. The patient is stranded. This is exactly where
other tools stop.

### Beat 2. RxBridge sees the shortage in context (charts matter here)

The assistant calls tools and the interface renders, inline in the chat:

- a **days of supply chart** for Marcus showing semaglutide dropping toward zero
- the **realtime news / shortage** context from the Grok news rail confirming a
  current GLP-1 shortage and any outbreak driven demand

The charts make the danger visible, not just stated. This is the "rich
interface" moment: data shows up as something you can see, not a wall of text.

### Beat 3. Start the rescue (the core)

The assistant starts a rescue case. The **rescue tracker artifact** appears in
the thread and advances live:

```
Case created
Shortage status checked            (semaglutide in shortage)
Nearby pharmacy stock checked      (original unavailable)
Original medication unavailable
Candidate alternative found        (in stock at a nearby pharmacy)
Awaiting prescriber authorization
```

A **candidate comparison** shows the original next to the in-stock alternative,
clearly labeled "candidate alternative, prescriber approval required."

### Beat 4. The real call (the differentiator)

This is the centerpiece. RxBridge does not just draft a message. It **places a
real two voice call** and you watch it happen inside the chat. The patient says
"call the pharmacy and arrange it" (or the assistant offers), and the
**negotiation call widget** appears in the thread:

- The **RxBridge agent** speaks with an OpenAI voice (labeled GPT Realtime 2).
- The **pharmacy** speaks with the **Grok Voice Agent API**
  (wss://api.x.ai/v1/realtime, model grok-voice-think-fast-1.0).
- They negotiate out loud: the pharmacy quotes a cash price, the agent pushes
  back, they settle on a fair price, and the pharmacy reserves it for same day
  pickup. A **live price ledger** updates as they talk, and the active speaker
  is highlighted.

On stage you hear two distinct AI voices trading prices in real time, and the
widget ends with "Reserved [medication] at [price] for same day pickup." If the
xAI key is not entitled for audio, the pharmacy voice falls back to the browser
speech synthesizer so the call always plays, the transcript and prices are
unchanged.

Implementation: `start_negotiation` tool to `/api/negotiate`, which generates
each line's audio server side (OpenAI speech for the agent, Grok Voice Agent for
the pharmacy) and returns a `negotiation_call` artifact that the widget plays.
The same flow works in voice mode, the assistant can launch the call by voice.

Narration: "We are not asking the AI to prescribe. We are asking it to make the
calls and coordinate the handoff between patient, prescriber, and pharmacy, so
the patient does not have to."

### Beat 5. The patient is rescued (the payoff)

The **rescue packet artifact** renders inline: original medication, the approved
alternative, the prescriber who authorized, the pharmacy holding it, the steps,
and what to say at pickup. Marcus has a fill-ready path in minutes, not days.

Closing line: "A shortage left Marcus days from running out. RxBridge found an
available alternative and called his doctor and pharmacy to arrange it, all in
one conversation."

### Beat 6 (optional). Outbreak variant

If time allows, show the outbreak angle: the news rail surfaces a current
outbreak, RxBridge proactively warns Marcus that demand may spike for a relevant
medication and offers to secure his supply early. Same rescue machinery,
triggered by an outbreak instead of a refill.

---

## What is built (verified working)

Every beat above is backed by code that exists and was tested live.

- Chat plus voice in one interface, three pane layout (done).
- Medication list, the days of supply chart, and a health overview chart as
  inline artifacts, Recharts (done). Tools: `get_medications`, `get_med_trend`,
  `get_health_overview`.
- Rescue workflow end to end: shortage, pharmacy stock, substitution, safety,
  packet, the case store, and the rescue routes (done). Tools: `start_rescue`,
  `get_rescue_case`, `authorize_candidate`, `confirm_pharmacy_fill`,
  `get_rescue_packet`.
- Realtime shortage and outbreak news via Grok search (done).
- Rescue tracker and rescue packet artifacts (done).
- **The two voice negotiation call (done and verified).** Tool
  `start_negotiation` to `/api/negotiate`. Returns a six turn call, the OpenAI
  agent and the Grok pharmacy, with a live price ledger, settling around 42
  dollars and reserving for same day pickup. Last test ran in about 5 seconds.
- Both patients (Ayush and Marcus) have the medications, history, and trend
  fixtures the beats use. Marcus's semaglutide days of supply visibly declines.

## Known limitation to brief the audience on

- **Grok voice audio scope.** The xAI hackathon key currently returns 403 on the
  audio scope, so the pharmacy lines fall back to the browser speech voice. The
  transcript, the price ledger, and the flow are unchanged, and real Grok audio
  turns on automatically the moment the scope is enabled, with no code change.
  If you can get the audio scope enabled before the demo, you hear the real Grok
  voice; if not, the call still plays cleanly.

## Polish that is optional, not blocking

These make the conversational flow smoother but the demo works without them.

1. Auto attach the candidate comparison and inline authorize / confirm buttons
   after `start_rescue`, so Beats 3 and 4 are one click rather than the assistant
   calling the next tool. Today the assistant drives it by calling the tools.
2. Tighten the rescue tracker copy to say "calling prescriber" and "calling
   pharmacy" so the tracker mirrors what the audience hears on the call.

---

## How to run the demo

```bash
npm install
npm run dev          # opens on http://localhost:3000
```

Drive it by talking or typing to the assistant. The assistant calls the tools,
and the widgets render inline. Good prompts for each beat:

- Beat 0: open the app (greets Ayush), then pick Marcus L. in the right rail.
- Beat 1 / 2: "My pharmacy is out of my Ozempic and I only have a few days left."
  Then "show me my days of supply" to bring up the chart.
- Beat 3: "Start a rescue for my Ozempic." The tracker renders and advances.
- Beat 4: "Call the pharmacy and arrange it." The negotiation call widget plays.
- Beat 5: "Show me my rescue packet."

For a deterministic stage run you can also hit the routes directly:
`POST /api/rescue/start` then `POST /api/negotiate` with the returned `caseId`.

## Live deployment status (read this if the live site says "failed to fetch")

Live URL: https://rx-bridge-ayushozha.vercel.app (Vercel, project `rx-bridge`,
git linked to `ayushozha/RxBridge`).

What works live right now:
- The homepage, the Grok news alerts, the text chat, and the realtime voice
  token all respond. The environment variables (xAI and OpenAI keys) are set on
  the Vercel project, and deployment protection is off so the URL is public.

Two things to know about the live site:

1. **Cold start on the first request.** The first call to a route after the
   function has gone idle can be slow enough that the browser shows "failed to
   fetch." A second try succeeds, and once warm responses are about 4 seconds.
   To avoid this on stage, open the site and send one warm up message a minute
   before you present.

2. **The multi step rescue flow needs the KV deploy.** The in memory case store
   does not persist across Vercel's serverless instances, so on the live URL the
   start, negotiate, and confirm steps can land on different instances and lose
   the case ("Unknown rescue case"). The fix is wired in code (Vercel KV via
   `@upstash/redis` in `lib/case-store.ts`) but takes effect only after the KV
   store is connected in the Vercel dashboard and this code is deployed. Until
   then, run the rescue flow on `localhost`, where it is reliable, or finish the
   KV setup. See the project README and the chat history for the KV steps.

Local (`npm run dev`) runs the latest code and is reliable for all beats.

## Roughly how far along

The full flow, Beats 0 through 5, is built and integrated and reliable on
localhost: the rich interface, the charts, the news layer, the rescue engine,
and the two voice negotiation call. For the live URL, the env vars and public
access are done; the remaining step is connecting Vercel KV and deploying the
latest code so the multi step rescue flow is reliable online. The Grok audio
scope caveat above still applies to the pharmacy voice.
