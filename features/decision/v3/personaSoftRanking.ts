import type { VehiclePersonaTrait } from "@/types/vehiclePersona";
import type { PreferenceEvent } from "./types";

export const V39_PERSONA_SOFT_SCORE_CAP = 0.75;

const weights: Readonly<Partial<Record<PreferenceEvent["concept"], Readonly<Partial<Record<VehiclePersonaTrait, number>>>>>> = Object.freeze({
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
  candidateComfortPriority: { COMFORT: 0.75 },
  candidatePracticalityPriority: { PRACTICALITY: 0.75 },
  candidateTechnologyPriority: { TECHNOLOGY: 0.75 },
  candidateSustainabilityPriority: { SUSTAINABILITY: 0.75 },
  candidateDrivingPriority: { DRIVING_ENGAGEMENT: 0.75 },
  candidateFamilyPriority: { FAMILY: 0.75 },
  candidateDesignPriority: { DESIGN: 0.75 },
});

/** Persona evidence is a bounded ordering hint. It never evaluates eligibility or facts. */
export function scoreV39PersonaPreference(
  traits: ReadonlySet<VehiclePersonaTrait>,
  preferences: readonly PreferenceEvent[],
): number {
  let score = 0;
  for (const preference of preferences) {
    if (preference.status !== "ACTIVE" || preference.decisionUse !== "SOFT_RANK") continue;
    const traitWeights = weights[preference.concept];
    if (!traitWeights) continue;
    for (const trait of traits) score += traitWeights[trait] ?? 0;
  }
  return Math.min(V39_PERSONA_SOFT_SCORE_CAP, score);
}
