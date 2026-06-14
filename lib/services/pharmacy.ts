import type {
  FillConfirmation,
  PharmacyStockQuote,
  RescueCase,
  SubstitutionCandidate,
} from "@/lib/rescue-types";
import { grokFindPharmacies } from "@/lib/xai";

const PHARMACIES = [
  { pharmacyName: "Cedar Grove Pharmacy", distanceMiles: 0.8 },
  { pharmacyName: "Northside Care Pharmacy", distanceMiles: 2.4 },
  { pharmacyName: "Mail Order Care Hub", distanceMiles: 0 },
];

/**
 * Realtime pharmacy stock check. Searches the web via Grok for real US
 * pharmacies that may carry the alternative, and returns them as quotes. Falls
 * back to the synthetic pharmacy list if the live search is unavailable.
 */
export async function findAlternativeStockLive(
  candidate: SubstitutionCandidate,
  region: string,
): Promise<PharmacyStockQuote[]> {
  const found = await grokFindPharmacies({
    medication: candidate.medication,
    region,
  });
  if (!found || found.length === 0) {
    return checkAlternativeStock(candidate);
  }
  return found.map((f, index) => ({
    pharmacyName: f.pharmacyName,
    distanceMiles: index === found.length - 1 ? 0 : Number((1 + index * 1.6).toFixed(1)),
    medication: candidate.medication,
    inStock: f.likelyInStock,
  }));
}

export function checkOriginalStock(
  prescription: RescueCase["prescription"],
): PharmacyStockQuote[] {
  return PHARMACIES.map((pharmacy) => ({
    ...pharmacy,
    medication: prescription.medication,
    inStock: false,
  }));
}

export function checkAlternativeStock(
  candidate: SubstitutionCandidate,
): PharmacyStockQuote[] {
  return PHARMACIES.map((pharmacy, index) => ({
    ...pharmacy,
    medication: candidate.medication,
    inStock: index === 1,
  }));
}

export function confirmFill(candidate: SubstitutionCandidate): FillConfirmation {
  const available = checkAlternativeStock(candidate).find((quote) => quote.inStock);
  return {
    pharmacyName: available?.pharmacyName ?? PHARMACIES[0].pharmacyName,
    confirmed: Boolean(available),
    confirmedAt: new Date().toISOString(),
  };
}
