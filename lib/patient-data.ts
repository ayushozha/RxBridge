/**
 * Patient medication data.
 *
 * This is SAMPLE data standing in for a real electronic health record or
 * pharmacy system. In production this module would be replaced by a secure,
 * authenticated lookup against an EHR or pharmacy API. The shapes here are the
 * contract the rest of the app depends on, so keep them stable.
 */

export interface Medication {
  /** Generic and, where useful, brand name, for example "Metformin (Glucophage)". */
  name: string;
  /** Active ingredient, lower case, used for news matching, for example "metformin". */
  ingredient: string;
  dose: string;
  /** What it treats, in plain language. Helps the assistant explain risk. */
  treats: string;
  /** ISO date (YYYY-MM-DD) the prescription is next due for refill. */
  refillDate: string;
  /** How many days of medication the patient currently has on hand. */
  daysSupplyRemaining: number;
  /** True if missing doses is dangerous, raises the urgency of any alert. */
  critical: boolean;
}

export type HistoryCategory =
  | "condition"
  | "medication"
  | "procedure"
  | "lab"
  | "allergy"
  | "immunization"
  | "hospitalization"
  | "care-plan";

export interface MedicalHistoryItem {
  date: string;
  category: HistoryCategory;
  title: string;
  details: string;
}

export type ShortageSeverity = "info" | "watch" | "act_now";

export interface MedicationShortage {
  medication: string;
  ingredient: string;
  status: "shortage" | "limited" | "watch" | "resolved";
  severity: ShortageSeverity;
  summary: string;
  recommendedAction: string;
  source: string;
}

export interface Patient {
  id: string;
  displayName: string;
  /** General location, used to scope outbreak and supply news. */
  region: string;
  medications: Medication[];
  medicalHistory: MedicalHistoryItem[];
  shortageWatchlist: MedicationShortage[];
}

/** Sample patients. Swap this for a real, authenticated data source. */
export const PATIENTS: Patient[] = [
  {
    id: "ayush",
    displayName: "Ayush Ojha",
    region: "United States",
    medications: [
      {
        name: "Metformin (Glucophage)",
        ingredient: "metformin",
        dose: "500 mg twice daily",
        treats: "type 2 diabetes",
        refillDate: "2026-06-20",
        daysSupplyRemaining: 7,
        critical: true,
      },
      {
        name: "Lisinopril",
        ingredient: "lisinopril",
        dose: "10 mg once daily",
        treats: "high blood pressure",
        refillDate: "2026-07-05",
        daysSupplyRemaining: 22,
        critical: true,
      },
      {
        name: "Albuterol inhaler (Ventolin)",
        ingredient: "albuterol",
        dose: "as needed for wheezing",
        treats: "asthma",
        refillDate: "2026-06-16",
        daysSupplyRemaining: 3,
        critical: true,
      },
    ],
    medicalHistory: [
      {
        date: "2026-06",
        category: "care-plan",
        title: "Active medication monitoring",
        details:
          "Tracks refill timing for metformin, lisinopril, and albuterol, with pharmacist follow-up recommended if a refill is delayed.",
      },
      {
        date: "2026-05",
        category: "lab",
        title: "Routine metabolic follow-up",
        details:
          "Sample demo record for diabetes and blood pressure monitoring. No real patient data is stored in this scaffold.",
      },
    ],
    shortageWatchlist: [
      {
        medication: "Albuterol inhaler (Ventolin)",
        ingredient: "albuterol",
        status: "watch",
        severity: "watch",
        summary:
          "Rescue inhalers are critical to keep available. Watch local pharmacy stock when days on hand are low.",
        recommendedAction:
          "Ask the pharmacy about refill timing, transfer options, and whether an equivalent inhaler is available if stock is tight.",
        source: "Synthetic RxBridge demo fixture",
      },
    ],
  },
  {
    id: "demo-marcus",
    displayName: "Marcus L.",
    region: "United States",
    medications: [
      {
        name: "Levothyroxine (Synthroid)",
        ingredient: "levothyroxine",
        dose: "75 mcg once daily",
        treats: "an underactive thyroid",
        refillDate: "2026-06-17",
        daysSupplyRemaining: 4,
        critical: true,
      },
      {
        name: "Atorvastatin (Lipitor)",
        ingredient: "atorvastatin",
        dose: "20 mg once daily",
        treats: "high cholesterol",
        refillDate: "2026-08-01",
        daysSupplyRemaining: 49,
        critical: false,
      },
      {
        name: "Semaglutide (Ozempic)",
        ingredient: "semaglutide",
        dose: "0.5 mg injection once weekly",
        treats: "type 2 diabetes",
        refillDate: "2026-06-19",
        daysSupplyRemaining: 6,
        critical: true,
      },
      {
        name: "Amphetamine salts ER (Adderall XR)",
        ingredient: "amphetamine mixed salts",
        dose: "20 mg each morning",
        treats: "ADHD",
        refillDate: "2026-06-14",
        daysSupplyRemaining: 1,
        critical: false,
      },
      {
        name: "Losartan",
        ingredient: "losartan",
        dose: "50 mg once daily",
        treats: "high blood pressure",
        refillDate: "2026-06-22",
        daysSupplyRemaining: 9,
        critical: true,
      },
      {
        name: "Fluticasone nasal spray",
        ingredient: "fluticasone",
        dose: "one spray in each nostril daily",
        treats: "seasonal allergies",
        refillDate: "2026-07-02",
        daysSupplyRemaining: 19,
        critical: false,
      },
      {
        name: "Epinephrine auto-injector",
        ingredient: "epinephrine",
        dose: "use for severe allergic reaction",
        treats: "anaphylaxis rescue",
        refillDate: "2026-06-30",
        daysSupplyRemaining: 17,
        critical: true,
      },
    ],
    medicalHistory: [
      {
        date: "2026-06",
        category: "care-plan",
        title: "RxBridge shortage watch activated",
        details:
          "Marcus is being monitored for ADHD medication availability, GLP-1 supply, thyroid replacement continuity, and emergency epinephrine access.",
      },
      {
        date: "2026-06",
        category: "medication",
        title: "Amphetamine salts ER refill due tomorrow",
        details:
          "Only 1 day remains. Because stimulant supply can vary by pharmacy, Marcus should request the refill today and ask about nearby transfer options if the usual pharmacy is out.",
      },
      {
        date: "2026-06",
        category: "medication",
        title: "Semaglutide refill due this week",
        details:
          "6 days remain on hand. Weekly GLP-1 therapy should be planned early because dose-specific stock can be inconsistent across retail pharmacies.",
      },
      {
        date: "2026-06",
        category: "condition",
        title: "Type 2 diabetes",
        details:
          "Managed with semaglutide plus diet and activity goals. Missed doses should be discussed with the prescriber or pharmacist rather than self-adjusted.",
      },
      {
        date: "2026-05",
        category: "lab",
        title: "A1C follow-up",
        details:
          "Most recent sample A1C was 7.4 percent, improved from 8.1 percent in the prior quarter. Continue routine clinician follow-up.",
      },
      {
        date: "2026-05",
        category: "condition",
        title: "Primary hypertension",
        details:
          "Losartan is used for daily blood pressure control. Refill timing is marked soon because supply is under 10 days.",
      },
      {
        date: "2026-05",
        category: "lab",
        title: "Blood pressure trend",
        details:
          "Home readings average around 128 over 78 in this sample record. Continue clinician-guided monitoring.",
      },
      {
        date: "2026-04",
        category: "condition",
        title: "Hypothyroidism",
        details:
          "Levothyroxine is taken every morning. Continuity matters because interruptions can affect fatigue, weight, mood, and heart rate.",
      },
      {
        date: "2026-04",
        category: "lab",
        title: "TSH monitoring",
        details:
          "Sample TSH is in the target range after dose adjustment to 75 mcg. Recheck timing should follow the clinician plan.",
      },
      {
        date: "2026-03",
        category: "condition",
        title: "Mixed hyperlipidemia",
        details:
          "Atorvastatin is used for cholesterol risk reduction. This is not urgent today, but refill continuity is still tracked.",
      },
      {
        date: "2026-03",
        category: "lab",
        title: "Lipid panel",
        details:
          "Sample LDL improved to 91 mg/dL from 132 mg/dL. Continue prescribed statin unless a clinician recommends a change.",
      },
      {
        date: "2026-02",
        category: "condition",
        title: "ADHD",
        details:
          "Stable on amphetamine salts ER. Controlled-substance refill timing and stock checks need extra lead time because substitutions require prescriber involvement.",
      },
      {
        date: "2026-02",
        category: "allergy",
        title: "Severe peanut allergy",
        details:
          "Carries an epinephrine auto-injector. Replacement should be kept current and accessible because it is an emergency rescue medication.",
      },
      {
        date: "2026-01",
        category: "hospitalization",
        title: "Emergency department visit for allergic reaction",
        details:
          "Sample record notes urticaria and throat tightness after accidental exposure. Discharged with avoidance counseling and epinephrine refill reminder.",
      },
      {
        date: "2025-12",
        category: "immunization",
        title: "Influenza vaccine",
        details:
          "Annual influenza vaccine documented in this sample record.",
      },
      {
        date: "2025-10",
        category: "immunization",
        title: "COVID booster",
        details:
          "COVID booster documented. Outbreak alerts should still recommend clinician-specific vaccination questions when relevant.",
      },
      {
        date: "2025-09",
        category: "procedure",
        title: "Screening colonoscopy",
        details:
          "Normal sample screening result. Next interval depends on clinician guidance and risk factors.",
      },
      {
        date: "2025-07",
        category: "medication",
        title: "Metformin intolerance",
        details:
          "Metformin was previously stopped because of persistent gastrointestinal side effects. This matters if a shortage forces diabetes therapy discussion.",
      },
      {
        date: "2025-05",
        category: "condition",
        title: "Seasonal allergic rhinitis",
        details:
          "Managed with fluticasone nasal spray during high-pollen months.",
      },
      {
        date: "2024-11",
        category: "procedure",
        title: "Appendectomy",
        details:
          "Remote uncomplicated appendectomy. Included to make the synthetic chart feel complete for demo review.",
      },
      {
        date: "2024-03",
        category: "care-plan",
        title: "Preferred pharmacy and transfer plan",
        details:
          "Uses a retail pharmacy first, with mail-order as backup for maintenance medications. For shortages, ask pharmacist about transfer and prescriber-approved alternatives.",
      },
      {
        date: "2024-02",
        category: "lab",
        title: "Kidney function check",
        details:
          "Sample creatinine and estimated GFR were stable. Kidney function matters for medication choice and monitoring.",
      },
      {
        date: "2023-12",
        category: "procedure",
        title: "Diabetic eye exam",
        details:
          "No retinopathy noted in this sample record. Continue routine screening on the clinician-recommended interval.",
      },
      {
        date: "2023-10",
        category: "procedure",
        title: "Diabetic foot exam",
        details:
          "Protective sensation documented as intact. Foot checks remain part of routine diabetes care.",
      },
      {
        date: "2023-08",
        category: "care-plan",
        title: "Nutrition counseling",
        details:
          "Reviewed carbohydrate consistency, protein intake, hydration, and practical meal planning for work travel.",
      },
      {
        date: "2023-04",
        category: "condition",
        title: "Mild obstructive sleep apnea",
        details:
          "Sample record notes mild sleep apnea with lifestyle measures and clinician follow-up. Daytime fatigue can overlap with thyroid and ADHD symptoms.",
      },
      {
        date: "2022-11",
        category: "lab",
        title: "Baseline liver enzymes",
        details:
          "Baseline liver enzymes documented before long-term statin monitoring. Follow any abnormal results with the clinician.",
      },
      {
        date: "2022-07",
        category: "procedure",
        title: "Electrocardiogram",
        details:
          "Sample ECG documented normal sinus rhythm before stimulant continuation review.",
      },
      {
        date: "2022-03",
        category: "care-plan",
        title: "Medication adherence review",
        details:
          "Reviewed pill organizer use, refill reminders, and pharmacy auto-refill settings to reduce missed doses.",
      },
      {
        date: "2021-09",
        category: "condition",
        title: "Exercise-induced wheeze history",
        details:
          "Remote wheeze history, no current daily controller listed. Included because respiratory outbreaks or rescue-inhaler access may matter.",
      },
      {
        date: "2021-01",
        category: "allergy",
        title: "Penicillin rash history",
        details:
          "Non-severe rash reported years earlier. Any antibiotic decision should be made by a clinician with allergy history in view.",
      },
      {
        date: "2020-06",
        category: "care-plan",
        title: "Tobacco abstinence documented",
        details:
          "Former occasional smoker, abstinent in this sample record. Cardiometabolic risk counseling continues.",
      },
      {
        date: "2019-02",
        category: "condition",
        title: "Family history of early heart disease",
        details:
          "Family history is included for cardiovascular risk context alongside cholesterol and blood pressure treatment.",
      },
    ],
    shortageWatchlist: [
      {
        medication: "Amphetamine salts ER (Adderall XR)",
        ingredient: "amphetamine mixed salts",
        status: "shortage",
        severity: "act_now",
        summary:
          "Stimulant supply can be intermittent, especially for extended-release strengths. Marcus has only 1 day on hand.",
        recommendedAction:
          "Call the pharmacy today, ask which strengths are available, and contact the prescriber before making any switch.",
        source: "Synthetic RxBridge demo fixture based on common ADHD medication shortage scenario",
      },
      {
        medication: "Semaglutide (Ozempic)",
        ingredient: "semaglutide",
        status: "limited",
        severity: "watch",
        summary:
          "GLP-1 medications may have dose-specific availability gaps. Marcus is due within the week.",
        recommendedAction:
          "Request the refill early and ask the pharmacist whether the exact dose is in stock. Do not change dose timing without prescriber guidance.",
        source: "Synthetic RxBridge demo fixture",
      },
      {
        medication: "Epinephrine auto-injector",
        ingredient: "epinephrine",
        status: "watch",
        severity: "watch",
        summary:
          "Emergency rescue medication should not be allowed to expire or run out, even if no local shortage is confirmed.",
        recommendedAction:
          "Confirm expiration date and availability now. Ask about equivalent auto-injector options if the preferred product is unavailable.",
        source: "Synthetic RxBridge demo fixture",
      },
      {
        medication: "Levothyroxine (Synthroid)",
        ingredient: "levothyroxine",
        status: "watch",
        severity: "info",
        summary:
          "Thyroid replacement needs continuity. Stock issues are less prominent here, but brand and generic substitutions can affect patient comfort and monitoring.",
        recommendedAction:
          "Refill before supply gets low and ask the prescriber or pharmacist before switching between brand and generic products.",
        source: "Synthetic RxBridge demo fixture",
      },
      {
        medication: "Losartan",
        ingredient: "losartan",
        status: "resolved",
        severity: "info",
        summary:
          "Included as a historical watch item for blood pressure medication continuity.",
        recommendedAction:
          "Continue normal refill schedule unless the pharmacy reports a stock issue.",
        source: "Synthetic RxBridge demo fixture",
      },
    ],
  },
];

/** The signed in patient for this single user demo. */
export const PRIMARY_PATIENT_ID = "ayush";

export function getPatient(id: string): Patient | undefined {
  return PATIENTS.find((p) => p.id === id);
}

export type RefillUrgency = "overdue" | "soon" | "ok";

export interface RefillStatus {
  daysUntilRefill: number;
  urgency: RefillUrgency;
}

/**
 * Computes how pressing a refill is, given a reference "today" (ISO date).
 * Passing today in keeps this pure and testable rather than reading the clock.
 */
export function refillStatus(med: Medication, todayIso: string): RefillStatus {
  const day = 1000 * 60 * 60 * 24;
  const daysUntilRefill = Math.round(
    (Date.parse(med.refillDate) - Date.parse(todayIso)) / day,
  );

  let urgency: RefillUrgency = "ok";
  if (daysUntilRefill < 0 || med.daysSupplyRemaining <= 3) urgency = "overdue";
  else if (daysUntilRefill <= 10 || med.daysSupplyRemaining <= 10)
    urgency = "soon";

  return { daysUntilRefill, urgency };
}
