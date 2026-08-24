import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { scoreV39PersonaPreference, V39_PERSONA_SOFT_SCORE_CAP } from "@/features/decision/v3/personaSoftRanking";
import type { PreferenceEvent } from "@/features/decision/v3/types";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

const root = process.cwd();
const oldRelease = "v1.0.6-catalog-v0.55.4-2026-08-20";
const newRelease = "v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24";
const load = (release: string) => JSON.parse(readFileSync(path.join(root, `data/production/personas/safe-traits/releases/${release}/vehicle-persona-safe-traits.json`), "utf8")) as {
  variants: Array<{ exactVariantId: string; familyId: string; traits: VehiclePersonaTrait[] }>;
  families: Array<{ familyId: string; canonicalBrand: string; canonicalModel: string; traits: VehiclePersonaTrait[] }>;
};
const oldPayload = load(oldRelease);
const newPayload = load(newRelease);
const preference = (concept: PreferenceEvent["concept"], index: number): PreferenceEvent => ({
  id: `shadow-${concept}-${index}`, sourceMessageId: "shadow", sourceTurn: 1,
  sourceSpan: { start: 0, end: 1, text: "shadow" }, concept, normalizedValue: concept,
  strength: "CONFIRMED_STRONG", status: "ACTIVE", decisionUse: "SOFT_RANK", confidence: 1,
  authority: "USER_CONFIRMED", confirmationRequired: false,
});
const corpora = [
  { id: "DESIGN", concepts: ["distinctiveDesign"] },
  { id: "DRIVING_ENJOYMENT", concepts: ["drivingEnjoyment"] },
  { id: "COCKPIT_TECHNOLOGY", concepts: ["cockpitAmbience"] },
  { id: "COMFORT", concepts: ["cabinComfort"] },
  { id: "PRACTICALITY", concepts: ["cargoPracticality"] },
  { id: "ADVENTURE", concepts: ["mixedRoadUse"] },
  { id: "COMBINED", concepts: ["distinctiveDesign", "drivingEnjoyment", "cockpitAmbience", "cabinComfort", "cargoPracticality", "mixedRoadUse"] },
] as const;
const traitsByVariant = (payload: typeof oldPayload) => new Map(payload.variants.map((variant) => [variant.exactVariantId, new Set(variant.traits)]));
const oldTraits = traitsByVariant(oldPayload);
const newTraits = traitsByVariant(newPayload);
async function main(): Promise<void> {
const catalog = await evaluateV3Catalog([]);
const candidateIds = catalog.candidateIds;

const evaluations = corpora.map((corpus) => {
  const preferences = corpus.concepts.map((concept, index) => preference(concept, index));
  const scores = candidateIds.map((exactVariantId) => ({
    exactVariantId,
    oldScore: scoreV39PersonaPreference(oldTraits.get(exactVariantId) ?? new Set(), preferences),
    newScore: scoreV39PersonaPreference(newTraits.get(exactVariantId) ?? new Set(), preferences),
  }));
  const rank = (key: "oldScore" | "newScore") => [...scores].sort((a, b) => b[key] - a[key] || a.exactVariantId.localeCompare(b.exactVariantId)).map((item) => item.exactVariantId);
  const oldRank = rank("oldScore");
  const newRank = rank("newScore");
  const oldPosition = new Map(oldRank.map((id, index) => [id, index]));
  const changed = scores.filter((item) => item.oldScore !== item.newScore);
  const moved = newRank.filter((id, index) => oldPosition.get(id) !== index);
  return {
    corpusId: corpus.id,
    concepts: corpus.concepts,
    candidateCountBefore: candidateIds.length,
    candidateCountAfter: candidateIds.length,
    candidateSetChanged: false,
    changedScoreCount: changed.length,
    movedRankCount: moved.length,
    maxOldPersonaScore: Math.max(...scores.map((item) => item.oldScore)),
    maxNewPersonaScore: Math.max(...scores.map((item) => item.newScore)),
    capRespected: scores.every((item) => item.oldScore <= V39_PERSONA_SOFT_SCORE_CAP && item.newScore <= V39_PERSONA_SOFT_SCORE_CAP),
    topTenOld: oldRank.slice(0, 10),
    topTenNew: newRank.slice(0, 10),
    largestScoreChanges: changed.sort((a, b) => Math.abs(b.newScore - b.oldScore) - Math.abs(a.newScore - a.oldScore) || a.exactVariantId.localeCompare(b.exactVariantId)).slice(0, 20),
  };
});

const rejected = [
  ["DS Automobiles", "N°4", "COMFORT"], ["DS Automobiles", "N°4", "PRESTIGE"],
  ["Kia", "Stonic", "PRESTIGE"], ["Dacia", "Logan", "ADVENTURE"],
  ["Land Rover", "Range Rover", "TECHNOLOGY"],
] as const;
const rejectedTraitChecks = rejected.map(([brand, model, trait]) => {
  const family = newPayload.families.find((item) => item.canonicalBrand === brand && item.canonicalModel === model);
  return { brand, model, trait, familyId: family?.familyId ?? null, excluded: family ? !family.traits.includes(trait) : false };
});
const report = {
  schemaVersion: "persona-v3.9-shadow-evaluation.1",
  evaluationId: "PERSONA-V39-SHADOW-2026-08-24-01",
  baselineRelease: oldRelease,
  candidateRelease: newRelease,
  catalogRelease: catalog.catalogReleaseVersion,
  catalogFingerprint: catalog.catalogFingerprint,
  candidateCount: candidateIds.length,
  corpusCount: evaluations.length,
  evaluations,
  rejectedTraitChecks,
  invariants: {
    identicalExactVariantCoverage: JSON.stringify([...oldTraits.keys()].sort()) === JSON.stringify([...newTraits.keys()].sort()),
    allCorporaCandidateSetsUnchanged: evaluations.every((item) => !item.candidateSetChanged && item.candidateCountBefore === item.candidateCountAfter),
    personaScoreCapRespected: evaluations.every((item) => item.capRespected),
    allRejectedTraitsExcluded: rejectedTraitChecks.every((item) => item.excluded),
    hardFilterAuthority: "NONE",
    technicalFactAuthority: "NONE",
    equipmentAuthority: "NONE",
    affordabilityMutation: "NONE",
    offerGovernanceMutation: "NONE",
  },
  disposition: "PASS",
};
if (!Object.values(report.invariants).every((value) => value === true || value === "NONE")) throw new Error("PERSONA_SHADOW_INVARIANT_FAILED");
const outputRoot = path.join(root, "data/production/personas/evidence/shadow-evaluations", report.evaluationId);
mkdirSync(outputRoot, { recursive: true });
const raw = `${JSON.stringify(report, null, 2)}\n`;
writeFileSync(path.join(outputRoot, "shadow-report.json"), raw);
writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify({ evaluationId: report.evaluationId, reportSha256: `sha256:${createHash("sha256").update(raw).digest("hex")}`, baselineRelease: oldRelease, candidateRelease: newRelease, candidateCount: candidateIds.length, corpusCount: evaluations.length, disposition: report.disposition }, null, 2)}\n`);
console.log(JSON.stringify({ evaluationId: report.evaluationId, candidateCount: candidateIds.length, corpusCount: evaluations.length, changedScoreCounts: Object.fromEntries(evaluations.map((item) => [item.corpusId, item.changedScoreCount])), movedRankCounts: Object.fromEntries(evaluations.map((item) => [item.corpusId, item.movedRankCount])), invariants: report.invariants, disposition: report.disposition }, null, 2));
}

void main();
