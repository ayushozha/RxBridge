# RxBridge Demo Plan

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

## What is already built (supports the flow)

- Chat plus voice in one interface, three pane layout (done).
- Medication list and trend charts as inline artifacts, Recharts (done).
- Rescue workflow end to end: shortage, pharmacy, substitution, safety, packet,
  case store, and the rescue routes (done by Agent B).
- Realtime shortage and outbreak news via Grok search (done).
- Rescue tracker and rescue packet artifacts (done).
- Patient to assistant voice over WebRTC (done).

## What is still needed for this specific demo

Ranked by how much the demo depends on it.

1. **The outbound provider call with Grok voice (highest priority, the
   differentiator).** Today the voice is patient to assistant only. We need
   RxBridge to place an outbound call to a simulated prescriber and pharmacy and
   show the conversation. For the hackathon this can be a scripted or
   simulated two party voice exchange (Grok voice playing both the RxBridge
   caller and a synthetic provider, transcript shown in the interface), so it is
   believable on stage without a live telephony integration. A real
   Twilio or SIP handoff is the post hackathon version. This is net new work and
   should be the top build item.

2. **Make Marcus the rescue patient and surface a "my medication is
   unavailable" entry point** in the chat, so Beat 1 starts naturally. Small.

3. **Auto render the candidate comparison and the inline action buttons**
   (authorize, confirm) so Beats 3 and 4 are clickable inside the conversation
   rather than via raw routes. Small, Agent A.

4. **The days of supply chart wired to fire in Beat 2** for semaglutide, so the
   danger is visual. The chart and the trend tool exist; just ensure the metric
   and fixture are there for Marcus. Small, shared.

5. **Tighten the rescue tracker copy** to mention the calls (calling prescriber,
   calling pharmacy) so the tracker mirrors what the audience hears.

6. **Joint validation pass** once the above land: typecheck, build, and a full
   stage rehearsal of Beats 0 to 5.

---

## Roughly how far along

The rescue engine, the rich interface, the charts, and the news layer are built
and integrated. The single biggest missing piece for the demo you want is the
**outbound provider call experience** in item 1. With that plus the small
wirings in 2 to 5, the stage flow is complete. Estimate: the call experience is
the real build, the rest is an afternoon of wiring and polish.
