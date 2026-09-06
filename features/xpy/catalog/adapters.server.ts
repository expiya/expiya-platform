import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { requireXpyDomainPack } from "../domainPacks";
import type { CatalogGapImpact, CatalogLayerId, CatalogReadinessAssessment, CatalogCoverageStatus, XpyCatalogAuthorityAudit, XpyCatalogCoverageLayer } from "./contract";
import type { XpyCatalogRelease } from "./contract";
import { loadActiveDishwasherRichnessRelease } from "./dishwasherRichness.server";
import { loadActiveDryerRichnessRelease } from "./dryerRichness.server";
import { loadActiveRefrigeratorRichnessRelease } from "./refrigeratorRichness.server";
import { loadActiveRobotVacuumRichnessRelease } from "./robotVacuumRichness.server";
import { loadActiveVacuumRichnessRelease } from "./vacuumRichness.server";
import { loadActiveWashingMachineRichnessRelease } from "./washingMachineRichness.server";

type Json = Record<string, unknown>;

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");
const json = (raw: string) => JSON.parse(raw) as Json;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const record = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const string = (value: unknown): string => typeof value === "string" ? value : "";

const names: Record<CatalogLayerId, string> = {
  L0: "Offering identity",
  L1: "Governed objective facts",
  L2: "Capabilities and deliverables",
  L3: "Usage and consumption semantics",
  L4: "User needs and Need-to-Evidence",
  L5: "Persona and context planning signals",
  L6: "Daily-life interpretation",
  L7: "Experience and review evidence",
  L8: "Decision projection",
  L9: "Advisor, knowledge, and manuals",
  L10: "External commercial offer and media",
};

function layer(layerId: CatalogLayerId, status: CatalogCoverageStatus, authoritativeFiles: readonly string[], measuredCount: number, missing: readonly string[], impact: CatalogGapImpact): XpyCatalogCoverageLayer {
  return Object.freeze({ layer: layerId, name: names[layerId], status, authoritativeFiles, measuredCount, missing: Object.freeze([...missing]), impact });
}

const readiness = (status: CatalogReadinessAssessment["status"], blockers: readonly string[]): CatalogReadinessAssessment => Object.freeze({ status, blockers: Object.freeze([...blockers]) });

export interface ActiveArtifactEnvelope {
  readonly pointerRelease: string;
  readonly artifactRelease: string;
  readonly pointerDigest: string;
  readonly artifactRaw: string;
  readonly market: string;
  readonly expectedMarket: string;
  readonly offeringIds: readonly string[];
  readonly evidenceOfferingIds: readonly string[];
}

export function validateActiveArtifactEnvelope(input: ActiveArtifactEnvelope): readonly string[] {
  const failures: string[] = [];
  if (input.pointerRelease !== input.artifactRelease) failures.push("RELEASE_VERSION_MISMATCH");
  if (input.pointerDigest.replace(/^sha256:/u, "") !== sha256(input.artifactRaw)) failures.push("DIGEST_MISMATCH");
  if (input.market !== input.expectedMarket) failures.push("CROSS_MARKET_LEAKAGE");
  if (new Set(input.offeringIds).size !== input.offeringIds.length) failures.push("IDENTITY_COLLISION");
  const ids = new Set(input.offeringIds);
  if (input.evidenceOfferingIds.some((id) => !ids.has(id))) failures.push("DANGLING_EVIDENCE");
  return Object.freeze(failures);
}

async function readJsonFile(root: string, relative: string): Promise<{ raw: string; value: Json }> {
  const raw = await readFile(path.join(root, relative), "utf8");
  return { raw, value: json(raw) };
}

function collectProvenanceSourceIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectProvenanceSourceIds(item, ids));
  } else if (value && typeof value === "object") {
    const item = value as Json;
    if (typeof item.sourceId === "string") ids.add(item.sourceId);
    Object.values(item).forEach((child) => collectProvenanceSourceIds(child, ids));
  }
  return ids;
}

function countProvenanceFields(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countProvenanceFields(item), 0);
  if (!value || typeof value !== "object") return 0;
  const item = value as Json;
  return (Array.isArray(item.provenance) && "value" in item ? 1 : 0) + Object.values(item).reduce<number>((sum, child) => sum + countProvenanceFields(child), 0);
}

async function auditCars(root: string): Promise<XpyCatalogAuthorityAudit> {
  const pack = requireXpyDomainPack("CARS");
  const activeFile = "data/production/catalog/active.json";
  const active = (await readJsonFile(root, activeFile)).value;
  const version = string(active.active_catalog_release_version);
  const releaseBase = `data/production/catalog/releases/v${version}`;
  const [{ raw: catalogRaw, value: catalog }, { value: manifest }, { value: facets }] = await Promise.all([
    readJsonFile(root, `${releaseBase}/catalog.json`),
    readJsonFile(root, `${releaseBase}/manifest.json`),
    readJsonFile(root, `${releaseBase}/decision-facets.json`),
  ]);
  const records = list(catalog.records).map(record);
  const offeringIds = records.map((item) => string(record(item.variant).id));
  const failures = [...validateActiveArtifactEnvelope({
    pointerRelease: version,
    artifactRelease: string(manifest.catalog_release_version),
    pointerDigest: string(active.catalog_payload_hash),
    artifactRaw: catalogRaw,
    market: string(catalog.market),
    expectedMarket: "TR",
    offeringIds,
    evidenceOfferingIds: offeringIds,
  })];
  if (records.some((item) => string(record(item.variant).market) !== "TR")) failures.push("CROSS_MARKET_LEAKAGE");

  const [dailyPointer, equipmentPointer, personaPointer, manualReport, dailyManifest, equipmentPayload, equipmentDailyPayload, exactEquipmentDailyLife, personaPayload] = await Promise.all([
    readJsonFile(root, "data/production/technical-daily-life/active.json"),
    readJsonFile(root, "data/production/equipment-evidence/active.json"),
    readJsonFile(root, "data/production/personas/safe-traits/active.json"),
    readJsonFile(root, "data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/coverage-report.json"),
    readJsonFile(root, "data/production/technical-daily-life/releases/v2.1.3-0.55.4-2026-08-20-compatibility-rebind/manifest.json"),
    readJsonFile(root, "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json"),
    readJsonFile(root, "data/production/equipment-daily-life/releases/v1.0.1-catalog-v0.55.4-2026-08-20/equipment-daily-life.json"),
    readJsonFile(root, "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/equipment-daily-life-exact-applications.json"),
    readJsonFile(root, "data/production/personas/safe-traits/releases/v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24/vehicle-persona-safe-traits.json"),
  ]);
  const compatible = `v${version}`;
  for (const pointer of [dailyPointer.value, equipmentPointer.value, personaPointer.value]) {
    if (string(pointer.compatibleCatalogRelease) !== compatible) failures.push("LAYER_CATALOG_COMPATIBILITY_MISMATCH");
  }
  const technicalFieldCount = countProvenanceFields(records.map((item) => item.variant));
  const sourceCount = collectProvenanceSourceIds(records).size;
  const dailyCounts = record(dailyManifest.value.counts);
  const mappingCount = Number(dailyCounts.mappings ?? 0);
  const equipmentCoverage = record(equipmentPayload.value.coverage);
  const verifiedCoverage = record(equipmentCoverage.verifiedAssertionCoverage);
  const associationCoverage = record(equipmentCoverage.reviewedAssociationOnlyCoverage);
  const equipmentCovered = Number(equipmentCoverage.coveredUniqueExactVariantCount ?? 0);
  const personaVariants = list(personaPayload.value.variants).map(record);
  const personaCovered = personaVariants.filter((item) => list(item.traits).length > 0).length;
  const exactManual = Number(record(manualReport.value.counts).globalExactVariantsAfter ?? 0);
  const equipmentDailyCount = list(equipmentDailyPayload.value.entries).length;
  const exactEquipmentDailyLifeCount = list(exactEquipmentDailyLife.value.applications).length;
  const exactEquipmentDailyLifeVariantCount = new Set(list(exactEquipmentDailyLife.value.applications).map((item) => string(record(item).exactVariantId))).size;
  const facetCount = list(facets.facets).length;
  const authorityFiles = [activeFile, `${releaseBase}/manifest.json`, `${releaseBase}/catalog.json`];
  return Object.freeze({
    departmentId: "CARS", categoryId: "NEW_CAR", offeringKind: "PRODUCT", referenceRole: "ARCHITECTURE_AND_RICHNESS_REFERENCE_NOT_CONTENT_COMPLETE", authorityStatus: failures.length ? "FAILED_CLOSED" : "READY", failureReasons: Object.freeze(failures),
    activeRelease: `v${version}`, activeDigest: string(active.catalog_payload_hash), domainPackVersion: pack.domainPackId, runtimeVersion: pack.runtimeVersion, runtimeDigest: pack.runtimeDigest,
    productCount: records.length, sourceCount, evidenceBearingProductCount: records.length, manualCoveredProductCount: exactManual, dailyLifeMappingCount: mappingCount + exactEquipmentDailyLifeCount,
    personaCoveredProductCount: personaCovered, advisorArtifactCount: 2, decisionProjectionCount: records.length,
    downstreamReadiness: Object.freeze({
      advisorReadProjection: readiness("PARTIAL", [`${exactEquipmentDailyLifeVariantCount} priority variants expose ${exactEquipmentDailyLifeCount} governed exact equipment explanations, but exact-TR manual coverage is ${exactManual}/549 and technical daily-life coverage remains partial`]),
      comparisonEvidenceProjection: readiness("PARTIAL", [`${exactEquipmentDailyLifeCount} exact capability interpretations are comparison-readable with neutral unknowns; Domain Pack comparison dimensions/labels and Need-to-Evidence bindings remain unregistered`]),
      exampleComparisonTable: readiness("PARTIAL", ["Five decision facets exist, but no versioned example-table definition is registered"]),
      paidComparisonReport: readiness("PARTIAL", ["Evidence can be projected read-only, but no standardized paid-report entitlement/report contract is registered"]),
    }),
    layers: Object.freeze([
      layer("L0", "COMPLETE", authorityFiles, records.length, [], "ASAMA_1"),
      layer("L1", "PARTIAL", [`${releaseBase}/catalog.json`, "data/governance/xpy-catalog/v0.1/cars-exact-variant-gap-inventory.json"], technicalFieldCount, ["No exact variant is content-complete across all 31 audited technical fields; blanks remain UNKNOWN, ABSENT, or NOT_APPLICABLE"], "ASAMA_2"),
      layer("L2", "PARTIAL", ["data/production/equipment-evidence/active.json", "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json"], Number(verifiedCoverage.exactVariantCount ?? 0) + Number(associationCoverage.exactVariantCount ?? 0), [`${records.length - equipmentCovered} exact variants have no verified/reviewed equipment coverage`, "Pinned owner-reviewed evidence is read-only; the active runtime pointer remains unchanged"], "ASAMA_2"),
      layer("L3", "PARTIAL", ["features/decision/v3/usageSemantics.ts", "docs/xpy-cars-stage1-behavior-parity-v1.md"], facetCount, ["Usage semantics are runtime/domain policy rather than a release-bound populated registry"], "RICHNESS_ONLY"),
      layer("L4", "PARTIAL", ["docs/cars-requirement-to-evidence-policy-v0.1.md", `${releaseBase}/decision-facets.json`], facetCount, ["Need-to-Evidence mappings are not a standalone digest-bound catalog artifact"], "ASAMA_2"),
      layer("L5", personaCovered === records.length ? "COMPLETE" : "PARTIAL", ["data/production/personas/safe-traits/active.json", "data/production/personas/safe-traits/releases/v1.1.0-persona-evidence-v3.9-catalog-v0.55.4-2026-08-24/vehicle-persona-safe-traits.json"], personaCovered, [`${records.length - personaCovered} variants intentionally have no approved safe trait`], "RICHNESS_ONLY"),
      layer("L6", "PARTIAL", ["data/production/technical-daily-life/active.json", "data/production/technical-daily-life/releases/v2.1.3-0.55.4-2026-08-20-compatibility-rebind/technical-daily-life.json", "data/production/equipment-daily-life/active.json", "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04/equipment-daily-life-exact-applications.json"], mappingCount + equipmentDailyCount + exactEquipmentDailyLifeCount, ["Technical-field population averages about 49%; exact equipment applications are governed read projections but are not active public-runtime authority"], "ASAMA_2"),
      layer("L7", "ABSENT", [], 0, ["No active, provenance-governed product experience/review aggregate is registered"], "RICHNESS_ONLY"),
      layer("L8", "COMPLETE", [`${releaseBase}/decision-facets.json`, "features/decision/v3/ledger.ts", "features/decision/v3/evaluation/runJourney.ts"], records.length, [], "ASAMA_1"),
      layer("L9", "PARTIAL", ["data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/coverage-report.json", "features/vehicle-data/ownerManualEvidence.ts", "features/decision/v3/carsAdvisory.ts"], exactManual, [`${records.length - exactManual} variants have no exact-TR promoted manual assertion`, "Owner-manual corpus remains read-only L9 authority and cannot silently enter L1/L8 or Y"], "ASAMA_2"),
      layer("L10", "PARTIAL", ["data/production/rec-offer-audit-foundation", "data/production/media/official-vehicle-media.json"], records.length, ["Legacy activeNewPrice remains embedded in the Cars payload; merchant offers and media are separately governed"], "RICHNESS_ONLY"),
    ]),
  });
}

const applianceConfig = {
  WASHING_MACHINE: { slug: "washing-machines", release: "APPLIANCES-WM-TR-v0.1", loadRichness: loadActiveWashingMachineRichnessRelease },
  DRYER: { slug: "dryers", release: "APPLIANCES-DRYER-TR-v0.1", loadRichness: loadActiveDryerRichnessRelease },
  REFRIGERATOR: { slug: "refrigerators", release: "APPLIANCES-REFRIGERATOR-TR-v0.1", loadRichness: loadActiveRefrigeratorRichnessRelease },
  DISHWASHER: { slug: "dishwashers", release: "APPLIANCES-DISHWASHER-TR-v0.1", loadRichness: loadActiveDishwasherRichnessRelease },
  VACUUM: { slug: "vacuums", release: "APPLIANCES-VACUUM-TR-v0.1", loadRichness: loadActiveVacuumRichnessRelease },
  ROBOT_VACUUM: { slug: "robot-vacuums", release: "APPLIANCES-ROBOT-VACUUM-TR-v0.1", loadRichness: loadActiveRobotVacuumRichnessRelease },
} as const;

export type AuditedApplianceCategory = keyof typeof applianceConfig;

function countCommerceCoverage(csv: string, category: string): number {
  return csv.split(/\r?\n/u).slice(1).filter((row) => row.startsWith(`"${category}"`) && !row.includes(",0,")).length;
}

async function auditAppliance(root: string, category: AuditedApplianceCategory, commerceCsv: string): Promise<XpyCatalogAuthorityAudit> {
  const pack = requireXpyDomainPack("APPLIANCES");
  const config = applianceConfig[category];
  const activeFile = `data/production/appliances/${config.slug}/active.json`;
  const active = (await readJsonFile(root, activeFile)).value;
  const release = string(active.releaseVersion);
  const base = `data/production/appliances/${config.slug}/releases/${release}`;
  const isWashingMachine = category === "WASHING_MACHINE";
  const artifactFile = `${base}/${isWashingMachine ? "catalog.json" : "domain-pack.json"}`;
  const { raw, value: artifact } = await readJsonFile(root, artifactFile);
  const products = list(artifact.products).map(record);
  const offeringIds = products.map((item) => string(item.productId));
  const failures: string[] = [];
  let digest = string(active.artifactSha256);
  let sourceCount = 0;
  let technicalFactCount = 0;
  let capabilityCount = 0;
  let evidenceBearingProductCount = 0;
  let conceptCount = 0;
  let needMappingCount = 0;
  let personaCount = 0;
  let dailyLifePolicyCount = 0;
  let advisorArtifactCount = 0;
  const authorityFiles = [activeFile, artifactFile];

  if (isWashingMachine) {
    const [{ value: manifest }, semanticFile] = await Promise.all([readJsonFile(root, `${base}/manifest.json`), readJsonFile(root, `${base}/semantic-registry.json`)]);
    authorityFiles.push(`${base}/manifest.json`, `${base}/semantic-registry.json`);
    digest = string(manifest.catalogDigest);
    failures.push(...validateActiveArtifactEnvelope({ pointerRelease: release, artifactRelease: string(artifact.releaseVersion), pointerDigest: string(manifest.catalogArtifactSha256), artifactRaw: raw, market: "TR", expectedMarket: "TR", offeringIds, evidenceOfferingIds: [...list(artifact.technicalFacts), ...list(artifact.capabilityFacts)].map((item) => string(record(item).productId)) }));
    if (string(manifest.semanticRegistryDigest) !== sha256(semanticFile.raw)) failures.push("SEMANTIC_DIGEST_MISMATCH");
    const semanticArtifacts = record(semanticFile.value.artifacts);
    const recordCount = (key: string) => {
      const value = record(semanticArtifacts[key]).records;
      return Array.isArray(value) ? value.length : Object.keys(record(value)).length;
    };
    sourceCount = list(artifact.sources).length;
    technicalFactCount = list(artifact.technicalFacts).length;
    capabilityCount = list(artifact.capabilityFacts).length;
    evidenceBearingProductCount = new Set([...list(artifact.technicalFacts), ...list(artifact.capabilityFacts)].map((item) => string(record(item).productId))).size;
    conceptCount = recordCount("washing-machine-usage-semantics/v1");
    needMappingCount = recordCount("washing-machine-need-evidence-mappings/v1");
    personaCount = Object.keys(record(record(semanticArtifacts["washing-machine-persona-signals/v1"]).records)).length;
    dailyLifePolicyCount = list(record(semanticArtifacts["washing-machine-daily-life-interpretations/v1"]).modes).length;
    advisorArtifactCount = Object.keys(record(semanticArtifacts["washing-machine-advisor-knowledge-schema/v1"])).length ? 1 : 0;
  } else {
    digest = string(active.artifactSha256);
    const evidenceRefs = products.flatMap((item) => list(item.evidenceRefs).map(String));
    failures.push(...validateActiveArtifactEnvelope({ pointerRelease: release, artifactRelease: string(artifact.releaseVersion), pointerDigest: digest, artifactRaw: raw, market: string(artifact.market), expectedMarket: "TR", offeringIds, evidenceOfferingIds: offeringIds }));
    const sourceIds = new Set(list(artifact.sources).map((item) => string(record(item).sourceId)));
    if (evidenceRefs.some((id) => !sourceIds.has(id))) failures.push("DANGLING_EVIDENCE");
    if (string(artifact.productType) !== category || string(artifact.departmentId) !== "APPLIANCES") failures.push("AUTHORITY_SCOPE_MISMATCH");
    sourceCount = sourceIds.size;
    technicalFactCount = products.reduce((sum, item) => sum + Object.values(record(item.technicalFacts)).filter((value) => value !== null).length, 0);
    capabilityCount = products.reduce((sum, item) => sum + Object.keys(record(item.capabilities)).length, 0);
    evidenceBearingProductCount = products.filter((item) => list(item.evidenceRefs).length > 0).length;
    conceptCount = list(artifact.concepts).length;
  }
  const externalOfferCount = countCommerceCoverage(commerceCsv, category);
  const l1Complete = isWashingMachine && evidenceBearingProductCount === products.length;
  const activeRichness = await config.loadRichness(root) as
    | { status: "READY"; release: XpyCatalogRelease; manifest: { membershipDigest: string }; activation: { decisionAuthority: { releaseVersion: string; ySemantics: string } } }
    | { status: "READY"; release: XpyCatalogRelease; manifest: { membershipDigest: string }; activation: { state: "ACTIVE_READ_ONLY_CATALOG_MEMBERSHIP"; categories: readonly { categoryId: string; decisionReleaseVersion: string; releaseVersion: string }[] } }
    | { status: "FAILED_CLOSED"; reason: string };
  if (activeRichness.status === "READY") {
      const child = `data/production/appliances/${config.slug}/richness/releases/${activeRichness.release.releaseVersion}`;
      const releaseFiles = [`${child}/manifest.json`, `${child}/catalog-release.json`, `${child}/semantic-registry.json`, `${child}/coverage-report.json`, `${child}/read-projections.json`];
      const release = activeRichness.release;
      const coverage = (await readJsonFile(root, `${child}/coverage-report.json`)).value;
      const coverageAfter = Object.keys(record(coverage.after)).length ? record(coverage.after) : record(coverage.layers);
      const coverageCounts = record(coverage.counts);
      const unresolved = list(coverage.unresolvedGlobal).map(String).concat(list(record(coverage.unknownLedger).global).map(String));
      const manualProducts = new Set(release.layers.l9AdvisorKnowledge.map((item) => item.offeringId)).size;
      const layerStatus = (id: CatalogLayerId): CatalogCoverageStatus => {
        const value = coverageAfter[id];
        if (typeof value !== "string") return "PARTIAL";
        if (value.startsWith("COMPLETE")) return "COMPLETE";
        if (value.startsWith("ABSENT")) return "ABSENT";
        if (value.startsWith("NOT_APPLICABLE")) return "NOT_APPLICABLE";
        return "PARTIAL";
      };
      const layerMissing = (id: CatalogLayerId): readonly string[] => layerStatus(id) === "COMPLETE" ? [] : unresolved.filter((item) => new RegExp(`\\b${id}\\b`, "u").test(item));
      const legacyDecisionAuthority = "decisionAuthority" in activeRichness.activation ? activeRichness.activation.decisionAuthority : undefined;
      const majorActivationBinding = "categories" in activeRichness.activation
        ? activeRichness.activation.categories.find((item) => item.categoryId === category)
        : undefined;
      const decisionReleaseVersion = string(active.releaseVersion);
      const richnessFailures = legacyDecisionAuthority
        ? legacyDecisionAuthority.releaseVersion !== config.release || legacyDecisionAuthority.ySemantics !== "UNCHANGED" ? ["RICHNESS_DECISION_AUTHORITY_MISMATCH"] : []
        : !majorActivationBinding || majorActivationBinding.releaseVersion !== release.releaseVersion || majorActivationBinding.decisionReleaseVersion !== config.release
          ? ["RICHNESS_DECISION_AUTHORITY_MISMATCH"]
          : [];
      failures.push(...richnessFailures);
      return Object.freeze({
        departmentId: "APPLIANCES", categoryId: category, offeringKind: "PRODUCT", referenceRole: "CATEGORY_AUTHORITY", authorityStatus: failures.length ? "FAILED_CLOSED" : "READY", failureReasons: Object.freeze(failures),
        activeRelease: `${decisionReleaseVersion} decision/Y; ${release.releaseVersion} active read-only richness`, activeDigest: digest, domainPackVersion: pack.domainPackId, runtimeVersion: pack.runtimeVersion, runtimeDigest: pack.runtimeDigest,
        productCount: release.offerings.length, sourceCount: release.sources.length, evidenceBearingProductCount: new Set(release.evidence.flatMap((item) => item.offeringIds)).size, manualCoveredProductCount: manualProducts, dailyLifeMappingCount: release.layers.l6DailyLifeInterpretations.length,
        personaCoveredProductCount: release.layers.l5PersonaSignals.length, advisorArtifactCount: Number(coverageCounts.advisorReadProjectionsGenerated ?? 0), decisionProjectionCount: release.layers.l8DecisionProjections.length,
        downstreamReadiness: Object.freeze({
          advisorReadProjection: readiness("READY", []),
          comparisonEvidenceProjection: readiness("READY", []),
          exampleComparisonTable: readiness("READY", []),
          paidComparisonReport: readiness("PARTIAL", ["The evidence projection is ready; paid report/payment/Sales Advisor runtime remains outside this work unit."]),
        }),
        layers: Object.freeze([
          layer("L0", layerStatus("L0"), [...authorityFiles, ...releaseFiles], release.offerings.length, layerMissing("L0"), "ASAMA_1"),
          layer("L1", layerStatus("L1"), releaseFiles, release.layers.l1Facts.length, layerMissing("L1"), "ASAMA_2"),
          layer("L2", layerStatus("L2"), releaseFiles, release.layers.l2Capabilities.length, layerMissing("L2"), "ASAMA_2"),
          layer("L3", layerStatus("L3"), releaseFiles, release.layers.l3UsageSemantics.length, layerMissing("L3"), "RICHNESS_ONLY"),
          layer("L4", layerStatus("L4"), releaseFiles, release.layers.l4NeedEvidenceMappings.length, layerMissing("L4"), "ASAMA_2"),
          layer("L5", layerStatus("L5"), releaseFiles, release.layers.l5PersonaSignals.length, layerMissing("L5"), "RICHNESS_ONLY"),
          layer("L6", layerStatus("L6"), releaseFiles, release.layers.l6DailyLifeInterpretations.length, layerMissing("L6"), "ASAMA_2"),
          layer("L7", layerStatus("L7"), releaseFiles, release.layers.l7ExperienceRules.length, layerMissing("L7"), "RICHNESS_ONLY"),
          layer("L8", layerStatus("L8"), releaseFiles, release.layers.l8DecisionProjections.length, layerMissing("L8"), "ASAMA_1"),
          layer("L9", layerStatus("L9"), releaseFiles, release.layers.l9AdvisorKnowledge.length, layerMissing("L9"), "ASAMA_2"),
          layer("L10", "PARTIAL", ["data/production/appliances/commerce/current.json", "data/production/appliances/commerce/coverage-matrix.csv"], externalOfferCount, ["External volatile offer/media authority remains separate and incomplete"], "RICHNESS_ONLY"),
        ]),
      });
  }
  failures.push(`ACTIVE_RICHNESS_UNAVAILABLE:${activeRichness.reason}`);
  return Object.freeze({
    departmentId: "APPLIANCES", categoryId: category, offeringKind: "PRODUCT", referenceRole: "CATEGORY_AUTHORITY", authorityStatus: failures.length ? "FAILED_CLOSED" : "READY", failureReasons: Object.freeze(failures),
    activeRelease: release, activeDigest: digest, domainPackVersion: pack.domainPackId, runtimeVersion: pack.runtimeVersion, runtimeDigest: pack.runtimeDigest,
    productCount: products.length, sourceCount, evidenceBearingProductCount, manualCoveredProductCount: 0, dailyLifeMappingCount: 0,
    personaCoveredProductCount: 0, advisorArtifactCount, decisionProjectionCount: isWashingMachine ? 1 : 0,
    downstreamReadiness: Object.freeze(isWashingMachine ? {
      advisorReadProjection: readiness("PARTIAL", ["Advisor schema exists, but product-bound manual/maintenance/installation knowledge is not populated"]),
      comparisonEvidenceProjection: readiness("PARTIAL", ["Comparable governed facts and policy exist; populated daily-life comparison interpretations and a release-level projection audit are missing"]),
      exampleComparisonTable: readiness("PARTIAL", ["Domain semantics exist, but no versioned example-table dimensions and human labels are registered"]),
      paidComparisonReport: readiness("PARTIAL", ["No standardized paid-report entitlement/report contract is registered"]),
    } : {
      advisorReadProjection: readiness("BLOCKED", ["No product-bound daily-life or Advisor/manual knowledge authority", "Fact/capability provenance is product-level rather than assertion-level"]),
      comparisonEvidenceProjection: readiness("PARTIAL", ["Comparability policy and exact identities exist, but assertion-level evidence eligibility and Domain Pack comparison dimensions/labels are missing"]),
      exampleComparisonTable: readiness("BLOCKED", ["A universal renderer may not invent missing category-owned dimensions or human labels"]),
      paidComparisonReport: readiness("BLOCKED", ["Comparison evidence projection is not yet release-ready and no paid-report entitlement/report contract is registered"]),
    }),
    layers: Object.freeze([
      layer("L0", "COMPLETE", authorityFiles, products.length, [], "ASAMA_1"),
      layer("L1", l1Complete ? "COMPLETE" : "PARTIAL", [artifactFile], technicalFactCount, isWashingMachine ? [] : ["Evidence references are product-level, not field/assertion-level", "Some governed facts remain unknown/null by design"], "ASAMA_2"),
      layer("L2", isWashingMachine ? "COMPLETE" : "PARTIAL", [artifactFile], capabilityCount, isWashingMachine ? [] : ["Capability values lack independent assertion-level provenance and decision eligibility"], "ASAMA_2"),
      layer("L3", isWashingMachine ? "COMPLETE" : "PARTIAL", authorityFiles, conceptCount, isWashingMachine ? [] : ["Concept vocabulary exists, but no separate populated usage-semantics registry exists"], "RICHNESS_ONLY"),
      layer("L4", isWashingMachine ? "COMPLETE" : "PARTIAL", authorityFiles, needMappingCount || conceptCount, isWashingMachine ? [] : ["No explicit Need-to-Evidence mapping artifact"], "ASAMA_2"),
      layer("L5", isWashingMachine ? "COMPLETE" : "ABSENT", authorityFiles, personaCount, isWashingMachine ? [] : ["No category-governed persona/context planning registry"], "RICHNESS_ONLY"),
      layer("L6", isWashingMachine ? "PARTIAL" : "ABSENT", authorityFiles, dailyLifePolicyCount, isWashingMachine ? ["Interpretation modes and boundaries exist, but no populated product interpretation records"] : ["No technical-to-daily-life interpretation artifact"], "ASAMA_2"),
      layer("L7", "ABSENT", [], 0, ["No governed experience/review evidence with aggregation provenance"], "RICHNESS_ONLY"),
      layer("L8", "PARTIAL", authorityFiles, isWashingMachine ? 1 : 0, isWashingMachine ? ["Projection policy and runtime trace exist, but no release-level per-product projection coverage audit"] : ["Runtime emits exact identities, but the Domain Pack has no separate decision-projection policy/digest"], "ASAMA_1"),
      layer("L9", isWashingMachine ? "PARTIAL" : "ABSENT", authorityFiles, advisorArtifactCount, isWashingMachine ? ["Advisor schema exists; no product-bound manual/maintenance/installation knowledge is populated"] : ["No Advisor knowledge or exact-applicability manual artifact"], "ASAMA_2"),
      layer("L10", "PARTIAL", ["data/production/appliances/commerce/current.json", "data/production/appliances/commerce/coverage-matrix.csv"], externalOfferCount, ["External offer/media boundary is correct, but merchant/media coverage is incomplete"], "RICHNESS_ONLY"),
    ]),
  });
}

export async function auditActiveXpyCatalogAuthorities(root: string): Promise<readonly XpyCatalogAuthorityAudit[]> {
  const commerceCsv = await readFile(path.join(root, "data/production/appliances/commerce/coverage-matrix.csv"), "utf8");
  const categories = Object.keys(applianceConfig) as AuditedApplianceCategory[];
  const [cars, ...appliances] = await Promise.all([auditCars(root), ...categories.map((category) => auditAppliance(root, category, commerceCsv))]);
  return Object.freeze([cars, ...appliances]);
}
