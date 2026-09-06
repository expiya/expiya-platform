import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import type { PreferenceEvent } from "./types";
import { rankWithBoundedSoftSignals, type XpyCandidateSoftSignal, type XpySoftRankingAuthorityReference } from "@/features/xpy/boundedSoftRanking";

export const V39_PERSONA_SOFT_SCORE_CAP = 0.75;

export const V39_PERSONA_SOFT_RANKING_AUTHORITY: XpySoftRankingAuthorityReference = Object.freeze({ authorityId: "cars-persona-evidence-v3.9", version: "v3.9.0-catalog-v0.55.4-2026-08-24-owner-reviewed-rc.1", digest: "sha256:5bde532484a21e41a2617cbe606539ae65bddd9973759979f7ea49818f21465a", decisionUse: "BOUNDED_SOFT_RANKING_ONLY" });

export const V39_PERSONA_SOFT_WEIGHTS: Readonly<Partial<Record<PreferenceEvent["concept"], Readonly<Partial<Record<VehiclePersonaTrait, number>>>>>> = Object.freeze({
  distinctiveDesign: { DESIGN: 0.5, PRESTIGE: 0.25 },
  drivingEnjoyment: { DRIVING_ENGAGEMENT: 0.75 },
  cockpitAmbience: { TECHNOLOGY: 0.5, DESIGN: 0.25 },
  cabinComfort: { COMFORT: 0.75 },
  ergonomicComfort: { COMFORT: 0.75 },
  longDistanceComfort: { COMFORT: 0.75 },
  cargoPracticality: { PRACTICALITY: 0.5, FAMILY: 0.25 },
  rearSeatSpace: { PRACTICALITY: 0.5, FAMILY: 0.25 },
  familyPracticality: { PRACTICALITY: 0.5, FAMILY: 0.25 },
  highRideHeight: { ADVENTURE: 0.75 },
  mixedRoadUse: { ADVENTURE: 0.75 },
  roofLoadLifestyle: { ADVENTURE: 0.75 },
});

/** Persona evidence is a bounded ordering hint. It never evaluates eligibility or facts. */
export function scoreV39PersonaPreference(
  traits: ReadonlySet<VehiclePersonaTrait>,
  preferences: readonly PreferenceEvent[],
): number {
  const eligible = preferences.filter(preference => preference.status === "ACTIVE" && preference.decisionUse === "SOFT_RANK" && V39_PERSONA_SOFT_WEIGHTS[preference.concept]);
  const signals: XpyCandidateSoftSignal[] = [];
  for (const preference of eligible) for (const trait of traits) {
    const contribution = V39_PERSONA_SOFT_WEIGHTS[preference.concept]?.[trait];
    if (contribution) signals.push({ exactCandidateId: "CARS_PERSONA_CANDIDATE", preferenceKey: preference.concept, mappingRef: `cars-persona-v39:${preference.concept}:${trait}`, evidenceRef: `owner-approved-persona-trait:${trait}`, evidenceState: "KNOWN_MATCH", contribution, reasonCode: `PERSONA_${trait}_MATCH`, authority: V39_PERSONA_SOFT_RANKING_AUTHORITY });
  }
  return rankWithBoundedSoftSignals({ eligibleCandidateIds: ["CARS_PERSONA_CANDIDATE"], preferences: eligible.map(preference => ({ eventId: preference.id, preferenceKey: preference.concept, status: "ACTIVE" })), signals, scoreCap: V39_PERSONA_SOFT_SCORE_CAP, singleSelectionAuthorized: false }).traces[0]!.score;
}
