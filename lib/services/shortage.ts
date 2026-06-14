import type { RescueCase, ShortageStatus } from "@/lib/rescue-types";

const OPENFDA_SHORTAGE_ENDPOINT = "https://api.fda.gov/drug/shortages.json";

const SYNTHETIC_SHORTAGES: Record<string, Omit<ShortageStatus, "ingredient">> = {
  "amphetamine mixed salts": {
    inShortage: true,
    severity: "act_now",
    summary:
      "Extended-release stimulant supply is intermittent in this demo. The original medication is treated as unavailable.",
    source: "Synthetic RxBridge shortage fixture",
  },
  semaglutide: {
    inShortage: true,
    severity: "watch",
    summary:
      "Dose-specific GLP-1 availability can vary by pharmacy. The demo marks the requested dose as limited.",
    source: "Synthetic RxBridge shortage fixture",
  },
  epinephrine: {
    inShortage: false,
    severity: "watch",
    summary:
      "No active national shortage is required for the demo, but emergency rescue medication should be refilled before it is unavailable.",
    source: "Synthetic RxBridge watch fixture",
  },
  levothyroxine: {
    inShortage: false,
    severity: "info",
    summary:
      "No active shortage is required for the demo. Continuity matters because thyroid replacement should not be interrupted.",
    source: "Synthetic RxBridge watch fixture",
  },
  losartan: {
    inShortage: false,
    severity: "info",
    summary:
      "Historical supply watch only. Continue routine refill planning unless the pharmacy reports a problem.",
    source: "Synthetic RxBridge watch fixture",
  },
};

export async function checkShortage(
  prescription: RescueCase["prescription"],
): Promise<ShortageStatus> {
  const synthetic = syntheticShortage(prescription.ingredient);

  if (process.env.USE_LIVE_OPENFDA === "true") {
    const live = await tryOpenFdaShortage(prescription.ingredient);
    if (live) return live;
  }

  return synthetic;
}

function syntheticShortage(ingredient: string): ShortageStatus {
  const key = ingredient.toLowerCase();
  const matched = SYNTHETIC_SHORTAGES[key];
  if (matched) return { ingredient, ...matched };

  return {
    ingredient,
    inShortage: true,
    severity: "watch",
    summary:
      "The demo treats the original prescription as unavailable so the rescue workflow can run end to end.",
    source: "Synthetic RxBridge fallback shortage fixture",
  };
}

async function tryOpenFdaShortage(
  ingredient: string,
): Promise<ShortageStatus | null> {
  const search = `generic_name:"${ingredient}"`;
  const url = `${OPENFDA_SHORTAGE_ENDPOINT}?search=${encodeURIComponent(search)}&limit=1`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      results?: Array<Record<string, unknown>>;
    };
    const result = body.results?.[0];
    if (!result) return null;

    return {
      ingredient,
      inShortage: true,
      severity: "watch",
      summary: summarizeOpenFdaResult(result),
      source: "openFDA Drug Shortages",
    };
  } catch {
    return null;
  }
}

function summarizeOpenFdaResult(result: Record<string, unknown>): string {
  const fields = [
    "generic_name",
    "brand_name",
    "status",
    "shortage_status",
    "reason_for_shortage",
    "availability",
  ];
  const parts = fields
    .map((field) => result[field])
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  return parts.length > 0
    ? parts.join(". ")
    : "openFDA returned a matching drug shortage record.";
}
