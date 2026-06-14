/**
 * Builds the provider negotiation: a realistic phone call between the RxBridge
 * agent and a pharmacy to secure an in stock alternative at a fair price.
 *
 * The script is deterministic and synthetic (no real pricing advice). The agent
 * voice is OpenAI, the pharmacy voice is Grok. Each turn carries its spoken
 * audio so the widget plays a real two voice call with a live price ledger.
 */

import type { NegotiationTurn } from "@/lib/artifacts";
import type { RescueCase } from "@/lib/rescue-types";
import { getRescueCase } from "@/lib/case-store";
import { speakAgent, speakPharmacy } from "@/lib/services/voice-tts";

const AGENT_LABEL = "GPT Realtime 2";
const PHARMACY_LABEL = "Grok Voice";

export interface NegotiationResult {
  caseId: string;
  medication: string;
  pharmacyName: string;
  turns: NegotiationTurn[];
  agreedPrice: number;
  outcome: "reserved" | "no_deal";
}

interface ScriptLine {
  speaker: "agent" | "pharmacy";
  text: string;
  price?: number;
}

/** The deterministic call script for an in stock alternative. */
function buildScript(
  medication: string,
  pharmacyName: string,
): { lines: ScriptLine[]; agreedPrice: number } {
  const listPrice = 48;
  const counter = 39;
  const agreedPrice = 42;

  const lines: ScriptLine[] = [
    {
      speaker: "agent",
      text: `Hi, this is the RxBridge care agent calling on behalf of a patient. Their prescribed medication is in shortage. Do you have ${medication} in stock?`,
    },
    {
      speaker: "pharmacy",
      text: `Yes, we have ${medication} on the shelf. The cash price is ${listPrice} dollars.`,
      price: listPrice,
    },
    {
      speaker: "agent",
      text: `Thank you. The patient is paying out of pocket because of the shortage. Can you do better than ${listPrice} dollars? Other locations are quoting around ${counter}.`,
      price: counter,
    },
    {
      speaker: "pharmacy",
      text: `I can meet you partway. I can offer it at ${agreedPrice} dollars and reserve one for same day pickup.`,
      price: agreedPrice,
    },
    {
      speaker: "agent",
      text: `${agreedPrice} dollars works, please reserve it. The prescriber has authorized this alternative, so the patient can pick it up today.`,
      price: agreedPrice,
    },
    {
      speaker: "pharmacy",
      text: `Done. One ${medication} is reserved at ${agreedPrice} dollars for same day pickup. We will hold it under the patient's name.`,
      price: agreedPrice,
    },
  ];

  return { lines, agreedPrice };
}

/** Pick a pharmacy that confirmed stock, or a sensible default. */
function pickPharmacy(rescueCase: RescueCase): string {
  const inStock = rescueCase.pharmacyQuotes.find((q) => q.inStock);
  return (
    rescueCase.fillConfirmation?.pharmacyName ??
    inStock?.pharmacyName ??
    "Cedar Grove Pharmacy"
  );
}

/** Pick the medication being negotiated (the authorized or first candidate). */
function pickMedication(rescueCase: RescueCase): string {
  const selected = rescueCase.substitutionCandidates.find(
    (c) => c.id === rescueCase.selectedCandidateId,
  );
  return (
    selected?.medication ??
    rescueCase.substitutionCandidates[0]?.medication ??
    rescueCase.prescription.medication
  );
}

export async function runNegotiation(
  caseId: string,
): Promise<NegotiationResult | null> {
  const rescueCase = getRescueCase(caseId);
  if (!rescueCase) return null;

  const medication = pickMedication(rescueCase);
  const pharmacyName = pickPharmacy(rescueCase);
  const { lines, agreedPrice } = buildScript(medication, pharmacyName);

  // Generate the two voices in parallel per line. Audio may be null, in which
  // case the widget speaks the line with the browser voice instead.
  const turns: NegotiationTurn[] = await Promise.all(
    lines.map(async (line) => {
      const audio =
        line.speaker === "agent"
          ? await speakAgent(line.text)
          : await speakPharmacy(line.text);
      return {
        speaker: line.speaker,
        voiceLabel: line.speaker === "agent" ? AGENT_LABEL : PHARMACY_LABEL,
        text: line.text,
        price: line.price,
        audio,
      };
    }),
  );

  return {
    caseId,
    medication,
    pharmacyName,
    turns,
    agreedPrice,
    outcome: "reserved",
  };
}
