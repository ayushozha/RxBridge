import type {
  FillConfirmation,
  PharmacyStockQuote,
  RescueCase,
  SubstitutionCandidate,
} from "@/lib/rescue-types";

const PHARMACIES = [
  { pharmacyName: "Cedar Grove Pharmacy", distanceMiles: 0.8 },
  { pharmacyName: "Northside Care Pharmacy", distanceMiles: 2.4 },
  { pharmacyName: "Mail Order Care Hub", distanceMiles: 0 },
];

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
