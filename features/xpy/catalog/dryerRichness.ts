import { createHash } from "node:crypto";

import { requireXpyDomainPack } from "../domainPacks";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import type {
  AdvisorKnowledge,
  Capability,
  CatalogEvidence,
  CatalogSource,
  DailyLifeInterpretation,
  NeedEvidenceMapping,
  ObjectiveFact,
  PersonaPlanningSignal,
  UsageSemantic,
  UserNeed,
  XpyCatalogRelease,
  XpyComparisonDimension,
} from "./contract";
import { XPY_CATALOG_VERSION } from "./contract";
import { validateXpyCatalogRelease, xpyCatalogReleaseDigest } from "./validation";

export const DRYER_RICHNESS_RELEASE_VERSION = "APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.2" as const;
export const DRYER_SEMANTIC_AUTHORITY_VERSION = "DRYER_SEMANTIC_REGISTRY/v0.2" as const;
export const DRYER_PARENT_RELEASE_VERSION = "APPLIANCES-DRYER-TR-v0.1" as const;
export const DRYER_PARENT_ARTIFACT_SHA256 = "3ef3ce69874ced7d210c97545d35e82a9a2fae2933a7d7d715ae411224943f48" as const;
export const DRYER_REVIEWED_AT = "2026-09-04T17:30:00.000+03:00" as const;

const pack = requireXpyDomainPack("APPLIANCES");
const offeringIds = {
  KMX82: "BEKO_KMX_82_TR",
  KM99: "BEKO_KM_99_TR",
  BOSCH: "BOSCH_WQG24100TR",
} as const;

const sourceIds = {
  KMX_PRODUCT: "BEKO-KMX82-PRODUCT-TR",
  KMX_FICHE: "BEKO-KMX82-FICHE-TR",
  KMX_MANUAL: "BEKO-KMX82-MANUAL-TR",
  KM99_PRODUCT: "BEKO-KM99-PRODUCT-TR",
  BOSCH_PRODUCT: "BOSCH-WQG24100TR-PRODUCT-TR",
  BOSCH_MANUAL: "BOSCH-WQG24100TR-MANUAL-TR",
} as const;

type OfferingKey = keyof typeof offeringIds;
type FactSpec = { key: string; value: string | number | boolean; unit?: string; sourceId: string; locator: string; limitations?: readonly string[] };
type CapabilitySpec = { key: string; state?: Capability["state"]; sourceId: string; locator: string; limitations?: readonly string[] };

const identities = {
  KMX82: { manufacturer: "Beko", model: "KMX 82", configuration: "Beko KMX 82 / TR / heat-pump / drying-only", identifiers: { productId: offeringIds.KMX82, manufacturerProductCode: "7184270260" } },
  KM99: { manufacturer: "Beko", model: "KM 99", configuration: "Beko KM 99 / TR / heat-pump / drying-only", identifiers: { productId: offeringIds.KM99 } },
  BOSCH: { manufacturer: "Bosch", model: "WQG24100TR", configuration: "Bosch WQG24100TR / TR / heat-pump / drying-only", identifiers: { productId: offeringIds.BOSCH, gtin: "4242005281251", documentCode: "9001745932" } },
} as const;

const sources: readonly CatalogSource[] = Object.freeze([
  { sourceId: sourceIds.KMX_PRODUCT, kind: "OFFICIAL", uri: "https://www.beko.com.tr/8-kg-kurutma-makinesi/kmx-82-kurutma-makinesi", version: "observed-2026-09-03", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "EXACT", status: "REVIEWED", language: "tr-TR" },
  { sourceId: sourceIds.KMX_FICHE, kind: "OFFICIAL", uri: "https://gsim2hwnpbvwtwmb1dg11z6.blob.core.windows.net/media/documents/7184270260_MDM_PRODUCT_FICHE_EU_2021_tr_TR.pdf", version: "7184270260/2026-09-04", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "EXACT", status: "VERIFIED", artifactSha256: "sha256:95513f4f61249307b795ec77a1b49d226f869f89a0d377dfedc8f3c574dd15ae", language: "tr-TR", documentCode: "7184270260" },
  { sourceId: sourceIds.KMX_MANUAL, kind: "MANUAL", uri: "https://gsim2hwnpbvwtwmb1dg11z6.blob.core.windows.net/media/documents/7184270260_MDM2_USER_MANUAL_FILE_tr_TR.pdf", version: "2960314264_TR/30-01-26", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "BOUNDED", status: "VERIFIED", artifactSha256: "sha256:6928129d754bece05ca0c1594f6650d3941d0662598d691e9d83802ac477c6df", language: "tr-TR", documentCode: "2960314264_TR" },
  { sourceId: sourceIds.KM99_PRODUCT, kind: "OFFICIAL", uri: "https://www.beko.com.tr/kurutma-makinesi/km-99-kurutma-makinesi", version: "parent-reviewed-2026-09-03", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "EXACT", status: "REVIEWED", language: "tr-TR" },
  { sourceId: sourceIds.BOSCH_PRODUCT, kind: "OFFICIAL", uri: "https://www.bosch-home.com.tr/tr/product/WQG24100TR", version: "observed-2026-09-03", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "EXACT", status: "VERIFIED", language: "tr-TR" },
  { sourceId: sourceIds.BOSCH_MANUAL, kind: "MANUAL", uri: "https://media3.bosch-home.com/Documents/9001745932_A.pdf", version: "9001745932/020510", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, market: "TR", applicabilityStatus: "EXACT", status: "VERIFIED", artifactSha256: "sha256:0788d7d66c3bd4ceb7bc889296de05a2e7af3b890d892adec456bd1ba8fb0f91", language: "tr-TR", documentCode: "9001745932" },
]);

const factsByOffering: Record<OfferingKey, readonly FactSpec[]> = {
  KMX82: [
    { key: "function", value: "DRYING_ONLY", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].technicalFacts.function" },
    { key: "installation", value: "FREESTANDING", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Tip: Bağımsız" },
    { key: "technology", value: "HEAT_PUMP", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Isı pompası ile donatılmış" },
    { key: "ratedDryLoadCapacity", value: 8, unit: "kg", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Anma kapasitesi" },
    { key: "bodyWidth", value: 598, unit: "mm", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Boyutlar; exact manual p.13 refines 59.8 cm", limitations: ["Fiche rounds width to 60 cm; the asserted 598 mm value is inherited from the approved parent and corroborated by the exact-model-list manual."] },
    { key: "bodyHeight", value: 846, unit: "mm", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].technicalFacts.heightMm", limitations: ["The fiche lists rounded height 85 cm; 846 mm remains the approved parent value."] },
    { key: "bodyDepth", value: 545, unit: "mm", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Boyutlar; exact manual p.13: 54.5 cm" },
    { key: "weightedEnergyPerCycle", value: 1.44, unit: "kWh/cycle", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Kurutma döngüsü başına ağırlıklı enerji tüketimi", limitations: ["This value must not be compared with annual consumption or a named-program/load measurement."] },
    { key: "acousticAirborneNoise", value: 64, unit: "dB(A) re 1 pW", sourceId: sourceIds.KMX_FICHE, locator: "PDF p.1 / Akustik hava kaynaklı gürültü emisyonu", limitations: ["Standardized declaration is not a promise of perceived quietness in a home."] },
  ],
  KM99: [
    { key: "function", value: "DRYING_ONLY", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.function" },
    { key: "installation", value: "FREESTANDING", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.installation" },
    { key: "technology", value: "HEAT_PUMP", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.technology" },
    { key: "ratedDryLoadCapacity", value: 9, unit: "kg", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.capacityKg", limitations: ["The official product page was automation-blocked during preparation; this assertion preserves the approved parent value and review status."] },
    { key: "bodyWidth", value: 597, unit: "mm", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.widthMm" },
    { key: "bodyHeight", value: 846, unit: "mm", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.heightMm" },
    { key: "bodyDepth", value: 654, unit: "mm", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.depthMm" },
    { key: "annualEnergyUnknownRegime", value: 194.4, unit: "kWh/year", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.annualEnergyKwh", limitations: ["Measurement regime is unresolved; excluded from comparison dimensions and advantage claims."] },
    { key: "noiseUnknownRegime", value: 64, unit: "dB(A)", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].technicalFacts.noiseDbA", limitations: ["Measurement regime is unresolved; excluded from comparison dimensions and quietness claims."] },
  ],
  BOSCH: [
    { key: "function", value: "DRYING_ONLY", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.function" },
    { key: "installation", value: "FREESTANDING", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.installation" },
    { key: "technology", value: "HEAT_PUMP", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.technology" },
    { key: "ratedDryLoadCapacity", value: 9, unit: "kg", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.capacityKg", limitations: ["Manual p.50 corroboration remains L9 and is not the L1 authority."] },
    { key: "bodyWidth", value: 598, unit: "mm", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.widthMm" },
    { key: "bodyHeight", value: 842, unit: "mm", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.heightMm" },
    { key: "bodyDepth", value: 613, unit: "mm", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.depthMm" },
    { key: "doorClosedDepth", value: 648, unit: "mm", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.doorClosedDepthMm" },
    { key: "doorOpenDepth", value: 1096, unit: "mm", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].technicalFacts.doorOpenDepthMm" },
  ],
};

const capabilitiesByOffering: Record<OfferingKey, readonly CapabilitySpec[]> = {
  KMX82: [
    { key: "directDrain", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].capabilities.directDrain" },
    { key: "sensorDrying", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].capabilities.sensorDrying", limitations: ["Sensor presence does not guarantee a drying outcome for every load."] },
    ...["DELICATE_CARE", "DUVET_DRYING", "HYGIENIC_DRYING", "EXPRESS_30"].map((key) => ({ key: `program.${key}`, sourceId: sourceIds.KMX_PRODUCT, locator: `domain-pack.products[BEKO_KMX_82_TR].capabilities.programs.${key}`, limitations: ["Program presence does not guarantee a fabric-care, hygiene, speed, or dryness outcome."] })),
    { key: "maintenance.lintFilter", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].capabilities.maintenance.LINT_FILTER" },
    { key: "maintenance.condenserPeriodic", sourceId: sourceIds.KMX_PRODUCT, locator: "domain-pack.products[BEKO_KMX_82_TR].capabilities.maintenance.CONDENSER_PERIODIC" },
  ],
  KM99: [
    { key: "directDrain", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].capabilities.directDrain" },
    { key: "sensorDrying", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].capabilities.sensorDrying", limitations: ["Sensor presence does not guarantee a drying outcome for every load."] },
    { key: "quietProgram", sourceId: sourceIds.KM99_PRODUCT, locator: "domain-pack.products[BEKO_KM_99_TR].capabilities.quietProgram", limitations: ["Program name does not establish lower standardized noise or perceived quietness."] },
    ...["WOOL_CARE", "DUVET_DRYING", "OUTDOOR_CARE", "HYGIENIC_DRYING", "EXPRESS_30"].map((key) => ({ key: `program.${key}`, sourceId: sourceIds.KM99_PRODUCT, locator: `domain-pack.products[BEKO_KM_99_TR].capabilities.programs.${key}`, limitations: ["Program presence does not guarantee a fabric-care, hygiene, speed, or dryness outcome."] })),
  ],
  BOSCH: [
    { key: "directDrain", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].capabilities.directDrain" },
    { key: "sensorDrying", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].capabilities.sensorDrying", limitations: ["Sensor presence does not guarantee a drying outcome for every load."] },
    { key: "maintenance.lintFilter", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].capabilities.maintenance.LINT_FILTER" },
    { key: "maintenance.baseUnitFilter", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].capabilities.maintenance.BASE_UNIT_FILTER" },
    { key: "maintenance.condensateContainer", sourceId: sourceIds.BOSCH_PRODUCT, locator: "domain-pack.products[BOSCH_WQG24100TR].capabilities.maintenance.CONDENSATE_CONTAINER" },
  ],
};

const slug = (value: string) => value.replace(/[^A-Za-z0-9]+/gu, "-").replace(/^-|-$/gu, "").toLowerCase();
const id = (prefix: string, ...parts: string[]) => `${prefix}:${parts.map(slug).join(":")}`;

export function buildDryerRichnessRelease(): XpyCatalogRelease {
  const evidence: CatalogEvidence[] = [];
  const facts: ObjectiveFact[] = [];
  const capabilities: Capability[] = [];

  for (const offeringKey of Object.keys(offeringIds) as OfferingKey[]) {
    const offeringId = offeringIds[offeringKey];
    const identity = identities[offeringKey];
    for (const spec of factsByOffering[offeringKey]) {
      const evidenceId = id("dryer-evidence", offeringId, "fact", spec.key);
      evidence.push({ evidenceId, kind: "TECHNICAL", sourceId: spec.sourceId, assertionId: id("dryer-assertion", offeringId, spec.key), offeringIds: [offeringId], market: "TR", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, confidence: spec.sourceId === sourceIds.KM99_PRODUCT ? "MEDIUM" : "HIGH", status: sources.find((item) => item.sourceId === spec.sourceId)?.status === "VERIFIED" ? "VERIFIED" : "REVIEWED", limitations: [...(spec.limitations ?? [])], assertion: { locator: spec.locator, value: spec.value, ...(spec.unit ? { unit: spec.unit } : {}), applicability: { offeringId, market: "TR", model: identity.model, configuration: identity.configuration, status: "EXACT" } } });
      facts.push({ factId: id("dryer-fact", offeringId, spec.key), offeringId, key: spec.key, value: spec.value, ...(spec.unit ? { unit: spec.unit } : {}), evidenceId });
    }
    for (const spec of capabilitiesByOffering[offeringKey]) {
      const evidenceId = id("dryer-evidence", offeringId, "capability", spec.key);
      const state = spec.state ?? "PRESENT";
      evidence.push({ evidenceId, kind: "CAPABILITY", sourceId: spec.sourceId, assertionId: id("dryer-assertion", offeringId, spec.key), offeringIds: [offeringId], market: "TR", observedAt: "2026-09-03T00:00:00.000+03:00", reviewedAt: DRYER_REVIEWED_AT, confidence: spec.sourceId === sourceIds.KM99_PRODUCT ? "MEDIUM" : "HIGH", status: sources.find((item) => item.sourceId === spec.sourceId)?.status === "VERIFIED" ? "VERIFIED" : "REVIEWED", limitations: [...(spec.limitations ?? [])], assertion: { locator: spec.locator, value: state, applicability: { offeringId, market: "TR", model: identity.model, configuration: identity.configuration, status: "EXACT" } } });
      capabilities.push({ capabilityId: id("dryer-capability", offeringId, spec.key), offeringId, key: spec.key, state, evidenceId, limitations: [...(spec.limitations ?? [])] });
    }
  }

  const factIds = (key: string) => facts.filter((item) => item.key === key).map((item) => item.factId);
  const capabilityIds = (prefix: string) => capabilities.filter((item) => item.key === prefix || item.key.startsWith(`${prefix}.`)).map((item) => item.capabilityId);
  const usageSemantics: UsageSemantic[] = [
    { semanticId: "dryer-semantic:load-fit", meaning: "Rated dry-load capacity is a maximum published load context; household fit also depends on actual load size, textile mix and drying frequency.", factIds: factIds("ratedDryLoadCapacity"), capabilityIds: [] },
    { semanticId: "dryer-semantic:installation-fit", meaning: "Body and door-state dimensions may be checked only against the corresponding user-provided space bound; airflow, routing and manufacturer installation instructions remain separate constraints.", factIds: [...factIds("bodyWidth"), ...factIds("bodyHeight"), ...factIds("bodyDepth"), ...factIds("doorClosedDepth"), ...factIds("doorOpenDepth")], capabilityIds: [] },
    { semanticId: "dryer-semantic:energy-comparability", meaning: "Energy values are comparable only under the same measurement regime, program, load, initial moisture and unit; a declared value is not a household-bill promise.", factIds: [...factIds("weightedEnergyPerCycle"), ...factIds("annualEnergyUnknownRegime")], capabilityIds: [] },
    { semanticId: "dryer-semantic:noise-comparability", meaning: "Only the same standardized acoustic-airborne-noise context may be compared; quiet-program naming and home perception are different claims.", factIds: [...factIds("acousticAirborneNoise"), ...factIds("noiseUnknownRegime")], capabilityIds: capabilityIds("quietProgram") },
    { semanticId: "dryer-semantic:care-programs", meaning: "An exact program name establishes availability only; textile labels, stated program load limits and the manual govern use, and no care or hygiene outcome is promised.", factIds: [], capabilityIds: capabilityIds("program") },
    { semanticId: "dryer-semantic:maintenance", meaning: "Published filter, condenser and condensate tasks describe user work; actual frequency and effort vary with load, lint and installation conditions.", factIds: [], capabilityIds: capabilityIds("maintenance") },
    { semanticId: "dryer-semantic:direct-drain", meaning: "Direct-drain capability can avoid routine tank emptying only when the exact installation permits a compliant hose route; it is not installation suitability by itself.", factIds: [], capabilityIds: capabilityIds("directDrain") },
    { semanticId: "dryer-semantic:sensor-control", meaning: "Sensor drying describes control capability; load composition, selected target and sensor cleanliness can affect operation, so dryness is not guaranteed.", factIds: [], capabilityIds: capabilityIds("sensorDrying") },
  ];

  const needs: UserNeed[] = [
    ["DRYING_CAPACITY", "Needed rated dry-load capacity"], ["DRYING_FREQUENCY", "Frequency and volume planning context"], ["BULKY_TEXTILES", "Bulky textile program need"], ["LOW_NOISE_PRIORITY", "Comparable standardized-noise priority"], ["INSTALLATION_FIT", "Physical and installation fit"], ["DIRECT_DRAIN_NEED", "Direct condensate drain need"], ["LOW_MAINTENANCE_PREFERENCE", "Maintenance-task tolerance"], ["DELICATE_CARE", "Delicate textile program need"], ["WOOL_CARE", "Wool textile program need"], ["DUVET_DRYING", "Duvet program need"], ["OUTDOOR_CARE", "Outdoor textile program need"], ["HYGIENIC_DRYING", "Hygienic drying program need"], ["BUDGET_SENSITIVITY", "Budget constraint evaluated only against external current price authority"],
  ].map(([needId, meaning]) => ({ needId, meaning }));

  const mappings: NeedEvidenceMapping[] = [
    { mappingId: "dryer-need-map:capacity", needId: "DRYING_CAPACITY", eligibleFactIds: factIds("ratedDryLoadCapacity"), eligibleCapabilityIds: [], policy: "HARD_FILTER" },
    { mappingId: "dryer-need-map:frequency", needId: "DRYING_FREQUENCY", eligibleFactIds: [...factIds("ratedDryLoadCapacity"), ...factIds("weightedEnergyPerCycle")], eligibleCapabilityIds: [], policy: "QUESTION_INPUT" },
    { mappingId: "dryer-need-map:installation", needId: "INSTALLATION_FIT", eligibleFactIds: [...factIds("bodyWidth"), ...factIds("bodyHeight"), ...factIds("bodyDepth"), ...factIds("doorClosedDepth"), ...factIds("doorOpenDepth")], eligibleCapabilityIds: [], policy: "HARD_FILTER" },
    { mappingId: "dryer-need-map:direct-drain", needId: "DIRECT_DRAIN_NEED", eligibleFactIds: [], eligibleCapabilityIds: capabilityIds("directDrain"), policy: "HARD_FILTER" },
    { mappingId: "dryer-need-map:maintenance", needId: "LOW_MAINTENANCE_PREFERENCE", eligibleFactIds: [], eligibleCapabilityIds: capabilityIds("maintenance"), policy: "QUESTION_INPUT" },
    { mappingId: "dryer-need-map:low-noise", needId: "LOW_NOISE_PRIORITY", eligibleFactIds: factIds("acousticAirborneNoise"), eligibleCapabilityIds: [], policy: "SOFT_PREFERENCE" },
    ...(["DELICATE_CARE", "WOOL_CARE", "DUVET_DRYING", "OUTDOOR_CARE", "HYGIENIC_DRYING"] as const).map((needId) => ({ mappingId: `dryer-need-map:${slug(needId)}`, needId, eligibleFactIds: [], eligibleCapabilityIds: capabilities.filter((item) => item.key === `program.${needId}`).map((item) => item.capabilityId), policy: "HARD_FILTER" as const })),
    { mappingId: "dryer-need-map:bulky", needId: "BULKY_TEXTILES", eligibleFactIds: factIds("ratedDryLoadCapacity"), eligibleCapabilityIds: capabilities.filter((item) => item.key === "program.DUVET_DRYING").map((item) => item.capabilityId), policy: "QUESTION_INPUT" },
  ];

  const personaSignals: PersonaPlanningSignal[] = [
    { signalId: "dryer-planning:space-constrained", needIds: ["INSTALLATION_FIT", "DIRECT_DRAIN_NEED"], authority: "DOMAIN_PLANNING", classification: "DERIVED_PLANNING", decisionUse: "NONE", directCandidateEffect: "NONE" },
    { signalId: "dryer-planning:frequent-or-large-load", needIds: ["DRYING_FREQUENCY", "DRYING_CAPACITY", "BULKY_TEXTILES"], authority: "DOMAIN_PLANNING", classification: "DERIVED_PLANNING", decisionUse: "NONE", directCandidateEffect: "NONE" },
    { signalId: "dryer-planning:fabric-care", needIds: ["DELICATE_CARE", "WOOL_CARE", "DUVET_DRYING", "OUTDOOR_CARE", "HYGIENIC_DRYING"], authority: "DOMAIN_PLANNING", classification: "DERIVED_PLANNING", decisionUse: "NONE", directCandidateEffect: "NONE" },
    { signalId: "dryer-planning:maintenance-sensitive", needIds: ["LOW_MAINTENANCE_PREFERENCE"], authority: "DOMAIN_PLANNING", classification: "DERIVED_PLANNING", decisionUse: "NONE", directCandidateEffect: "NONE" },
  ];

  const interpretations: DailyLifeInterpretation[] = [];
  const addInterpretation = (offeringKey: OfferingKey, suffix: string, text: string, factKeys: readonly string[], capabilityPrefixes: readonly string[], limitations: readonly string[], nonGuarantees: readonly string[], polarity: DailyLifeInterpretation["polarity"] = "NEUTRAL") => {
    const offeringId = offeringIds[offeringKey];
    interpretations.push({ interpretationId: id("dryer-interpretation", offeringId, suffix), offeringId, text, factIds: facts.filter((item) => item.offeringId === offeringId && factKeys.includes(item.key)).map((item) => item.factId), capabilityIds: capabilities.filter((item) => item.offeringId === offeringId && capabilityPrefixes.some((prefix) => item.key === prefix || item.key.startsWith(`${prefix}.`))).map((item) => item.capabilityId), method: "DETERMINISTIC_REVIEWED_MAPPING", reviewedAt: DRYER_REVIEWED_AT, polarity, limitations: [...limitations], nonGuarantees: [...nonGuarantees] });
  };
  for (const offeringKey of Object.keys(offeringIds) as OfferingKey[]) {
    addInterpretation(offeringKey, "capacity", "The published capacity is useful for checking a stated minimum dry-load requirement, but it is not a people-to-kilograms formula.", ["ratedDryLoadCapacity"], [], ["Actual load composition and program limits still apply."], ["No household-size fit or throughput guarantee."]);
    addInterpretation(offeringKey, "installation", "Published body dimensions can be checked against like-for-like space bounds; missing door-open depth stays unknown and neutral.", ["bodyWidth", "bodyHeight", "bodyDepth", "doorClosedDepth", "doorOpenDepth"], [], ["Clearance, ventilation, hose and stacking instructions require the applicable manual."], ["No installation-fit guarantee without a complete user-space envelope."]);
    addInterpretation(offeringKey, "drain", "A verified direct-drain option may reduce routine condensate-container emptying when a compliant drain route is available.", [], ["directDrain"], ["Hose routing, height and connection limits remain model-specific."], ["No plumbing suitability or leak-free-operation guarantee."], "POSITIVE");
    addInterpretation(offeringKey, "sensor", "Sensor control can adapt an automatic cycle to measured moisture, while selection, load composition and sensor cleanliness still matter.", [], ["sensorDrying"], ["Use the exact manual for operation and cleaning."], ["No exact final-dryness or fabric-protection guarantee."], "POSITIVE");
  }
  addInterpretation("KMX82", "care", "The exact-model authority lists delicate, duvet, hygienic-drying and express programs, which can make those named use cases available within their stated limits.", [], ["program"], ["Textile care labels and program-specific loads remain controlling."], ["No hygiene, crease, speed, or fabric-protection outcome guarantee."], "POSITIVE");
  addInterpretation("KM99", "care", "The exact-model authority lists wool, duvet, outdoor, hygienic-drying and express programs plus a quiet mode, each usable only within its documented scope.", [], ["program", "quietProgram"], ["The exact user manual and measurement regimes are unresolved in this release."], ["No quietness, hygiene, speed, or fabric-protection outcome guarantee."], "POSITIVE");
  addInterpretation("KMX82", "maintenance", "The published lint-filter and condenser tasks indicate recurring user maintenance rather than a maintenance-free appliance.", [], ["maintenance"], ["Actual frequency depends on use and indicators."], ["No low-maintenance or performance guarantee."]);
  addInterpretation("BOSCH", "maintenance", "The published lint-filter, base-unit-filter and condensate-container tasks indicate multiple maintenance touchpoints; direct drain may change the container routine.", [], ["maintenance", "directDrain"], ["Follow the exact manual and on-device warnings."], ["No low-maintenance or uninterrupted-operation guarantee."]);
  addInterpretation("KMX82", "efficiency-noise", "The standardized fiche values support bounded evidence display, but household energy cost and perceived sound depend on use and environment.", ["weightedEnergyPerCycle", "acousticAirborneNoise"], [], ["Compare only identical measurement scope and units."], ["No low-bill or quiet-home guarantee."]);
  addInterpretation("KM99", "unknown-regimes", "The parent release contains energy and noise numbers whose measurement regimes are unresolved; they remain visible as facts but cannot establish an advantage.", ["annualEnergyUnknownRegime", "noiseUnknownRegime"], [], ["Excluded from governed comparison dimensions."], ["No efficiency or quietness claim."], "UNKNOWN");

  const knowledge: AdvisorKnowledge[] = [];
  const addKnowledge = (offeringKey: "KMX82" | "BOSCH", section: string, text: string, kind: AdvisorKnowledge["knowledgeKind"], applicability: AdvisorKnowledge["applicability"], limitations: readonly string[]) => {
    const offeringId = offeringIds[offeringKey];
    const sourceId = offeringKey === "KMX82" ? sourceIds.KMX_MANUAL : sourceIds.BOSCH_MANUAL;
    const source = sources.find((item) => item.sourceId === sourceId)!;
    const evidenceId = id("dryer-evidence", offeringId, "manual", section);
    evidence.push({ evidenceId, kind: "MANUAL", sourceId, assertionId: id("dryer-manual-assertion", offeringId, section), offeringIds: [offeringId], market: "TR", observedAt: source.observedAt, reviewedAt: DRYER_REVIEWED_AT, confidence: applicability === "EXACT_MODEL" ? "HIGH" : "MEDIUM", status: "VERIFIED", limitations: [...limitations], assertion: { locator: section, value: text, applicability: { offeringId, market: "TR", model: identities[offeringKey].model, configuration: identities[offeringKey].configuration, status: applicability === "EXACT_MODEL" ? "EXACT" : "BOUNDED" } } });
    knowledge.push({ knowledgeId: id("dryer-knowledge", offeringId, section), offeringId, offeringVersion: DRYER_RICHNESS_RELEASE_VERSION, market: "TR", sourceId, evidenceId, sourceSection: section, text, sourceArtifactSha256: source.artifactSha256!, language: source.language!, applicability, reviewAuthority: "APPLIANCES_DRYER_EVIDENCE_REVIEW/v0.2", reviewedAt: DRYER_REVIEWED_AT, limitations: [...limitations], knowledgeKind: kind, decisionAuthority: "NONE" });
  };
  const kmxBound = ["The manual covers KMX 81 and KMX 82; only text applicable to KMX 82 without optional-model inference is exposed.", "Read-only L9; it cannot establish equipment presence or enter L1/L8 without governed promotion."];
  addKnowledge("KMX82", "PDF p.13 / 3.1 Teknik özellikler", "The manual lists 8 kg maximum dry-load capacity and 59.8 × 84.6 × 54.5 cm body dimensions.", "MANUAL", "BOUNDED_MODEL_LIST", kmxBound);
  addKnowledge("KMX82", "PDF p.16 / 4.3 Su giderine bağlanması", "The supplied drain hose can route condensate directly; the manual specifies a maximum 80 cm connection height and no hose extension.", "INSTALLATION", "BOUNDED_MODEL_LIST", kmxBound);
  addKnowledge("KMX82", "PDF pp.21-23 / 6.4 Program seçimi ve tüketim tablosu", "Program descriptions, maximum loads, indicative durations, energy values and the 64 dB(A) declaration are model-manual operating context.", "USAGE", "BOUNDED_MODEL_LIST", [...kmxBound, "Program text does not guarantee care, hygiene, speed or dryness outcomes."]);
  addKnowledge("KMX82", "PDF pp.27-29 / 7 Bakım ve temizlik", "The manual requires lint-filter/door-area cleaning after each cycle, sensor cleaning four times yearly, condensate-container handling, and condenser inspection at least every six months.", "MAINTENANCE", "BOUNDED_MODEL_LIST", kmxBound);
  const boschBound = ["The manual cover and document code identify WQG24100TR exactly.", "Read-only L9; it cannot establish equipment presence or enter L1/L8 without governed promotion."];
  addKnowledge("BOSCH", "PDF pp.13-16 / 4.3-4.5 Kurma ve bağlama", "The manual states placement, stacking, drain-routing and leveling constraints, including model-specific drain connection ranges.", "INSTALLATION", "EXACT_MODEL", boschBound);
  addKnowledge("BOSCH", "PDF pp.19-27 / 6-9 Ekran, tuşlar, kurutma hedefi ve programlar", "The exact manual explains sensor-controlled automatic programs, target dryness, delicate/half-load/quiet controls and program-specific maximum loads.", "USAGE", "EXACT_MODEL", [...boschBound, "Manual descriptions are operating guidance, not guaranteed outcomes or L2 presence assertions."]);
  addKnowledge("BOSCH", "PDF pp.31-34,39 / 12.9-12.11 and 15.3", "The exact manual describes lint-filter, base-unit-filter, condensate-container and moisture-sensor maintenance.", "MAINTENANCE", "EXACT_MODEL", boschBound);
  addKnowledge("BOSCH", "PDF pp.49-50 / 19 Tüketim değerleri and 20 Teknik veriler", "The exact manual publishes program/load/moisture-specific energy values and body/door-state dimensions, with an explicit warning that actual values vary by load, environment and options.", "LIMITATION", "EXACT_MODEL", [...boschBound, "These values remain L9 and are not promoted into decision evidence in this release."]);

  const evidenceIdsByOffering = (offeringId: string) => evidence.filter((item) => item.offeringIds.includes(offeringId) && item.kind !== "MANUAL").map((item) => item.evidenceId);
  const mappingIdsByOffering = (offeringId: string) => mappings.filter((mapping) => [...mapping.eligibleFactIds, ...mapping.eligibleCapabilityIds].some((entityId) => facts.some((item) => item.factId === entityId && item.offeringId === offeringId) || capabilities.some((item) => item.capabilityId === entityId && item.offeringId === offeringId))).map((item) => item.mappingId);
  const semanticPayload = { version: DRYER_SEMANTIC_AUTHORITY_VERSION, usageSemantics, needs, mappings, personaSignals, interpretations, comparisonPolicy: "DOMAIN_PACK_ONLY_NEUTRAL_UNKNOWN_FAIL_CLOSED" };
  const semanticAuthorityDigest = `sha256:${createHash("sha256").update(JSON.stringify(semanticPayload)).digest("hex")}` as const;
  const unsigned: Omit<XpyCatalogRelease, "releaseDigest"> = {
    schemaVersion: XPY_CATALOG_VERSION,
    releaseId: "appliances:dryer:catalog-richness:tr:v0.2",
    releaseVersion: DRYER_RICHNESS_RELEASE_VERSION,
    departmentId: "APPLIANCES",
    categoryId: "DRYER",
    market: "TR",
    lifecycle: "FROZEN",
    effectiveAt: DRYER_REVIEWED_AT,
    compatibility: { runtime: { version: XPY_RUNTIME_VERSION, digest: XPY_RUNTIME_DIGEST, domainPackId: pack.domainPackId }, domainPackVersion: pack.domainPackId, semanticAuthorityVersion: DRYER_SEMANTIC_AUTHORITY_VERSION, semanticAuthorityDigest, revisionClass: "SEMANTIC_POLICY_CHANGE", semanticAuthorityChange: "VERSIONED_CHANGE" },
    sources,
    evidence: Object.freeze(evidence),
    offerings: Object.freeze((Object.keys(offeringIds) as OfferingKey[]).map((key) => ({ offeringId: offeringIds[key], market: "TR", lifecycle: "FROZEN" as const, validFrom: "2026-09-03T12:00:00.000+03:00", identity: { kind: "PRODUCT" as const, ...identities[key] } }))),
    layers: {
      l1Facts: Object.freeze(facts), l2Capabilities: Object.freeze(capabilities), l3UsageSemantics: Object.freeze(usageSemantics), l4Needs: Object.freeze(needs), l4NeedEvidenceMappings: Object.freeze(mappings), l5PersonaSignals: Object.freeze(personaSignals), l6DailyLifeInterpretations: Object.freeze(interpretations), l7ExperienceRules: Object.freeze([]),
      l8DecisionProjections: Object.freeze(Object.values(offeringIds).map((offeringId) => ({ projectionId: id("dryer-decision-projection", offeringId), offeringId, eligibleEvidenceIds: evidenceIdsByOffering(offeringId), needMappingIds: mappingIdsByOffering(offeringId), limitations: ["Only explicit approved Dryer needs and evidence-compatible scopes may be projected.", "Unknown evidence is neutral; no score, weight, implicit tie-break, persona influence or manual-to-fact promotion is permitted."], disclosures: ["This read projection does not change Dryer AŞAMA 1 candidate evaluation, Y authorization or commerce ordering.", "Energy, noise, care, convenience and maintenance outcomes are not guaranteed."], traceability: "EXACT" as const }))),
      l9AdvisorKnowledge: Object.freeze(knowledge),
    },
    externalBoundaries: { commerce: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", media: "EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY", offerIdentityAuthority: "NONE", offerRankingAuthority: "NONE", affiliateRankingAuthority: "NONE" },
  };
  const release = Object.freeze({ ...unsigned, releaseDigest: xpyCatalogReleaseDigest(unsigned) });
  const issues = validateXpyCatalogRelease(release);
  if (issues.length) throw new TypeError(`DRYER_RICHNESS_RELEASE_INVALID:${issues.join(",")}`);
  const disciplineIssues = validateDryerRichnessDiscipline(release);
  if (disciplineIssues.length) throw new TypeError(`DRYER_RICHNESS_DISCIPLINE_INVALID:${disciplineIssues.join(",")}`);
  return release;
}

export const DRYER_COMPARISON_DIMENSIONS: readonly XpyComparisonDimension[] = Object.freeze([
  { dimensionId: "dryer.rated-dry-load-capacity", humanLabel: "Anma kuru yük kapasitesi", scope: "EXACT_TR_CONFIGURATION_RATED_DRY_LOAD", source: { kind: "FACT", key: "ratedDryLoadCapacity", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.body-width", humanLabel: "Gövde genişliği", scope: "EXACT_TR_CONFIGURATION_BODY", source: { kind: "FACT", key: "bodyWidth", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.body-height", humanLabel: "Gövde yüksekliği", scope: "EXACT_TR_CONFIGURATION_BODY", source: { kind: "FACT", key: "bodyHeight", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.body-depth", humanLabel: "Gövde derinliği", scope: "EXACT_TR_CONFIGURATION_BODY", source: { kind: "FACT", key: "bodyDepth", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.door-open-depth", humanLabel: "Kapak açık derinlik", scope: "EXACT_TR_CONFIGURATION_DOOR_OPEN_ENVELOPE", source: { kind: "FACT", key: "doorOpenDepth", unitPolicy: "SAME_UNIT_REQUIRED" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.direct-drain", humanLabel: "Doğrudan su tahliyesi", scope: "EXACT_TR_CONFIGURATION_CAPABILITY", source: { kind: "CAPABILITY", key: "directDrain", unitPolicy: "STATE_ONLY" }, authority: "DOMAIN_PACK" },
  { dimensionId: "dryer.sensor-drying", humanLabel: "Sensör kontrollü kurutma", scope: "EXACT_TR_CONFIGURATION_CAPABILITY", source: { kind: "CAPABILITY", key: "sensorDrying", unitPolicy: "STATE_ONLY" }, authority: "DOMAIN_PACK" },
]);

export const DRYER_RICHNESS_COUNTS = Object.freeze({
  sources: sources.length,
  offerings: Object.keys(offeringIds).length,
  objectiveFacts: Object.values(factsByOffering).flat().length,
  capabilities: Object.values(capabilitiesByOffering).flat().length,
  usageSemantics: 8,
  needs: 13,
  needEvidenceMappings: 12,
  personaSignals: 4,
  dailyLifeInterpretations: 18,
  experienceRules: 0,
  decisionProjections: 3,
  advisorKnowledge: 8,
  exactManualProducts: 1,
  boundedModelListManualProducts: 1,
  unresolvedManualProducts: 1,
});

export type DryerRichnessDisciplineIssue =
  | "MEMBERSHIP_OR_IDENTITY_CHANGED"
  | "ASSERTION_LEVEL_PROVENANCE_MISSING"
  | "MANUAL_TO_FACT_LEAKAGE"
  | "PERSONA_DECISION_INFLUENCE"
  | "EXPERIENCE_AUTHORITY_FABRICATED"
  | "CROSS_DOMAIN_SEMANTIC_LEAKAGE"
  | "KM99_MANUAL_APPLICABILITY_INVENTED"
  | "MANUAL_OPTIONAL_FEATURE_PROMOTED"
  | "EXTERNAL_AUTHORITY_LEAKAGE";

export function validateDryerRichnessDiscipline(release: XpyCatalogRelease): readonly DryerRichnessDisciplineIssue[] {
  const issues: DryerRichnessDisciplineIssue[] = [];
  const add = (issue: DryerRichnessDisciplineIssue) => { if (!issues.includes(issue)) issues.push(issue); };
  const expectedIds = Object.values(offeringIds).sort();
  const actualIds = release.offerings.map((item) => item.offeringId).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds) || release.offerings.some((item) => item.identity.kind !== "PRODUCT" || item.market !== "TR" || item.identity.model !== identities[(Object.keys(offeringIds) as OfferingKey[]).find((key) => offeringIds[key] === item.offeringId)!]?.model)) add("MEMBERSHIP_OR_IDENTITY_CHANGED");
  if (release.evidence.some((item) => !item.assertion || !item.assertion.locator || item.assertion.applicability.offeringId !== item.offeringIds[0])) add("ASSERTION_LEVEL_PROVENANCE_MISSING");
  const evidenceById = new Map(release.evidence.map((item) => [item.evidenceId, item]));
  if ([...release.layers.l1Facts.map((item) => item.evidenceId), ...release.layers.l2Capabilities.map((item) => item.evidenceId), ...release.layers.l8DecisionProjections.flatMap((item) => item.eligibleEvidenceIds)].some((evidenceId) => evidenceById.get(evidenceId)?.kind === "MANUAL")) add("MANUAL_TO_FACT_LEAKAGE");
  if (release.layers.l5PersonaSignals.some((item) => item.classification !== "DERIVED_PLANNING" || item.decisionUse !== "NONE" || item.directCandidateEffect !== "NONE")) add("PERSONA_DECISION_INFLUENCE");
  if (release.layers.l7ExperienceRules.length || release.evidence.some((item) => item.kind === "EXPERIENCE")) add("EXPERIENCE_AUTHORITY_FABRICATED");
  const semanticText = JSON.stringify({ usage: release.layers.l3UsageSemantics, needs: release.layers.l4Needs, persona: release.layers.l5PersonaSignals, dailyLife: release.layers.l6DailyLifeInterpretations }).toLocaleLowerCase("tr-TR");
  if (/\b(vehicle|automotive|engine|powertrain|trim|sedan|suv|horsepower|tork|şanzıman|motor hacmi)\b/u.test(semanticText)) add("CROSS_DOMAIN_SEMANTIC_LEAKAGE");
  if (release.layers.l9AdvisorKnowledge.some((item) => item.offeringId === offeringIds.KM99)) add("KM99_MANUAL_APPLICABILITY_INVENTED");
  if (release.layers.l2Capabilities.some((item) => item.offeringId === offeringIds.BOSCH && item.key.startsWith("program."))) add("MANUAL_OPTIONAL_FEATURE_PROMOTED");
  if (release.externalBoundaries.offerIdentityAuthority !== "NONE" || release.externalBoundaries.offerRankingAuthority !== "NONE" || release.externalBoundaries.affiliateRankingAuthority !== "NONE") add("EXTERNAL_AUTHORITY_LEAKAGE");
  return Object.freeze(issues);
}
