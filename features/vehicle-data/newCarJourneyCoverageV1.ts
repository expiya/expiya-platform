export type JourneyCoverageStatus =
  | "DECIDABLE"
  | "GUIDANCE_ONLY"
  | "NO_AFFORDABLE_MATCH"
  | "BLOCKED_BY_MISSING_EVIDENCE"
  | "OUT_OF_PHASE1_SCOPE";

export interface JourneyCoverageRow {
  readonly journey: string;
  readonly status: JourneyCoverageStatus;
  readonly authority?: string;
  readonly reason: string;
}

/** Fail-closed audit of catalog v0.2.0, map v0.2.1 and artifact v0.3.0. */
export const newCarJourneyCoverageV1 = Object.freeze([
  { journey: "first automatic city car", status: "GUIDANCE_ONLY", reason: "No contract-complete mapped B-hatch candidate." },
  { journey: "Clio evaluation", status: "GUIDANCE_ONLY", reason: "Clio identity is priced but its evidence configuration is provisional." },
  { journey: "Clio named alternative", status: "BLOCKED_BY_MISSING_EVIDENCE", reason: "Corsa is exact-mapped but has no verified seats, seats-up cargo, length or width facts." },
  { journey: "easy-parking compact", status: "BLOCKED_BY_MISSING_EVIDENCE", reason: "No contract-complete compact candidate with verified dimensions." },
  { journey: "four-person family under 3M", status: "DECIDABLE", authority: "hard current-price ceiling + verified seats", reason: "Captur and Yaris Cross are exact-mapped and current-priced." },
  { journey: "family cargo under 3M", status: "DECIDABLE", authority: "hard current-price ceiling + seats-up cargo", reason: "Captur cargo range and Yaris Cross cargo scalar are exact and comparable." },
  { journey: "city plus occasional long road", status: "GUIDANCE_ONLY", reason: "Use can be explained with dimensions/cargo; ride comfort is not ranked." },
  { journey: "generic comfort priority", status: "GUIDANCE_ONLY", reason: "Ride softness and cabin quietness are not governed dimensions." },
  { journey: "explicit automatic", status: "DECIDABLE", authority: "exact transmission identity", reason: "Mapped candidates have verified transmission identity." },
  { journey: "explicit hybrid", status: "DECIDABLE", authority: "exact electrification identity", reason: "Captur MHEV and Yaris Cross HEV are exact mapped." },
  { journey: "explicit electric", status: "DECIDABLE", authority: "exact BEV identity", reason: "IONIQ 9 is exact mapped and contract-complete." },
  { journey: "seven seats under 2M", status: "NO_AFFORDABLE_MATCH", authority: "minimum seats + seats-up cargo + hard current-price ceiling", reason: "IONIQ 9 passes capacity but fails the price ceiling." },
  { journey: "seven seats without budget", status: "DECIDABLE", authority: "minimum seats + seats-up cargo", reason: "IONIQ 9 is the sole exact evaluable match; price is informational." },
  { journey: "large cargo", status: "DECIDABLE", authority: "minimum seats-up cargo", reason: "Exact scalar/range cargo observations support threshold filtering." },
  { journey: "used-car request", status: "OUT_OF_PHASE1_SCOPE", reason: "Phase 1 is new-car only." },
] as const satisfies readonly JourneyCoverageRow[]);

export const journeyCoverageV1ActivatedCandidateIds = Object.freeze([
  "a3728e65-51b2-447f-a6c3-a1f64db8a310",
  "62465336-2cfb-4ccd-b9a7-36467d63497f",
  "e3248126-f374-44ff-9dbe-5378ab308a02",
] as const);
