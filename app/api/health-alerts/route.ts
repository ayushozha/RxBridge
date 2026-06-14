import { grokStructuredSearch, type XaiCitation } from "@/lib/xai";
import {
  getPatient,
  refillStatus,
  type MedicalHistoryItem,
  type MedicationShortage,
  type Patient,
  type RefillUrgency,
} from "@/lib/patient-data";
import { guardRequest } from "@/lib/request-guard";
import { stripDashes } from "@/lib/sanitize";

/**
 * Realtime health alerts.
 *
 * This route is the "news subagent" for a patient. It reads the patient's
 * medication list, asks Grok to search current news for outbreaks, drug
 * shortages, recalls, and supply chain problems that could affect those
 * medications or the patient's region, and returns structured alerts. The
 * refill timing in each alert is computed locally from the patient's own data,
 * never from the model, so the "are you stocked up" guidance stays accurate.
 */
export const runtime = "nodejs";
export const maxDuration = 90;

/** What Grok must return. Refill fields are filled in by us afterwards. */
interface GrokAlert {
  headline: string;
  category: "outbreak" | "drug_shortage" | "recall" | "supply_chain" | "other";
  affected_medication: string | null;
  severity: "info" | "watch" | "act_now";
  summary: string;
  recommended_action: string;
}

interface GrokAlertsPayload {
  alerts: GrokAlert[];
  overall_note: string;
}

const ALERTS_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    alerts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string" },
          category: {
            type: "string",
            enum: ["outbreak", "drug_shortage", "recall", "supply_chain", "other"],
          },
          affected_medication: { type: ["string", "null"] },
          severity: { type: "string", enum: ["info", "watch", "act_now"] },
          summary: { type: "string" },
          recommended_action: { type: "string" },
        },
        required: [
          "headline",
          "category",
          "affected_medication",
          "severity",
          "summary",
          "recommended_action",
        ],
      },
    },
    overall_note: { type: "string" },
  },
  required: ["alerts", "overall_note"],
};

const SYSTEM = `You are a careful health news analyst for a patient care app. You search current, reputable news and official sources (health agencies, the FDA and ASHP drug shortage lists, hospital and pharmacy notices) for events that could affect a specific patient's ability to stay healthy and keep taking their medications.

Rules:
- Only report things that are actually current and supported by what you find in search. Do not invent or exaggerate. If there is nothing relevant, return an empty alerts array and say so in overall_note.
- Prefer events tied to the patient's specific medications (shortages, recalls) or their region (outbreaks, supply disruptions, severe weather affecting pharmacies).
- severity "act_now" only for things needing prompt action, "watch" for emerging risks, "info" for general awareness.
- recommended_action must be practical and safe, for example refilling early, asking the pharmacist about alternatives, or getting vaccinated. Never tell the patient to change a prescribed dose. Always defer dose and treatment changes to their doctor or pharmacist.
- Do not use the em dash or en dash characters anywhere. Use commas, periods, or the word "to" for ranges.`;

const NEWS_TIMEOUT_MS = 12_000;

function buildUserPrompt(patient: Patient): string {
  const meds = patient.medications
    .map((m) => `- ${m.name} (${m.ingredient}), for ${m.treats}`)
    .join("\n");
  return `Patient region: ${patient.region}.
Patient medications:
${meds}

Search current news and official sources for any active drug shortages, recalls, disease outbreaks, or supply chain or weather disruptions that could affect this patient's medications or their ability to refill them in ${patient.region} right now. Return concise, specific alerts with practical recommended actions. If nothing relevant is happening, return an empty alerts list and note that in overall_note.`;
}

async function searchNewsForPatient(patient: Patient) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);

  try {
    return await grokStructuredSearch<GrokAlertsPayload>({
      system: SYSTEM,
      user: buildUserPrompt(patient),
      schemaName: "health_alerts",
      schema: ALERTS_SCHEMA,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export interface MedicationRefillView {
  name: string;
  ingredient: string;
  dose: string;
  treats: string;
  refillDate: string;
  daysSupplyRemaining: number;
  daysUntilRefill: number;
  urgency: RefillUrgency;
  /** Where to get this refilled, plain guidance. */
  refillAdvice: string;
}

export interface PatientSummaryView {
  id: string;
  displayName: string;
  region: string;
  medicalHistory: MedicalHistoryItem[];
  shortageWatchlist: MedicationShortage[];
}

function refillAdvice(urgency: RefillUrgency): string {
  switch (urgency) {
    case "overdue":
      return "Refill today. Use your pharmacy app or call the pharmacy to request a refill, and ask about same day pickup, mail delivery, or a transfer if your usual pharmacy is out of stock.";
    case "soon":
      return "Refill in the next few days so you do not run low. Request it through your pharmacy app or by phone, and ask the pharmacist whether to fill early given the news below.";
    default:
      return "No action needed yet. Keep an eye on the alerts and refill on your normal schedule.";
  }
}

export async function POST(req: Request) {
  const now = Date.now();
  const blocked = guardRequest(req, now, { limit: 8, windowMs: 60_000 });
  if (blocked) return blocked;

  let patientId: string;
  try {
    const body = await req.json();
    patientId = String(body.patientId ?? "");
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patient = getPatient(patientId);
  if (!patient) {
    return Response.json({ error: "Unknown patient." }, { status: 404 });
  }

  // Compute refill timing locally from the patient's own data.
  const todayIso = new Date(now).toISOString().slice(0, 10);
  const medications: MedicationRefillView[] = patient.medications.map((m) => {
    const status = refillStatus(m, todayIso);
    return {
      name: m.name,
      ingredient: m.ingredient,
      dose: m.dose,
      treats: m.treats,
      refillDate: m.refillDate,
      daysSupplyRemaining: m.daysSupplyRemaining,
      daysUntilRefill: status.daysUntilRefill,
      urgency: status.urgency,
      refillAdvice: refillAdvice(status.urgency),
    };
  });

  let alerts: GrokAlert[] = [];
  let overallNote = "";
  let citations: XaiCitation[] = [];
  let newsError: string | null = null;

  try {
    const result = await searchNewsForPatient(patient);
    // Defensive: tolerate a malformed payload rather than crashing the view.
    const rawAlerts = Array.isArray(result.data.alerts)
      ? result.data.alerts
      : [];
    alerts = rawAlerts.map((a) => ({
      ...a,
      headline: stripDashes(a.headline ?? ""),
      summary: stripDashes(a.summary ?? ""),
      recommended_action: stripDashes(a.recommended_action ?? ""),
      affected_medication: a.affected_medication
        ? stripDashes(a.affected_medication)
        : a.affected_medication,
    }));
    overallNote =
      typeof result.data.overall_note === "string"
        ? stripDashes(result.data.overall_note)
        : "";
    citations = result.citations;
  } catch (err) {
    console.error("Health alerts search failed:", err);
    // Degrade gracefully: still return the refill view even if news is down.
    newsError =
      "Live news is unavailable right now, so only refill timing is shown.";
  }

  return Response.json({
    patient: {
      id: patient.id,
      displayName: patient.displayName,
      region: patient.region,
      medicalHistory: patient.medicalHistory,
      shortageWatchlist: patient.shortageWatchlist,
    } satisfies PatientSummaryView,
    generatedAt: new Date(now).toISOString(),
    medications,
    alerts,
    overallNote,
    citations,
    newsError,
  });
}
