# RxBridge

> When a drug shortage or outbreak means a patient can't get their medicine,
> RxBridge finds an in-stock alternative and calls the doctor and pharmacy to
> arrange it.

---

## Inspiration

Drug shortages are not a rare edge case anymore. GLP-1 medications like Ozempic,
ADHD stimulants, and even basics like amoxicillin have spent long stretches on
official shortage lists, and every global outbreak spikes demand for something.
When that happens, the patient is the one left stranded at the pharmacy counter
hearing "we are out, and we do not know when it will be back."

Almost every tool we looked at stops exactly there. They tell you a medication
is unavailable and leave you to make a dozen phone calls yourself: to the
pharmacy to ask about alternatives, to a second pharmacy across town, to your
doctor's office to get a substitute authorized. For someone who is sick, that is
the worst possible moment to become their own care coordinator.

We wanted to build the thing that starts where those tools stop. Not a drug
finder, a **rescue layer**: find an available alternative and actually make the
arrangements, so the patient does not go without.

## What it does

RxBridge is one conversational interface, text and voice, with a three pane
workspace: conversation history on the left, the chat in the center, and the
patient's medications and live alerts on the right.

- **Sees the danger early.** Using Grok's realtime search, it watches the news
  and official sources (FDA and ASHP shortage lists, health agencies) for
  shortages, recalls, and outbreaks, and matches them against the patient's own
  medication list and refill dates. It renders the patient's days of supply as a
  live chart so a looming gap is something you can see.
- **Runs a rescue.** When a medication cannot be filled, it starts a
  deterministic workflow: check shortage status, check pharmacy stock, find a
  candidate alternative, and screen it for safety. The patient watches a live
  status tracker advance, inline in the chat.
- **Places the call.** This is the centerpiece. RxBridge runs a two voice
  negotiation: the **RxBridge agent (OpenAI Realtime)** and the **pharmacy (xAI
  Grok voice)** talk to each other, trade prices, and reserve the alternative,
  with a live price ledger updating as they speak.
- **Hands off a rescue packet.** The patient ends with a clear, fill ready plan:
  the approved alternative, the pharmacy holding it, the agreed price, and what
  to say at pickup.

Throughout, the AI never prescribes. Until a prescriber authorizes, every option
is a "candidate alternative." The autonomous part is coordination, not clinical
authority.

## How we built it

The whole product is built around **xAI Grok as the brain**, which is the right
fit for an app about live, fast moving shortage and outbreak news.

- **Frontend**: Next.js 15 App Router and React 19, deployed on **Vercel**. The
  chat and voice share one conversation. The assistant attaches typed
  "artifacts" to its turns and the interface renders them inline, the way Claude
  and ChatGPT render artifacts: charts (Recharts), a rescue tracker, a
  substitution comparison, the negotiation call widget, and the rescue packet.
- **The brain (xAI Grok)**: `grok-4.3` via the Responses API answers the patient
  and decides which tools to call. Its `web_search` tool, with a strict JSON
  schema, pulls live sources and returns structured, cited shortage and outbreak
  alerts.
- **The rescue engine**: a set of deterministic, synthetic services, shortage,
  pharmacy stock, substitution, safety screen, and packet generation, behind an
  in memory case store and a small set of API routes.
- **The two voices**: the negotiation is a real two party call. The pharmacy
  speaks with the **Grok Voice Agent API** (`wss://api.x.ai/v1/realtime`), and
  the RxBridge agent speaks with **OpenAI Realtime**, which is the one place we
  use OpenAI, as the second agent so two AIs can negotiate live. Each line's
  audio is generated server side and played back in sequence in the widget.
- **Keys stay server side**: every provider call happens inside a Vercel
  serverless function, so the xAI and OpenAI keys never reach the browser.

A simple way to think about the urgency the app surfaces: if a medication is
consumed at a steady daily rate, the days of cushion before a refill is

$$ \text{days at risk} = \text{days of supply on hand} - \text{days until the refill clears} $$

When that number goes negative, the patient runs out before the system can
refill them, and that is exactly the moment RxBridge tries to rescue.

## Challenges we ran into

- **Two AI voices on one call.** A live audio bridge between two realtime voice
  providers is genuinely hard, and a brittle live bridge would fail on stage. We
  chose a robust design: generate each turn's audio from its real provider
  (Grok for the pharmacy, OpenAI for the agent) and play them back as a real
  alternating call with a live transcript and price ledger.
- **Provider entitlements.** The Grok voice audio scope was not enabled on our
  hackathon key, so we built a fast failing fallback to the browser speech
  voice. The negotiation always plays, and real Grok audio turns on
  automatically the moment the scope is enabled, with no code change.
- **Keeping the AI honest.** A healthcare assistant must never invent an
  alternative, a dose, or a price. We made the model call deterministic tools
  for every fact and render only what those tools return, and we compute refill
  urgency locally from the patient's own data so the model cannot get it wrong.
- **Latency on stage.** The first version of the call stalled for thirty plus
  seconds on a gated key. We cut it to about five seconds with a four second
  fail fast and a per process disable flag.
- **Two builders, one codebase.** We split the work across two agents with a
  typed contract (the artifact and tool definitions) so we could build the
  interface and the rescue backend in parallel without colliding.

## Accomplishments that we are proud of

- An interface where data shows up as **interactive widgets inside the chat**,
  not walls of text, charts you can read, a rescue tracker that advances live,
  and a call you can watch happen.
- A **two voice negotiation** between Grok and OpenAI that trades prices and
  reserves a medication, end to end and verified working.
- A grounded, safety first design: the assistant coordinates, it never
  prescribes, and every number on screen comes from a tool, not a guess.

## What we learned

- Grok's realtime search is a real advantage for a product about current events;
  it returned accurate, cited, current shortage information and refused to
  invent a scare when nothing was happening.
- Structured outputs plus tool calling are what make an AI interface
  trustworthy. The model becomes a router to deterministic logic, not the source
  of truth.
- For a live demo, robustness beats raw fidelity. A simulated but reliable two
  voice call that always plays is worth more than a real bridge that might drop.

## What's next for RxBridge

- Real outbound telephony (Twilio or SIP) so the call reaches a real pharmacy or
  prescriber line, not just an in app negotiation.
- A real, authenticated data source (EHR or pharmacy API) in place of the
  synthetic patient fixtures, with proper compliance review.
- Insurance and copay awareness in the negotiation, and proactive outbreak
  driven "secure your supply early" nudges.

---

## Built with

- **Languages**: TypeScript, JavaScript
- **Framework**: Next.js 15 (App Router), React 19
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **AI, primary**: xAI Grok (`grok-4.3` Responses API with `web_search`), and the
  Grok Voice Agent API (`wss://api.x.ai/v1/realtime`) for the pharmacy voice
- **AI, second call agent**: OpenAI Realtime (`gpt-realtime-2`) for the RxBridge
  agent voice
- **Cloud / hosting**: Vercel (serverless functions and edge)
- **APIs**: xAI Responses API, xAI Grok Voice Agent API, OpenAI Realtime and
  speech APIs
- **Data**: in memory case store with synthetic patient fixtures (no real PHI)

## Try it out

- **GitHub**: https://github.com/ayushozha/RxBridge
- **Live demo**: <add your Vercel URL here, for example https://rxbridge.vercel.app>
