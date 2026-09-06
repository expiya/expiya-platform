import { readFile } from "node:fs/promises";
import path from "node:path";

type Json = Record<string, unknown>;
const json = async (root: string, relative: string): Promise<Json> => JSON.parse(await readFile(path.join(root, relative), "utf8")) as Json;
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value : "";

type FieldState = "PRESENT_GOVERNED" | "PRESENT_PROVENANCE_PARTIAL" | "UNKNOWN_UNRESOLVED" | "ABSENT_FROM_ACTIVE_SCHEMA" | "NOT_APPLICABLE";

function valuesAtPath(root: unknown, rawPath: string): unknown[] {
  let values: unknown[] = [root];
  for (const rawPart of rawPath.split(".")) {
    const array = rawPart.endsWith("[]");
    const part = array ? rawPart.slice(0, -2) : rawPart;
    values = values.flatMap((value) => {
      const child = record(value)[part];
      if (array) return list(child);
      return child === undefined ? [] : [child];
    });
  }
  return values;
}

function hasProvenanceAtPath(root: unknown, rawPath: string): boolean {
  const parts = rawPath.split(".");
  for (let length = parts.length - 1; length > 0; length -= 1) {
    const values = valuesAtPath(root, parts.slice(0, length).join("."));
    if (values.length > 0 && values.every((value) => list(record(value).provenance).length > 0)) return true;
  }
  return false;
}

function fieldState(item: Json, field: Json): FieldState {
  // The active Cars authorities do not expose a field-level applicability
  // registry. Missing values therefore stay unresolved instead of being
  // inferred as N/A from powertrain or sibling-family knowledge.
  const catalogPath = text(field.catalogPath);
  if (!catalogPath) return "ABSENT_FROM_ACTIVE_SCHEMA";
  const values = valuesAtPath(item, catalogPath).filter((value) => value !== null && value !== undefined);
  if (!values.length) return "UNKNOWN_UNRESOLVED";
  return hasProvenanceAtPath(item, catalogPath) ? "PRESENT_GOVERNED" : "PRESENT_PROVENANCE_PARTIAL";
}

export const FIRST_CARS_ENRICHMENT_PROMPT = `EXPIYA PLATFORM — WU-XPY-CARS-OWNER-MANUAL-EXACT-TR-PILOT-01

Authoritative checkout: /Users/serdarakgul/Projects/expiya-platform

Objective:
Run a bounded evidence-first pilot to move exact Türkiye owner-manual coverage above the current 0/549 baseline for eight high-value Cars variants that already have in-repository Turkish manual candidates. Resolve exact model-year/trim/powertrain/market applicability, promote only assertions that satisfy the governed manual boundary, and leave every unprovable candidate explicitly unresolved. Do not infer from sibling trims, model families, foreign markets, or generic manual language.

Exact pilot variants:
- 11382bb9-bf71-52bf-9de8-81b6828e13d2 — BYD SEAL U EV
- 4c22cb31-e980-4dc8-8525-c47363783d96 — Toyota Yaris
- 6cb56615-37ef-51a8-9202-a73e59d4e14b — BYD DOLPHIN
- 733e13d4-f0d1-5ad0-9eac-a158d23e58c7 — Togg T10X
- 8332f9df-5df5-5626-9d5f-22fbed616a56 — Hyundai INSTER
- cf63bfb6-d503-5669-9799-6593f4b3f96b — Toyota Hilux
- a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b — Togg T10F
- 17059c89-031e-542a-90dd-83be8c972960 — Toyota Corolla Hatchback

Authority and safety boundaries:
- Start from active Cars catalog v0.55.4, owner-manual evidence v4, and the generated exact-variant gap inventory.
- Use primary manufacturer/manual artifacts. Record source ID, immutable artifact checksum, section heading and page/locator, observed/reviewed timestamps, language, Türkiye applicability, model year, trim, body, powertrain, and conditional-equipment language.
- A model-family manual remains L9 family capability unless exact applicability is independently proven. Generic instructions and optional/conditional equipment cannot become exact technical truth.
- No cross-trim/family inheritance, foreign-market leakage, VIN invention, blank filling, merchant evidence, web-scale acquisition, production DB mutation, deploy, reset, or clean.
- Manual knowledge has no decision authority. L1/L8 use requires an explicit XPY_CATALOG/v0.1 GOVERNED_PROMOTION with reviewer authority and exact offering binding.

Work:
1. Reconcile the eight exact IDs against catalog identity, market, model year, trim, body, and powertrain.
2. Inspect only their already captured Turkish manual artifacts and source registry entries; perform bounded source reacquisition only when the existing official URL is stale and access policy permits it.
3. Extract candidate assertions with immutable provenance and source sections/pages. Preserve negative, conditional, unknown, and conflict states.
4. Apply the exact-TR bridge policy. Promote eligible assertions; retain family-only knowledge separately; record a reason code for every unresolved candidate.
5. Regenerate versioned manual evidence/bridge manifests and digests while preserving prior releases and historical reproducibility.
6. Re-run XPY Catalog validation and the Cars exact-variant inventory; report before/after exact-manual coverage and Advisor/Comparison readiness for every pilot ID.

Acceptance:
- All eight IDs receive an auditable disposition; no target disappears from the report.
- Every promoted assertion has an exact variant ID, Türkiye market, applicable model year/trim/powertrain, primary manual source, section/page locator, immutable checksum, observedAt, reviewedAt, confidence/status, limitations, and reviewer authority.
- No sibling/family inference or conditional equipment is represented as exact presence/absence.
- Exact-TR coverage increases above 0 only through valid promotions; otherwise the work unit reports BLOCKED/PARTIAL and preserves 0 without fabrication.
- Catalog, semantic, Runtime, and Domain Pack compatibility is explicit; all regenerated digests validate and older artifacts remain reproducible.
- Focused owner-manual/catalog/Advisor projection tests, TypeScript, scoped lint, generated gap inventory, and git diff --check pass. Avoid production build while concurrent .next work is active.

Final report:
Verdict, exact-ID disposition table, accepted/family-only/unresolved assertion counts, before/after coverage delta, source/applicability evidence, changed files, validations, genuine blockers, and exactly one next bounded work unit.`;

export async function buildCarsExactVariantGapInventory(root: string, generatedAt = new Date().toISOString()) {
  const catalogPath = "data/production/catalog/releases/v0.55.4/catalog.json";
  const technicalPath = "data/production/technical-daily-life/releases/v2.1.3-0.55.4-2026-08-20-compatibility-rebind/technical-daily-life.json";
  const equipmentPath = "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json";
  const equipmentDailyLifePath = "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/equipment-daily-life-exact-applications.json";
  const personaPath = "data/production/personas/safe-traits/releases/v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24/vehicle-persona-safe-traits.json";
  const manualPath = "data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/exact-tr-bridge-decisions.json";
  const manifestPath = "data/production/catalog/releases/v0.55.4/manifest.json";
  const [catalog, technical, equipment, equipmentDailyLife, persona, manual, manifest] = await Promise.all([
    json(root, catalogPath), json(root, technicalPath), json(root, equipmentPath), json(root, equipmentDailyLifePath), json(root, personaPath), json(root, manualPath), json(root, manifestPath),
  ]);
  const fields = list(technical.fields).map(record);
  const verifiedByVariant = new Map<string, Json[]>();
  const associationByVariant = new Map<string, Json[]>();
  for (const item of list(equipment.verifiedAssertions).map(record)) verifiedByVariant.set(text(item.exactVariantId), [...(verifiedByVariant.get(text(item.exactVariantId)) ?? []), item]);
  for (const item of list(equipment.reviewedAssociations).map(record)) associationByVariant.set(text(item.exactVariantId), [...(associationByVariant.get(text(item.exactVariantId)) ?? []), item]);
  const dailyLifeApplicationsByVariant = new Map<string, Json[]>();
  for (const item of list(equipmentDailyLife.applications).map(record)) dailyLifeApplicationsByVariant.set(text(item.exactVariantId), [...(dailyLifeApplicationsByVariant.get(text(item.exactVariantId)) ?? []), item]);
  const personaFamilies = new Map(list(persona.families).map(record).map((item) => [text(item.familyId), item]));
  const personaVariants = new Map(list(persona.variants).map(record).map((item) => [text(item.exactVariantId), item]));
  const manualVariants = new Map(list(manual.variants).map(record).map((item) => [text(item.exactVariantId), item]));
  const declaredLimitations = list(manifest.declared_limitations).map(String);
  const variants = list(catalog.records).map(record).map((catalogRecord) => {
    const variant = record(catalogRecord.variant);
    const exactVariantId = text(variant.id);
    const fuelType = text(record(record(variant.powertrain).fuelType).value);
    const states = fields.map((field) => ({ field: text(field.technicalField), state: fieldState(catalogRecord, field), mappingCount: list(field.usageMappings).length, mappingStatus: text(field.dailyLifeLayerStatus) }));
    const byState = (state: FieldState) => states.filter((item) => item.state === state).map((item) => item.field);
    const governed = byState("PRESENT_GOVERNED");
    const provenancePartial = byState("PRESENT_PROVENANCE_PARTIAL");
    const unresolved = byState("UNKNOWN_UNRESOLVED");
    const absent = byState("ABSENT_FROM_ACTIVE_SCHEMA");
    const notApplicable = byState("NOT_APPLICABLE");
    const mappedGoverned = states.filter((item) => item.state === "PRESENT_GOVERNED" && item.mappingCount > 0 && !["NOT_READY", "INSUFFICIENT_COVERAGE"].includes(item.mappingStatus));
    const mappingGaps = states.filter((item) => !["NOT_APPLICABLE"].includes(item.state) && (item.mappingCount === 0 || ["NOT_READY", "INSUFFICIENT_COVERAGE"].includes(item.mappingStatus) || item.state !== "PRESENT_GOVERNED")).map((item) => item.field);
    const verified = verifiedByVariant.get(exactVariantId) ?? [];
    const associations = associationByVariant.get(exactVariantId) ?? [];
    const dailyLifeApplications = dailyLifeApplicationsByVariant.get(exactVariantId) ?? [];
    const personaVariant = personaVariants.get(exactVariantId);
    const personaFamily = personaFamilies.get(text(personaVariant?.familyId));
    const traits = list(personaVariant?.traits).map(String);
    const manualVariant = manualVariants.get(exactVariantId) ?? {};
    const manualDecisions = list(manualVariant.decisions).map(record);
    const exactManualAssertions = manualDecisions.filter((item) => text(item.decision) === "EXACT_VARIANT_VERIFIED" && text(item.authorityLevel) === "EXACT_VARIANT_VERIFIED").length;
    const factStatus = provenancePartial.length || unresolved.length || absent.length ? "PARTIAL" : "COMPLETE";
    const equipmentStatus = verified.length ? "PARTIAL_VERIFIED" : associations.length ? "PARTIAL_ASSOCIATION_ONLY" : "ABSENT";
    const personaStatus = traits.length ? "PRESENT_OWNER_APPROVED_SOFT_ONLY" : text(personaFamily?.ownerDecision) === "KEEP_EMPTY" ? "EMPTY_REVIEWED_NOT_MISSING" : "UNKNOWN_UNRESOLVED";
    const advisorBlockers = [
      ...(exactManualAssertions ? [] : ["NO_EXACT_TR_MANUAL_ASSERTION"]),
      ...(verified.length ? [] : ["NO_EXACT_VERIFIED_EQUIPMENT_ASSERTION"]),
      ...(mappingGaps.length ? ["DAILY_LIFE_MAPPING_PARTIAL"] : []),
    ];
    const decisionProjectionLimitations = [...declaredLimitations, ...advisorBlockers];
    return Object.freeze({
      exactVariantId,
      identity: Object.freeze({ brand: text(record(variant.brand).value), model: text(record(variant.model).value), trim: text(record(variant.trim).value), modelYear: record(variant.modelYear).value ?? null, fuelType, market: text(variant.market), lifecycle: text(variant.lifecycleStatus) }),
      objectiveFacts: Object.freeze({ status: factStatus, auditedFieldCount: fields.length, governedFieldCount: governed.length, presentWithPartialProvenance: Object.freeze(provenancePartial), unknownOrUnresolved: Object.freeze(unresolved), absentFromActiveSchema: Object.freeze(absent), notApplicable: Object.freeze(notApplicable), turkeyApplicability: text(variant.market) === "TR" ? "EXACT_CATALOG_MARKET_TR" : "CROSS_MARKET_BLOCKED" }),
      equipmentCapabilities: Object.freeze({ status: equipmentStatus, verifiedAssertionCount: verified.length, reviewedAssociationCount: associations.length, featureCodes: Object.freeze([...new Set([...verified, ...associations].map((item) => text(item.featureCode)).filter(Boolean))]) }),
      technicalToDailyLife: Object.freeze({ status: mappingGaps.length ? "PARTIAL" : "COMPLETE", governedMappedFieldCount: mappedGoverned.length, gapFields: Object.freeze(mappingGaps) }),
      equipmentDailyLife: Object.freeze({
        status: dailyLifeApplications.length ? "REVIEWED_READ_PROJECTION_ONLY" : "NO_EXACT_APPLICATION",
        exactApplicationCount: dailyLifeApplications.length,
        positiveApplicationCount: dailyLifeApplications.filter((item) => text(item.polarity) === "POSITIVE").length,
        negativeApplicationCount: dailyLifeApplications.filter((item) => text(item.polarity) === "NEGATIVE").length,
        exactManualSupportedApplicationCount: dailyLifeApplications.filter((item) => Object.keys(record(item.manualEvidence)).length > 0).length,
        featureCodes: Object.freeze(dailyLifeApplications.map((item) => text(item.featureCode))),
        activationState: "PINNED_GOVERNED_RELEASE_NOT_PUBLIC_RUNTIME_ACTIVE",
        decisionUse: "NONE",
      }),
      personaPlanning: Object.freeze({ status: personaStatus, traits: Object.freeze(traits), familyReviewStatus: text(personaFamily?.reviewStatus) || "UNKNOWN", decisionUse: text(personaVariant?.decisionUse) || "NONE" }),
      ownerManual: Object.freeze({ status: exactManualAssertions ? "EXACT_TR_VERIFIED" : "UNKNOWN_UNRESOLVED", exactAssertionCount: exactManualAssertions, bridgeStatus: text(manualVariant.bridgeStatus) || "NOT_RESEARCHED", familyCapabilityRetained: manualVariant.familyCapabilityRetained === true, familyArtifactSourceIds: Object.freeze(list(manualVariant.familyArtifactSourceIds).map(String)) }),
      advisorReadProjection: Object.freeze({ status: advisorBlockers.length ? "PARTIAL" : "READY", blockers: Object.freeze(advisorBlockers), readableEquipmentDailyLifeCount: dailyLifeApplications.length }),
      comparisonEvidenceProjection: Object.freeze({ status: "PARTIAL", comparableGovernedFieldCount: mappedGoverned.length, readableEquipmentDailyLifeCount: dailyLifeApplications.length, blockers: Object.freeze([...(mappingGaps.length ? ["COMPARABLE_FIELD_COVERAGE_PARTIAL"] : []), "DOMAIN_PACK_COMPARISON_DIMENSIONS_AND_LABELS_NOT_REGISTERED"]) }),
      decisionProjection: Object.freeze({ status: "AUTHORIZED_WITH_LIMITATIONS", limitations: Object.freeze(decisionProjectionLimitations) }),
    });
  }).sort((left, right) => left.exactVariantId.localeCompare(right.exactVariantId, "en"));
  const count = (predicate: (item: typeof variants[number]) => boolean) => variants.filter(predicate).length;
  return Object.freeze({
    schemaVersion: "XPY_CARS_EXACT_VARIANT_GAP_INVENTORY/v0.1",
    catalogContractVersion: "XPY_CATALOG/v0.1",
    generatedAt,
    referenceClassification: "ARCHITECTURE_AND_RICHNESS_REFERENCE_NOT_CONTENT_COMPLETE",
    activeCatalog: Object.freeze({ release: "v0.55.4", digest: text(manifest.catalog_payload_hash), exactVariantCount: variants.length }),
    authorityFiles: Object.freeze([catalogPath, manifestPath, technicalPath, equipmentPath, equipmentDailyLifePath, personaPath, manualPath]),
    stateSemantics: Object.freeze({ PRESENT_GOVERNED: "Value is populated with provenance.", PRESENT_PROVENANCE_PARTIAL: "Value exists but the audited path lacks full provenance.", UNKNOWN_UNRESOLVED: "Applicability/value is not established; it is not negative, worse, or N/A.", ABSENT_FROM_ACTIVE_SCHEMA: "The active catalog has no governed path for the field.", NOT_APPLICABLE: "Reserved for an explicit governed applicability rule; no current blank is inferred into this state." }),
    notApplicableClassificationPolicy: "EXPLICIT_GOVERNED_APPLICABILITY_ONLY_NO_ACTIVE_CARS_FIELD_RULE",
    summary: Object.freeze({
      exactVariantCount: variants.length,
      contentCompleteVariantCount: count((item) => item.objectiveFacts.status === "COMPLETE" && item.equipmentCapabilities.status === "PARTIAL_VERIFIED" && item.technicalToDailyLife.status === "COMPLETE" && item.ownerManual.status === "EXACT_TR_VERIFIED"),
      auditedFieldAssignments: variants.length * fields.length,
      governedFieldAssignments: variants.reduce((sum, item) => sum + item.objectiveFacts.governedFieldCount, 0),
      unknownOrUnresolvedFieldAssignments: variants.reduce((sum, item) => sum + item.objectiveFacts.unknownOrUnresolved.length, 0),
      absentFromActiveSchemaFieldAssignments: variants.reduce((sum, item) => sum + item.objectiveFacts.absentFromActiveSchema.length, 0),
      explicitNotApplicableFieldAssignments: variants.reduce((sum, item) => sum + item.objectiveFacts.notApplicable.length, 0),
      technicalToDailyLifeGapAssignments: variants.reduce((sum, item) => sum + item.technicalToDailyLife.gapFields.length, 0),
      variantsWithVerifiedEquipment: count((item) => item.equipmentCapabilities.verifiedAssertionCount > 0),
      variantsWithReviewedAssociationOnly: count((item) => item.equipmentCapabilities.verifiedAssertionCount === 0 && item.equipmentCapabilities.reviewedAssociationCount > 0),
      verifiedEquipmentAssertions: variants.reduce((sum, item) => sum + item.equipmentCapabilities.verifiedAssertionCount, 0),
      reviewedEquipmentAssociations: variants.reduce((sum, item) => sum + item.equipmentCapabilities.reviewedAssociationCount, 0),
      reviewedExactEquipmentDailyLifeApplications: variants.reduce((sum, item) => sum + item.equipmentDailyLife.exactApplicationCount, 0),
      variantsWithReviewedExactEquipmentDailyLifeApplications: count((item) => item.equipmentDailyLife.exactApplicationCount > 0),
      positiveExactEquipmentDailyLifeApplications: variants.reduce((sum, item) => sum + item.equipmentDailyLife.positiveApplicationCount, 0),
      negativeExactEquipmentDailyLifeApplications: variants.reduce((sum, item) => sum + item.equipmentDailyLife.negativeApplicationCount, 0),
      variantsWithNonEmptyPersonaTraits: count((item) => item.personaPlanning.traits.length > 0),
      variantsWithFamilyManualCapabilityOnly: count((item) => item.ownerManual.familyCapabilityRetained),
      variantsWithTurkishManualCandidates: count((item) => item.ownerManual.familyArtifactSourceIds.some((id) => id.endsWith("-TR"))),
      variantsWithExactTrManualAssertions: count((item) => item.ownerManual.exactAssertionCount > 0),
      advisorReadyVariants: count((item) => item.advisorReadProjection.status === "READY"),
      comparisonReadyVariants: 0,
    }),
    variants: Object.freeze(variants),
    carsEnrichmentPlan: Object.freeze([
      { sequence: 1, batch: "OWNER_MANUAL_EXACT_TR", baseline: "4/549 exact variants and 15 exact assertions after owner review 01", priorityBasis: "AŞAMA 2 Advisor authority and remaining Turkish manual candidates without exact trim bridges" },
      { sequence: 2, batch: "EQUIPMENT_CAPABILITY_EVIDENCE", baseline: "8 verified + 2 association-only / 549", priorityBasis: "Candidate discrimination and explanation integrity" },
      { sequence: 3, batch: "HIGH_MATERIALITY_TECHNICAL_TO_DAILY_LIFE", baseline: "117 mappings; about 49% aggregate field population", priorityBasis: "Decision and Advisor interpretation" },
      { sequence: 4, batch: "PERSONA_QUALITY_REMAINDER", baseline: "545/549 non-empty soft-only traits", priorityBasis: "Planning richness; never eligibility authority" },
      { sequence: 5, batch: "COMPARISON_AND_ADVISOR_PROJECTION_COMPLETENESS", baseline: "0 fully ready variants under strict combined gate", priorityBasis: "Paid report and bounded AŞAMA 2 readiness" },
    ]),
    firstBatch: Object.freeze({ workUnitId: "WU-XPY-CARS-OWNER-MANUAL-EXACT-TR-PILOT-01", status: "PARTIAL_COMPLETE", resultArtifact: "data/research/owner-manual-evidence-v4/releases/v4.1.0-exact-tr-pilot-01/coverage-report.json", exactVariantIds: Object.freeze(["11382bb9-bf71-52bf-9de8-81b6828e13d2", "4c22cb31-e980-4dc8-8525-c47363783d96", "6cb56615-37ef-51a8-9202-a73e59d4e14b", "733e13d4-f0d1-5ad0-9eac-a158d23e58c7", "8332f9df-5df5-5626-9d5f-22fbed616a56", "cf63bfb6-d503-5669-9799-6593f4b3f96b", "a6c5b4df-f0ce-5dd6-aa9a-3dcd770f6e0b", "17059c89-031e-542a-90dd-83be8c972960"]), executionPrompt: FIRST_CARS_ENRICHMENT_PROMPT }),
    secondBatch: Object.freeze({ workUnitId: "WU-XPY-CARS-EQUIPMENT-EVIDENCE-BATCH-01", status: "IMPLEMENTED", resultArtifact: "data/research/owner-manual-evidence-v4/releases/v4.2.0-equipment-evidence-batch-01/coverage-report.json", completedSourceAttempts: 7, independentlyReviewedAssociationProposals: 14, ownerApprovedAssociations: 0, manualBridgeCandidatesPendingOwnerApproval: 10 }),
    ownerReviewBatch: Object.freeze({ workUnitId: "WU-XPY-CARS-EQUIPMENT-PROPOSAL-OWNER-REVIEW-01", status: "IMPLEMENTED", resultArtifact: "data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/coverage-report.json", ownerDecisions: 14, approvedAssociations: 14, exactManualPromotions: 10 }),
    dailyLifeBatch: Object.freeze({ workUnitId: "WU-XPY-CARS-DAILY-LIFE-HIGH-MATERIALITY-01", status: "PARTIAL", resultArtifact: "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/coverage-report.json", inheritedDefinitions: 6, exactApplications: 20, exactManualSupportedApplications: 15, activePointerChanged: false }),
    nextBoundedWorkUnit: Object.freeze({ workUnitId: "WU-XPY-APPL-REFRIGERATOR-CATALOG-RICHNESS-01", objective: "Apply XPY_CATALOG/v0.1 assertion-level provenance and the Dryer-proven semantic/read-projection discipline to the exact Türkiye Refrigerator products without copying Dryer, Washing Machine or Cars meanings." }),
  });
}
