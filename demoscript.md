# RxBridge, 5 minute demo script

**One line:** When a drug shortage or outbreak means a patient cannot get their
medicine, RxBridge finds an in stock alternative and calls the doctor and
pharmacy to arrange it.

---

## The problem, in depth

Drug shortages are not a rare event anymore, they are the background condition
of American healthcare. At any given time the FDA and the ASHP shortage lists
carry hundreds of active drug shortages, and the number has been climbing for
years. These are not exotic drugs. They are the everyday ones: GLP-1
medications like Ozempic, ADHD stimulants like Adderall, common antibiotics like
amoxicillin, even saline and basic injectables. Every outbreak makes it worse,
because demand for the relevant medications spikes overnight and the supply
chain cannot catch up.

When a medication is short, the system does not absorb that shock. The patient
does. Picture the moment: someone who is already sick, already stressed, hands
their prescription to the pharmacist and hears, "we are out, and we do not know
when it will be back." That is where the help stops. Now the patient becomes
their own care coordinator at the worst possible time. They have to call around
to other pharmacies to find stock. They have to call their doctor's office, wait
on hold, and ask whether a different strength or a therapeutic alternative is
acceptable. They have to get that alternative authorized, then call the pharmacy
back to confirm it can actually be filled, then hope the price is something they
can afford out of pocket. Each of those steps is a phone call, a hold queue, and
a handoff that can drop. People give up in the middle. They ration doses, they
skip medication, or they simply go without. For a thyroid medication, a blood
pressure medication, or a rescue inhaler, going without is not an inconvenience,
it is a health event waiting to happen.

The tools that exist today stop exactly where the pain begins. A pharmacy app or
a drug database can tell you a medication is unavailable. A shortage tracker can
tell you the shortage exists. None of them do the hard part, the
coordination, the calls, the negotiation, the authorization handoff between
three parties who do not talk to each other easily: the patient, the prescriber,
and the pharmacy. That coordination is human labor, and it is exactly the kind
of repetitive, multi step, phone driven work that gets dropped when everyone is
busy and the patient is the least equipped person in the chain to push it
forward.

RxBridge is built for that gap. It does not try to be a better drug finder. It
starts at "your medication is unavailable" and drives the rescue: it sees the
patient's full medication picture and which ones are about to run out, it
searches in real time for pharmacies that actually have an alternative, it
prepares a candidate alternative for prescriber review, it places the calls and
negotiates a fair price like a person would, and it ends with a clear,
shareable record for the doctor and pharmacy. The autonomous part is the
coordination, not the clinical decision. The AI never prescribes. The prescriber
authorizes, the pharmacy confirms, and the patient, for once, does not have to
spend their sick day on the phone.

That is the thesis of the demo. Watch a patient who is days from running out of
a critical medication go from stranded to a reserved, authorized alternative
with a report in hand, in a single conversation.

---

**Before you start (30 seconds, off stage):**
- Run `npm run dev`, open `http://localhost:3000`.
- Send one warm up message so the first real reply is instant.
- Have the fallback ready in another tab: `http://localhost:3000/demo`.
- Pick **Marcus L.** in the right rail.

Total spoken time is about 5 minutes. Each beat shows the exact line to type or
say, what the audience sees, and the one sentence you narrate.

---

## 0:00 to 0:30  Hook and problem

**Say:** "Drug shortages and outbreaks leave real patients unable to get their
medicine. Most tools just tell you it is out of stock. RxBridge starts there. It
finds an available alternative and actually calls the doctor and pharmacy to
arrange it. Meet Marcus, he is on seven medications."

**Do:** Make sure Marcus is selected. The right rail shows his medications with
refill urgency, and the assistant greets him by name.

---

## 0:30 to 1:15  See the whole picture, in a chart

**Type:** `Are my medications in order?`
- A medication list renders inline with urgency badges. Point out Adderall XR at
  one day, refill now.

**Type:** `Show me a chart of my days of supply for all my medications.`
- A line chart renders live, one line per medication, several trending toward
  zero.

**Say:** "This is built in real time from his data, all seven medications, not a
static image."

---

## 1:15 to 2:00  Realtime intelligence

**Type:** `Can you explain the chart and what it means for me?`
- A fast model reads the actual numbers and explains them in a sentence or two.

**Say:** "That explanation is generated live by a fast model reading his real
values, it is not canned. The brain here is xAI Grok, which is strong at current
events, which matters for shortages."

---

## 2:00 to 3:30  The rescue, self driving

**Type:** `My pharmacy says my Ozempic is out of stock. Please run the full
rescue for it, all the way through, and call the pharmacy. Do not ask me for any
IDs.`

**What the audience sees, narrate as it happens:**
- A rescue tracker appears and advances through its stages: case created,
  shortage checked, nearby pharmacy stock checked (real US pharmacies, searched
  live), original unavailable, candidate alternative found, prescriber
  authorized.
- Then the negotiation call widget plays: two AI voices, the RxBridge agent on
  OpenAI Realtime and the pharmacy on Grok voice, haggle over price with a live
  price ledger, and settle. It ends with the alternative reserved for same day
  pickup.
- The tracker finishes at patient rescue packet ready.

**Say, during the call:** "We are not asking the AI to prescribe. We are asking
it to make the calls and coordinate the handoff between patient, prescriber, and
pharmacy, so the patient does not have to. The authorization is a simulated
prescriber approval, and it negotiates a fair price like a real person would."

---

## 3:30 to 4:15  The payoff and the report

**Type:** `Show me my rescue packet, then generate a report I can send to my
doctor.`
- The rescue packet card shows the approved alternative, pharmacy, agreed price,
  and what to say at pickup.
- The rescue report renders: the key facts, the price movement during the call,
  the negotiation transcript, and the workflow timeline.

**Do:** Click **Export PDF** to show the clean printable report. Click **Email
to doctor / pharmacy** to show it opens a prefilled message.

**Say:** "One report, the important information only, exportable to PDF or sent
to the doctor or pharmacy. In production this goes through a HIPAA compliant
channel."

---

## 4:15 to 4:45  Voice (optional flourish)

**Do:** Switch the center toggle to **Voice**, tap the mic, and say:
`Is my Adderall okay, and can you start a rescue if it is low?`
- The same charts, tracker, and flow render next to the spoken answers. The live
  voice is OpenAI Realtime 2.0.

**Say:** "Same product, by voice. Type or talk, one interface."

---

## 4:45 to 5:00  Close

**Say:** "A shortage left Marcus days from running out. RxBridge saw it, found an
available alternative, called his pharmacy to negotiate and reserve it, and
handed him a report for his doctor, all in one conversation. That is the
prescription rescue layer for drug shortages."

---

## If anything fails live

Open `http://localhost:3000/demo`. It is a recorded walkthrough that replays the
whole flow with zero API calls and cannot fail. Use Pause, Next, and Restart to
pace it while you narrate the same beats above.

## Models, if a judge asks

- Patient assistant, chart explanation, pharmacy search, and negotiation script:
  xAI Grok (fast model for instant replies, Grok 4.3 for shortage news).
- Live patient voice: OpenAI Realtime 2.0.
- Negotiation voices: OpenAI for the agent, Grok voice for the pharmacy.
- Frontend: Next.js 15 and React 19 on Vercel. Charts rendered inline. Synthetic
  patient data, no real PHI.
