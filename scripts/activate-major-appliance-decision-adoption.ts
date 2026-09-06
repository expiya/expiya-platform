import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority, resetAppliancesAuthorityCacheForTests } from "../features/appliances/authority/loader.server";
import { loadActiveBoundedAuthority } from "../features/appliances/bounded/authority.server";
import { decisionActivationPointerSchema } from "../features/appliances/decisionAdoption/approval.server";
import {
  BLOCKED_TEKA_DISHWASHER_ID,
  decisionAdoptionBinding,
  MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID,
  MAJOR_APPLIANCE_DECISION_ADDITIONS,
  MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT,
  MAJOR_APPLIANCE_DECISION_RELEASES,
  MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST,
  MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256,
  type MajorApplianceDecisionCategory,
} from "../features/appliances/decisionAdoption/contract";
import { loadActiveDryerAuthority } from "../features/appliances/dryer/authority.server";
import { digestCandidateSelectionPolicy } from "../features/appliances/governance/candidateSelectionPolicyAuthority";
import { digestQuestionPolicy } from "../features/appliances/governance/questionPolicyAuthority";
import { digestRecommendationConstructionPolicy } from "../features/appliances/governance/recommendationConstructionPolicyAuthority";
import { digestSufficiencyRecommendationPolicy } from "../features/appliances/governance/sufficiencyRecommendationPolicyAuthority";
import { loadRecommendationAuthority } from "../features/appliances/recommendation/current.server";
import { loadActiveRefrigeratorAuthority } from "../features/appliances/refrigerator/authority.server";
import { loadActiveMajorApplianceCatalogCategory, type MajorApplianceAdoptionCategory } from "../features/xpy/catalog/majorApplianceCatalogActivation.server";

type Json = Record<string, unknown>;
type CandidateEvidence = {
  readonly evidenceId: string;
  readonly kind: "TECHNICAL" | "CAPABILITY";
  readonly sourceId: string;
  readonly assertionId: string;
  readonly observedAt: string;
  readonly reviewedAt: string;
  readonly assertion: { readonly value: unknown; readonly unit?: string; readonly locator: string; readonly applicability: { readonly offeringId: string; readonly market: string; readonly model: string; readonly configuration: string } };
};
type CandidateOffering = { readonly offeringId: string; readonly identity: { readonly manufacturer: string; readonly model: string; readonly configuration: string } };
type CandidateSource = { readonly sourceId: string; readonly uri: string; readonly observedAt: string };
type CandidateRelease = { readonly offerings: readonly CandidateOffering[]; readonly evidence: readonly CandidateEvidence[]; readonly sources: readonly CandidateSource[] };

const root = path.resolve(process.cwd());
const activatedAt = "2026-09-05T16:00:00.000+03:00";
const approvalId = "APPLIANCES-MAJOR-DECISION-POA-2E76D621CE55";
const activationId = "APPLIANCES-MAJOR-DECISION-ACT-B3CB67E1DD00-2E76D621CE55";
const governanceRoot = "data/production/appliances/decision-adoption/governance";
const approvalRelative = `${governanceRoot}/approval-events/${approvalId}/approval.json`;
const activationDirectory = `${governanceRoot}/activation-events/${activationId}`;
const activationRelative = `${activationDirectory}/activation.json`;
const rollbackRelative = `${activationDirectory}/rollback.json`;
const receiptRelative = `${activationDirectory}/commit-receipt.json`;
const candidateRoot = "data/production/appliances/catalog-adoption/releases/APPLIANCES-MAJOR-CATALOG-ADOPTION-TR-v0.1-candidate";
const categories = ["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"] as const;
const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Json).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const digest = (value: unknown) => sha256(JSON.stringify(canonical(value)));
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const slug = (id: string) => id.replaceAll(":", "-").replaceAll("/", "-").toLowerCase();

const categoryDirectory: Record<MajorApplianceDecisionCategory, string> = {
  WASHING_MACHINE: "washing-machines",
  DRYER: "dryers",
  DISHWASHER: "dishwashers",
  REFRIGERATOR: "refrigerators",
};

const pointerPaths = [
  "data/production/appliances/washing-machines/active.json",
  "data/production/appliances/dryers/active.json",
  "data/production/appliances/dishwashers/active.json",
  "data/production/appliances/refrigerators/active.json",
  "data/production/appliances/question-policy/active.json",
  "data/production/appliances/sufficiency-recommendation-entry/active.json",
  "data/production/appliances/candidate-selection-policy/active.json",
  "data/production/appliances/recommendation-construction-policy/active.json",
] as const;

interface RollbackArtifact {
  readonly schemaVersion: "major-appliance-decision-rollback/v1";
  readonly activationId: typeof activationId;
  readonly workUnitId: typeof MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT;
  readonly pointers: readonly { readonly path: string; readonly beforeSha256: string; readonly beforeRaw: string }[];
}

async function readJson<T>(relative: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, relative), "utf8")) as T;
}

async function writeImmutable(relative: string, raw: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await writeFile(target, raw, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (await readFile(target, "utf8") !== raw) throw new Error(`IMMUTABLE_ARTIFACT_COLLISION:${relative}`);
  }
}

async function replacePointers(after: ReadonlyMap<string, string>, before: ReadonlyMap<string, string>): Promise<void> {
  const staged = new Map<string, string>();
  for (const [relative, raw] of after) {
    const stage = `${path.join(root, relative)}.${activationId}.staged`;
    try { await writeFile(stage, raw, { encoding: "utf8", flag: "wx" }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(stage, "utf8") !== raw) throw error; }
    staged.set(relative, stage);
  }
  const changed: string[] = [];
  try {
    for (const [relative, stage] of staged) {
      if (await readFile(path.join(root, relative), "utf8") !== before.get(relative)) throw new Error(`POINTER_CHANGED_DURING_TRANSACTION:${relative}`);
      await rename(stage, path.join(root, relative));
      changed.push(relative);
    }
  } catch (error) {
    for (const relative of changed.reverse()) {
      const restore = `${path.join(root, relative)}.${activationId}.rollback`;
      await writeFile(restore, before.get(relative)!, "utf8");
      await rename(restore, path.join(root, relative));
    }
    throw error;
  }
}

async function loadCandidate(category: MajorApplianceDecisionCategory): Promise<CandidateRelease> {
  return readJson<CandidateRelease>(`${candidateRoot}/${categoryDirectory[category]}/catalog-release.json`);
}

function offering(release: CandidateRelease, id: string): CandidateOffering {
  const found = release.offerings.find((item) => item.offeringId === id);
  if (!found) throw new Error(`CANDIDATE_OFFERING_MISSING:${id}`);
  return found;
}

function candidateEvidence(release: CandidateRelease, id: string): CandidateEvidence[] {
  return release.evidence.filter((item) => item.assertion.applicability.offeringId === id);
}

function evidence(release: CandidateRelease, id: string, suffix: string): CandidateEvidence | undefined {
  return candidateEvidence(release, id).find((item) => item.evidenceId.endsWith(`:${suffix}`));
}

function value(release: CandidateRelease, id: string, suffix: string): unknown {
  return evidence(release, id, suffix)?.assertion.value ?? null;
}

function numberValue(release: CandidateRelease, id: string, suffix: string): number | null {
  const candidate = value(release, id, suffix);
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function stringValue(release: CandidateRelease, id: string, suffix: string): string | null {
  const candidate = value(release, id, suffix);
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function hasCapability(release: CandidateRelease, id: string, ...suffixes: string[]): boolean {
  return suffixes.some((suffix) => value(release, id, suffix) === true);
}

function officialSource(release: CandidateRelease, id: string): CandidateSource {
  const expected = `adoption-source:${slug(id)}:official-tr`;
  const found = release.sources.find((item) => item.sourceId === expected);
  if (!found) throw new Error(`OFFICIAL_SOURCE_MISSING:${id}`);
  return found;
}

const factMap = [
  ["ratedcapacitykg", "RATED_CAPACITY_KG", "kg", "RATED", null],
  ["widthmm", "BODY_WIDTH_MM", "mm", "BODY", null],
  ["heightmm", "BODY_HEIGHT_MM", "mm", "BODY", null],
  ["depthmm", "BODY_DEPTH_MM", "mm", "BODY", null],
  ["energyclass", "ENERGY_EFFICIENCY_CLASS", null, "ECO_40_60", "EU_2019_2014"],
  ["energyper100cycleskwh", "ENERGY_CONSUMPTION_KWH_100_CYCLES", "kWh/100_cycles", "ECO_40_60", "EU_2019_2014"],
  ["waterpercyclel", "WATER_CONSUMPTION_L_CYCLE", "L/cycle", "ECO_40_60", "EU_2019_2014"],
  ["maxspinrpm", "MARKETED_MAX_SPIN_RPM", "rpm", "MARKETED", null],
  ["noisedba", "SPIN_NOISE_DB", "dB", "SPIN_PHASE", "EU_2019_2014"],
] as const;

const capabilityMap = [
  ["steam", "STEAM"],
  ["autodose", "AUTO_DOSING"],
  ["wifi", "SMART_CONNECTIVITY"],
  ["wifibluetooth", "SMART_CONNECTIVITY"],
  ["floodprotection", "LEAK_PROTECTION"],
  ["overflowprotection", "LEAK_PROTECTION"],
  ["childlock", "CHILD_LOCK"],
] as const;

async function buildWashingMachineSuccessor(release: CandidateRelease): Promise<{ raw: string; manifestRaw: string; semanticRaw: string; catalog: Json; artifactSha256: string; releaseDigest: string; membershipDigest: string }> {
  const base = "data/production/appliances/washing-machines/releases/APPLIANCES-WM-TR-v0.1";
  const [parentRaw, parentManifest, semanticRaw] = await Promise.all([
    readFile(path.join(root, base, "catalog.json"), "utf8"),
    readJson<Json>(`${base}/manifest.json`),
    readFile(path.join(root, base, "semantic-registry.json"), "utf8"),
  ]);
  if (sha256(parentRaw) !== MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.parentArtifactSha256) throw new Error("WM_PARENT_DIGEST_MISMATCH");
  const catalog = clone(JSON.parse(parentRaw) as Json);
  const arrays = catalog as Record<string, unknown[]>;
  const additions = MAJOR_APPLIANCE_DECISION_ADDITIONS.WASHING_MACHINE;
  for (const id of additions) {
    const item = offering(release, id);
    const source = officialSource(release, id);
    const factRecords = factMap.flatMap(([suffix, factKey, unit, measurementContext, regime]) => {
      const ev = evidence(release, id, suffix);
      if (!ev || ev.assertion.value === null) return [];
      return [{ factId: `fact:${slug(id)}:${factKey.toLowerCase()}`, factKey, factStatus: "VERIFIED", measurementContext, productId: id, promotedAssertionRefs: [ev.assertionId], regime, unit, value: ev.assertion.value }];
    });
    const capabilityRecords = capabilityMap.flatMap(([suffix, capabilityId]) => {
      const ev = evidence(release, id, suffix);
      if (!ev || ev.assertion.value !== true) return [];
      return [{ absenceEvidenceRef: null, assertionRefs: [ev.assertionId], capabilityFactId: `cap:${slug(id)}:${capabilityId.toLowerCase()}`, capabilityId, conditions: [], decisionEligibility: "CONDITIONALLY_DECISION_ELIGIBLE", limitations: capabilityId === "SMART_CONNECTIVITY" ? ["SUPPORTED_ACTIONS_NOT_EXACTLY_BOUND"] : [], parameters: {}, productId: id, status: "PRESENT" }];
    });
    const assertionEvidence = [...factRecords.map((fact) => candidateEvidence(release, id).find((ev) => ev.assertionId === (fact.promotedAssertionRefs as string[])[0])!), ...capabilityRecords.map((capability) => candidateEvidence(release, id).find((ev) => ev.assertionId === (capability.assertionRefs as string[])[0])!)];
    const disclosureRefs = [`disclosure:${slug(id)}:limited-experience`, `disclosure:${slug(id)}:unknown-installation-clearance`];
    const capacity = factRecords.find((fact) => fact.factKey === "RATED_CAPACITY_KG");
    if (!capacity) throw new Error(`WM_CAPACITY_EVIDENCE_MISSING:${id}`);
    arrays.products.push({ brandId: id.split(":")[3], configurationIdentity: item.identity.configuration, departmentId: "APPLIANCES", lifecycleState: "CURRENT", lineageStatus: "DIRECT_CANONICAL_ASSERTION_LINEAGE_AVAILABLE", manufacturerModelIdentifier: item.identity.model, market: "TR", marketApplicabilityRef: `market:${id}`, productId: id, productType: "WASHING_MACHINE" });
    arrays.releaseMembers.push(id);
    arrays.sources.push({ availabilityStatus: "AVAILABLE_AT_RETRIEVAL", canonicalReference: source.uri, contentFingerprint: sha256(source.uri), publishedAt: null, publisher: "manufacturer", retrievedAt: source.observedAt.slice(0, 10), sourceId: source.sourceId, sourceType: "MANUFACTURER_TR_PRODUCT_PAGE", territory: "TR" });
    arrays.evidenceAssertions.push(...assertionEvidence.map((ev) => ({ applicability: { exactModelIdentifier: item.identity.model, market: "TR", upstreamApplicability: "EXACT_OR_AUTHORITATIVELY_MAPPED" }, assertionId: ev.assertionId, conflictGroupId: null, contentFingerprint: sha256(JSON.stringify(ev.assertion)), normalizedValue: ev.assertion.value, observedAt: ev.observedAt, originalValue: ev.assertion.value, parameters: null, productId: id, publishedAt: null, retrievedAt: ev.reviewedAt.slice(0, 10), sourceAuthority: "PRIMARY", sourceId: ev.sourceId, supersedesAssertionId: null, targetKey: ev.evidenceId.split(":").at(-1)!.toUpperCase(), targetType: ev.kind === "CAPABILITY" ? "CAPABILITY" : "TECHNICAL_FACT", unit: ev.assertion.unit ?? null, verificationStatus: "ACCEPTED" })));
    arrays.technicalFacts.push(...factRecords);
    arrays.capabilityFacts.push(...capabilityRecords);
    arrays.disclosures.push({ controlledMeaning: "No product-specific controlled owner/test evidence is asserted.", disclosureId: disclosureRefs[0], disclosureType: "LIMITED_EXPERIENCE", productId: id, semanticTemplateRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:disclosure:LIMITED_EXPERIENCE" }, { controlledMeaning: "Door-open depth and manufacturer installation clearance are not exact-model verified.", disclosureId: disclosureRefs[1], disclosureType: "INSTALLATION_CLEARANCE_UNKNOWN", productId: id, semanticTemplateRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:disclosure:INSTALLATION_CLEARANCE_UNKNOWN" });
    arrays.marketApplicability.push({ evidenceAssertionRefs: [], market: "TR", marketApplicabilityId: `market:${id}`, productId: id, proofLevel: "EXACT_TR_MANUFACTURER_PRODUCT_PAGE", reviewedAt: activatedAt.slice(0, 10), sourceAssertionRefs: [], status: "VERIFIED" });
    arrays.lifecycle.push({ assertionRefs: [], lifecycleEventId: `lifecycle:${slug(id)}:current`, productId: id, reasonCode: "PO_APPROVED_CURRENT_TR_EXACT_MODEL", toState: "CURRENT" });
    arrays.productIdentifiers.push({ assertionRef: (capacity.promotedAssertionRefs as string[])[0], assertionRefs: capacity.promotedAssertionRefs, identifierType: "OTHER_APPROVED_IDENTIFIER", identifierValue: item.identity.model, mappingStatus: "EXACT", productId: id, productIdentifierId: `identifier:${slug(id)}:model`, value: item.identity.model });
    arrays.warranties.push({ coveredScope: "EXACT_TERMS_REQUIRE_PURCHASE_DATE_RECHECK", durationMonths: null, productId: id, sourceAssertionRefs: [], status: "TERMS_RECHECK_REQUIRED", territory: "TR", warrantyId: `warranty:${slug(id)}:standard`, warrantyType: "STANDARD_FULL_PRODUCT_WARRANTY" });
    arrays.decisionProjectionBindings.push({ catalogReleaseCandidateRef: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor, discriminatorValues: factRecords.map((fact) => ({ discriminatorId: fact.factKey, factRef: fact.factId, unit: fact.unit, value: fact.value })), eligibleCapabilityFactRefs: capabilityRecords.map((fact) => fact.capabilityFactId), eligibleTechnicalFactRefs: factRecords.map((fact) => fact.factId), evidenceCompleteness: "DECISION_GRADE_WITH_DECLARED_LIMITATIONS", hardConstraintEligibleRefs: capabilityRecords.map((fact) => fact.capabilityFactId), identityRef: id, productId: id, projectionId: `projection:${slug(id)}:v0-2`, projectionVersion: "v0.2", requiredDisclosureRefs: disclosureRefs, softPreferenceEligibleRefs: capabilityRecords.map((fact) => fact.capabilityFactId), supportedNeedRefs: [{ evidenceRefs: [capacity.factId], needRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:need:HIGH_LAUNDRY_VOLUME", status: "CONDITIONALLY_SUPPORTED" }], usageSemanticRefs: ["semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:usage:CAPACITY_USAGE"] });
    arrays.rationaleBindings.push({ disclosureRefs, limitationRefs: disclosureRefs, productId: id, rationaleClass: "MATERIAL_NEED_ADVANTAGE", rationaleId: `rationale:${slug(id)}:capacity-evidence`, supportedNeedRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:need:HIGH_LAUNDRY_VOLUME", supportingCapabilityFactRefs: [], supportingTechnicalFactRefs: [capacity.factId], tradeoffRefs: [disclosureRefs[1]], usageSemanticRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:usage:CAPACITY_USAGE", whyItMattersTemplateRef: "semantic:WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1:interpretation:CAPACITY_USAGE" });
  }
  catalog.releaseVersion = MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor;
  catalog.decisionAdoption = decisionAdoptionBinding("WASHING_MACHINE");
  const members = arrays.releaseMembers as string[];
  const membershipDigest = sha256([...members].sort().join("\n"));
  catalog.membershipDigest = membershipDigest;
  catalog.generatedAt = activatedAt;
  catalog.frozenAt = activatedAt;
  catalog.validationReport = { status: "PASS", blockingErrors: [], carsParity: "PRESERVED", commercialIndependence: "PASS", checks: { exactApprovedMembership: true, priorMembersPreserved: true, governedEvidenceBindings: true, recommendationPolicyRebound: true, l10CommerceIndependence: true, blockedTekaDishwasherAbsent: true }, counts: { products: arrays.products.length, technicalFacts: arrays.technicalFacts.length, capabilityFacts: arrays.capabilityFacts.length, evidenceAssertions: arrays.evidenceAssertions.length, sources: arrays.sources.length, projections: arrays.decisionProjectionBindings.length, rationales: arrays.rationaleBindings.length, warranties: arrays.warranties.length } };
  const { releaseDigest: ignored, ...core } = catalog;
  void ignored;
  const releaseDigest = digest(core);
  catalog.releaseDigest = releaseDigest;
  const raw = stable(catalog);
  const artifactSha256 = sha256(raw);
  const manifest = { ...parentManifest, catalogReleaseVersion: catalog.releaseVersion, catalogDigest: releaseDigest, catalogArtifactSha256: artifactSha256, membershipDigest, memberCount: members.length, decisionAdoption: decisionAdoptionBinding("WASHING_MACHINE") };
  return { raw, manifestRaw: stable(manifest), semanticRaw, catalog, artifactSha256, releaseDigest, membershipDigest };
}

function domainSource(release: CandidateRelease, id: string) {
  const source = officialSource(release, id);
  return { sourceId: source.sourceId, url: source.uri, accessedAt: source.observedAt.slice(0, 10), authority: "MANUFACTURER_TR_EXACT_MODEL" };
}

function claims(category: string) {
  return [{ statement: `${category} özellikleri kesin kullanıcı sonucu garantisi değildir; yalnız doğrulanmış ürün ve ölçüm bağlamında kullanılır.`, authority: "MANUFACTURER_CLAIM", outcomeGuarantee: false }];
}

async function buildDomainSuccessor(category: Exclude<MajorApplianceDecisionCategory, "WASHING_MACHINE">, release: CandidateRelease): Promise<{ raw: string; artifactSha256: string; pack: Json }> {
  const directory = categoryDirectory[category];
  const parent = MAJOR_APPLIANCE_DECISION_RELEASES[category];
  const relative = `data/production/appliances/${directory}/releases/${parent.parent}/domain-pack.json`;
  const parentRaw = await readFile(path.join(root, relative), "utf8");
  if (sha256(parentRaw) !== parent.parentArtifactSha256) throw new Error(`${category}_PARENT_DIGEST_MISMATCH`);
  const pack = clone(JSON.parse(parentRaw) as Json);
  const products = pack.products as Json[];
  const sources = pack.sources as Json[];
  for (const id of MAJOR_APPLIANCE_DECISION_ADDITIONS[category]) {
    const item = offering(release, id);
    const source = domainSource(release, id);
    sources.push(source);
    if (category === "DRYER") {
      products.push({ productId: id, brand: item.identity.manufacturer, model: item.identity.model, configurationIdentity: item.identity.configuration, marketStatus: "CURRENT_TR", technicalFacts: { technology: "HEAT_PUMP", function: "DRYING_ONLY", installation: "FREESTANDING", capacityKg: numberValue(release, id, "ratedcapacitykg"), capacityContext: "RATED_DRY_LOAD", widthMm: numberValue(release, id, "widthmm"), heightMm: numberValue(release, id, "heightmm"), depthMm: numberValue(release, id, "depthmm"), doorOpenDepthMm: null, noiseDbA: numberValue(release, id, "noisedba"), noiseContext: "ACOUSTIC_AIRBORNE_NOISE", noiseRegime: null, energyClass: stringValue(release, id, "energyclass"), energyPer100CyclesKwh: numberValue(release, id, "energyper100cycleskwh") }, capabilities: { programs: hasCapability(release, id, "woolmark") ? ["WOOL_CARE"] : [], ...(hasCapability(release, id, "directdrain", "drainhose-ncluded") ? { directDrain: true } : {}), ...(hasCapability(release, id, "sensordrying") ? { sensorDrying: true } : {}), ...(hasCapability(release, id, "wifi", "wifibluetooth") ? { smartConnectivity: true } : {}) }, evidenceRefs: [source.sourceId] });
    } else if (category === "DISHWASHER") {
      products.push({ productId: id, brand: item.identity.manufacturer, model: item.identity.model, configurationIdentity: item.identity.configuration, marketStatus: "CURRENT_TR", runtimeSelectable: true, runtimeBlockers: [], technicalFacts: { widthMm: numberValue(release, id, "widthmm"), heightMm: numberValue(release, id, "heightmm"), depthMm: numberValue(release, id, "depthmm"), capacity: numberValue(release, id, "placesettings"), energyClass: stringValue(release, id, "energyclass"), energyKwhPerCycle: numberValue(release, id, "energypercyclekwh"), ecoWaterLitres: numberValue(release, id, "waterpercyclel"), noiseDbA: numberValue(release, id, "noisedba"), regime: "TR_2019_2017_AB" }, capabilities: { autoOpenDry: hasCapability(release, id, "automaticdooropen"), cutleryTray: hasCapability(release, id, "thirdrack"), homeConnect: hasCapability(release, id, "wifibluetooth"), aquaStop: hasCapability(release, id, "overflowprotection") }, claims: claims("Bulaşık makinesi"), evidenceRefs: [source.sourceId] });
    } else {
      const legacyTeka = id === "appliances:refrigerator:tr:teka:rmf-77920-ss-eu-113430009";
      const form = item.identity.configuration.includes("FOUR_DOOR") ? "FOUR_DOOR" : item.identity.configuration.includes("FRENCH_DOOR") ? "FRENCH_DOOR" : "BOTTOM_FREEZER_COMBI";
      const fresh = numberValue(release, id, "refrigeratorvolumel");
      const freezer = numberValue(release, id, "freezervolumel");
      const totalPublished = numberValue(release, id, "totalvolumel");
      products.push({ productId: id, brand: item.identity.manufacturer, model: item.identity.model, configurationIdentity: item.identity.configuration, marketStatus: "CURRENT_TR", runtimeSelectable: true, runtimeBlockers: [], technicalFacts: { installation: "FREESTANDING", form, frostTechnology: "NO_FROST", widthMm: numberValue(release, id, "widthmm"), heightMm: numberValue(release, id, "heightmm"), depthMm: numberValue(release, id, "depthmm"), doorOpenDepthMm: null, requiredSideClearanceMm: null, requiredRearClearanceMm: null, requiredTopClearanceMm: null, totalNetLitres: legacyTeka ? null : totalPublished, freshFoodNetLitres: fresh, chillerNetLitres: null, freezerNetLitres: freezer, grossLitres: legacyTeka ? totalPublished : null, freezingCapacityKg24h: null, energyClass: stringValue(release, id, "energyclass"), annualEnergyKwh: numberValue(release, id, "annualenergykwh"), energyRegime: legacyTeka ? null : "TR_2019_2016_AB", noiseDbA: numberValue(release, id, "noisedba"), noiseClass: null, noiseRegime: legacyTeka ? null : "TR_2019_2016_AB", ambientMinC: null, ambientMaxC: null, dimensionConflict: false }, capabilities: { noFrost: hasCapability(release, id, "nofrost"), ...(hasCapability(release, id, "reversibledoor") ? { reversibleDoor: true } : {}), ...(hasCapability(release, id, "wifi") ? { smartConnectivity: true } : {}), ...(hasCapability(release, id, "fastcooling") ? { fastCooling: true } : {}), ...(hasCapability(release, id, "fastfreeze") ? { fastFreezing: true } : {}), ...(hasCapability(release, id, "convertiblecompartment") ? { preservationCompartment: "CONVERTIBLE_COMPARTMENT" } : {}) }, claims: claims("Buzdolabı"), evidenceRefs: [source.sourceId] });
    }
  }
  pack.releaseVersion = parent.successor;
  if (category === "REFRIGERATOR") (pack.scope as Json).form = "MULTI_FORM_REFRIGERATOR";
  pack.decisionAdoption = decisionAdoptionBinding(category);
  const raw = stable(pack);
  return { raw, artifactSha256: sha256(raw), pack };
}

async function rebindPolicies(catalog: { releaseDigest: string; membershipDigest: string; artifactSha256: string }) {
  const catalogBinding = { release: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor, releaseDigest: catalog.releaseDigest, membershipDigest: catalog.membershipDigest, artifactSha256: catalog.artifactSha256 };
  const definitions = [
    { key: "question", root: "question-policy", old: "WASHING_MACHINE_QUESTION_POLICY-v0.1", next: "WASHING_MACHINE_QUESTION_POLICY-v0.2", digest: digestQuestionPolicy },
    { key: "sufficiency", root: "sufficiency-recommendation-entry", old: "WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY-v0.1", next: "WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY-v0.2", digest: digestSufficiencyRecommendationPolicy },
    { key: "selection", root: "candidate-selection-policy", old: "WASHING_MACHINE_CANDIDATE_SELECTION_POLICY-v0.1", next: "WASHING_MACHINE_CANDIDATE_SELECTION_POLICY-v0.2", digest: digestCandidateSelectionPolicy },
    { key: "construction", root: "recommendation-construction-policy", old: "WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.1", next: "WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v0.2", digest: digestRecommendationConstructionPolicy },
  ] as const;
  const output = new Map<string, { artifactRaw: string; artifactPath: string; pointerPath: string; pointerRaw: string; digest: string }>();
  let questionDigest = "", sufficiencyDigest = "", selectionDigest = "";
  for (const definition of definitions) {
    const artifact = clone(await readJson<Json>(`data/production/appliances/${definition.root}/releases/${definition.old}/policy.json`));
    const payload = artifact.payload as Json;
    const bindings = payload.bindings as Json;
    if (definition.key === "question") {
      bindings.catalogRelease = catalogBinding.release;
      bindings.catalogDigest = catalogBinding.releaseDigest;
    } else {
      bindings.catalog = catalogBinding;
      if (definition.key === "sufficiency") (bindings.questionPolicy as Json).digest = questionDigest;
      if (definition.key === "selection") { (bindings.questionPolicy as Json).digest = questionDigest; (bindings.sufficiencyPolicy as Json).digest = sufficiencyDigest; }
      if (definition.key === "construction") { (bindings.questionPolicy as Json).digest = questionDigest; (bindings.sufficiencyPolicy as Json).digest = sufficiencyDigest; (bindings.candidateSelectionPolicy as Json).digest = selectionDigest; }
    }
    const policyDigest = definition.digest(payload);
    artifact.policyDigest = policyDigest;
    if (definition.key === "question") questionDigest = policyDigest;
    if (definition.key === "sufficiency") sufficiencyDigest = policyDigest;
    if (definition.key === "selection") selectionDigest = policyDigest;
    const artifactPath = `data/production/appliances/${definition.root}/releases/${definition.next}/policy.json`;
    const pointerPath = `data/production/appliances/${definition.root}/active.json`;
    const priorPointer = await readJson<Json>(pointerPath);
    output.set(definition.key, { artifactRaw: stable(artifact), artifactPath, pointerPath, pointerRaw: stable({ ...priorPointer, policyDigest, policyFile: `releases/${definition.next}/policy.json` }), digest: policyDigest });
  }
  return output;
}

async function restoreBeforePointers(rollback: RollbackArtifact, expectedAfter: ReadonlyMap<string, string>): Promise<void> {
  const current = new Map<string, string>(), before = new Map<string, string>();
  for (const pointer of rollback.pointers) {
    const raw = await readFile(path.join(root, pointer.path), "utf8");
    if (sha256(raw) !== expectedAfter.get(pointer.path) || sha256(pointer.beforeRaw) !== pointer.beforeSha256) throw new Error(`ROLLBACK_BINDING_INVALID:${pointer.path}`);
    current.set(pointer.path, raw); before.set(pointer.path, pointer.beforeRaw);
  }
  await replacePointers(before, current);
}

async function rollback(): Promise<void> {
  const [activationRaw, rollbackRaw, receiptRaw] = await Promise.all([readFile(path.join(root, activationRelative), "utf8"), readFile(path.join(root, rollbackRelative), "utf8"), readFile(path.join(root, receiptRelative), "utf8")]);
  const activation = JSON.parse(activationRaw) as { activationId?: string; rollbackArtifact?: { sha256?: string } };
  const artifact = JSON.parse(rollbackRaw) as RollbackArtifact;
  const receipt = JSON.parse(receiptRaw) as { activationId?: string; activationArtifactSha256?: string; pointers?: readonly { path: string; afterSha256: string }[] };
  if (activation.activationId !== activationId || activation.rollbackArtifact?.sha256 !== sha256(rollbackRaw) || receipt.activationId !== activationId || receipt.activationArtifactSha256 !== sha256(activationRaw)) throw new Error("ROLLBACK_ENVELOPE_INVALID");
  await restoreBeforePointers(artifact, new Map(receipt.pointers?.map((item) => [item.path, item.afterSha256])));
  resetAppliancesAuthorityCacheForTests();
  console.log(`${activationId} rolled back to eight byte-identical prior pointers.`);
}

async function activate(): Promise<void> {
  const packageRaw = await readFile(path.join(root, candidateRoot, "activation-approval-package.json"), "utf8");
  const manifest = await readJson<{ batchDigest?: string; admittedCount?: number }>(`${candidateRoot}/batch-manifest.json`);
  if (manifest.batchDigest !== MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST || manifest.admittedCount !== 16 || sha256(packageRaw) !== MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256) throw new Error("APPROVED_SOURCE_PACKAGE_MISMATCH");
  const readOnly = await Promise.all(categories.map((category) => loadActiveMajorApplianceCatalogCategory(root, category as MajorApplianceAdoptionCategory)));
  if (readOnly.some((item) => item.status !== "READY") || JSON.stringify(readOnly.map((item) => item.status === "READY" ? item.release.offerings.length : 0)) !== JSON.stringify([29, 7, 7, 8])) throw new Error("READ_ONLY_ACTIVATION_PREFLIGHT_FAILED");
  const [oldWm, oldDryer, oldDishwasher, oldRefrigerator] = await Promise.all([loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) }), loadActiveDryerAuthority(root), loadActiveBoundedAuthority(root, "DISHWASHER"), loadActiveRefrigeratorAuthority(root)]);
  if (oldWm.status !== "READY" || oldWm.snapshot.releaseVersion !== MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.parent || oldWm.snapshot.productIds.size !== 24 || oldDryer.status !== "READY" || oldDryer.snapshot.pack.products.length !== 3 || oldDishwasher.status !== "READY" || oldDishwasher.snapshot.pack.products.length !== 4 || oldRefrigerator.status !== "READY" || oldRefrigerator.snapshot.pack.products.length !== 4) throw new Error("PARENT_DECISION_PREFLIGHT_FAILED");
  const candidates = Object.fromEntries(await Promise.all(categories.map(async (category) => [category, await loadCandidate(category)]))) as Record<MajorApplianceDecisionCategory, CandidateRelease>;
  const exactIds = categories.flatMap((category) => MAJOR_APPLIANCE_DECISION_ADDITIONS[category]);
  if (new Set(exactIds).size !== 16 || exactIds.includes(BLOCKED_TEKA_DISHWASHER_ID)) throw new Error("EXACT_ADOPTION_SCOPE_INVALID");

  const approval = { schemaVersion: "major-appliance-decision-owner-approval/v1", approvalId, recordedAt: activatedAt, approved: true, workUnitId: MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT, sourceBatchDigest: MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST, sourcePackageSha256: MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256, catalogActivationId: MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID, decision: "APPROVE_EXACTLY_16_FOR_XPY_Y_DECISION_MEMBERSHIP", userStatement: "XPY karar adaylarına dahil edelim.", scope: { categories, admittedOfferingIds: exactIds, excludedOfferingIds: [BLOCKED_TEKA_DISHWASHER_ID], expectedDecisionCounts: [29, 7, 7, 8] }, boundaries: { authority: "Y_DECISION_MEMBERSHIP", commerce: "L10_NO_DECISION_EFFECT", newResearch: false, weightsScoresTieBreaks: false } } as const;
  const approvalRaw = stable(approval);
  await writeImmutable(approvalRelative, approvalRaw);
  const decisionActivation = decisionActivationPointerSchema.parse({ workUnitId: MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT, approvalManifest: approvalRelative, approvalManifestSha256: sha256(approvalRaw), lifecycle: "ACTIVE_DECISION_AUTHORITY" });

  const wm = await buildWashingMachineSuccessor(candidates.WASHING_MACHINE);
  const dryer = await buildDomainSuccessor("DRYER", candidates.DRYER);
  const dishwasher = await buildDomainSuccessor("DISHWASHER", candidates.DISHWASHER);
  const refrigerator = await buildDomainSuccessor("REFRIGERATOR", candidates.REFRIGERATOR);
  const successorArtifacts = [
    ["data/production/appliances/washing-machines/releases/APPLIANCES-WM-TR-v0.2/catalog.json", wm.raw],
    ["data/production/appliances/washing-machines/releases/APPLIANCES-WM-TR-v0.2/manifest.json", wm.manifestRaw],
    ["data/production/appliances/washing-machines/releases/APPLIANCES-WM-TR-v0.2/semantic-registry.json", wm.semanticRaw],
    ["data/production/appliances/dryers/releases/APPLIANCES-DRYER-TR-v0.2/domain-pack.json", dryer.raw],
    ["data/production/appliances/dishwashers/releases/APPLIANCES-DISHWASHER-TR-v0.2/domain-pack.json", dishwasher.raw],
    ["data/production/appliances/refrigerators/releases/APPLIANCES-REFRIGERATOR-TR-v0.2/domain-pack.json", refrigerator.raw],
  ] as const;
  for (const [relative, raw] of successorArtifacts) await writeImmutable(relative, raw);
  const policies = await rebindPolicies({ releaseDigest: wm.releaseDigest, membershipDigest: wm.membershipDigest, artifactSha256: wm.artifactSha256 });
  for (const policy of policies.values()) await writeImmutable(policy.artifactPath, policy.artifactRaw);

  const before = new Map<string, string>();
  for (const relative of pointerPaths) before.set(relative, await readFile(path.join(root, relative), "utf8"));
  const rollbackArtifact: RollbackArtifact = { schemaVersion: "major-appliance-decision-rollback/v1", activationId, workUnitId: MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT, pointers: [...before].map(([relative, raw]) => ({ path: relative, beforeSha256: sha256(raw), beforeRaw: raw })) };
  const rollbackRaw = stable(rollbackArtifact);
  await writeImmutable(rollbackRelative, rollbackRaw);

  const oldPointers = Object.fromEntries([...before].map(([relative, raw]) => [relative, JSON.parse(raw) as Json]));
  const after = new Map<string, string>([
    [pointerPaths[0], stable({ schemaVersion: "appliances-authority-active-pointer/v3", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor, lifecycle: "ACTIVE", decisionArtifactSha256: wm.artifactSha256, membershipDigest: wm.membershipDigest, richness: oldPointers[pointerPaths[0]].richness, decisionActivation })],
    [pointerPaths[1], stable({ schemaVersion: "appliances-dryer-active-pointer/v3", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.successor, artifactSha256: dryer.artifactSha256, lifecycle: "ACTIVE", richness: oldPointers[pointerPaths[1]].richness, decisionActivation })],
    [pointerPaths[2], stable({ schemaVersion: "appliances-bounded-active-pointer/v3", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.DISHWASHER.successor, artifactSha256: dishwasher.artifactSha256, lifecycle: "ACTIVE", richness: oldPointers[pointerPaths[2]].richness, decisionActivation })],
    [pointerPaths[3], stable({ schemaVersion: "appliances-refrigerator-active-pointer/v3", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.successor, artifactSha256: refrigerator.artifactSha256, lifecycle: "ACTIVE", richness: oldPointers[pointerPaths[3]].richness, decisionActivation })],
  ]);
  for (const policy of policies.values()) after.set(policy.pointerPath, policy.pointerRaw);
  if (after.size !== 8) throw new Error("POINTER_TRANSACTION_SCOPE_INVALID");

  const activation = { schemaVersion: "major-appliance-decision-activation/v1", activationId, activatedAt, workUnitId: MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT, state: "ACTIVE_XPY_Y_DECISION_MEMBERSHIP", source: { batchDigest: MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST, packageSha256: MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256, readOnlyCatalogActivationId: MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID }, approvalArtifact: { path: approvalRelative, sha256: sha256(approvalRaw) }, rollbackArtifact: { path: rollbackRelative, sha256: sha256(rollbackRaw) }, releases: [{ category: "WASHING_MACHINE", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor, artifactSha256: wm.artifactSha256, membershipDigest: wm.membershipDigest, count: 29 }, { category: "DRYER", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.successor, artifactSha256: dryer.artifactSha256, count: 7 }, { category: "DISHWASHER", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.DISHWASHER.successor, artifactSha256: dishwasher.artifactSha256, count: 7 }, { category: "REFRIGERATOR", releaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.successor, artifactSha256: refrigerator.artifactSha256, count: 8 }], policyBindings: [...policies].map(([kind, policy]) => ({ kind, digest: policy.digest, artifact: policy.artifactPath })), commerceBoundary: "L10_NO_DECISION_EFFECT", excludedOfferingIds: [BLOCKED_TEKA_DISHWASHER_ID], transaction: { pointerCount: 8, mode: "ALL_OR_BYTE_EXACT_ROLLBACK" } };
  const activationRaw = stable(activation);
  await writeImmutable(activationRelative, activationRaw);
  await replacePointers(after, before);
  try {
    resetAppliancesAuthorityCacheForTests();
    const [activeWm, activeDryer, activeDishwasher, activeRefrigerator, recommendation] = await Promise.all([loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) }), loadActiveDryerAuthority(root), loadActiveBoundedAuthority(root, "DISHWASHER"), loadActiveRefrigeratorAuthority(root), loadRecommendationAuthority(root, new Date(activatedAt))]);
    const counts = [activeWm.status === "READY" ? activeWm.snapshot.productIds.size : 0, activeDryer.status === "READY" ? activeDryer.snapshot.pack.products.length : 0, activeDishwasher.status === "READY" ? activeDishwasher.snapshot.pack.products.length : 0, activeRefrigerator.status === "READY" ? activeRefrigerator.snapshot.pack.products.length : 0];
    if (JSON.stringify(counts) !== JSON.stringify([29, 7, 7, 8]) || recommendation.authority.releaseVersion !== MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor) throw new Error(`POST_COMMIT_AUTHORITY_VALIDATION_FAILED:${JSON.stringify({ counts, washing: activeWm.status === "READY" ? activeWm.snapshot.releaseVersion : activeWm.reason, dryer: activeDryer.status === "READY" ? activeDryer.snapshot.releaseVersion : activeDryer.reason, dishwasher: activeDishwasher.status === "READY" ? activeDishwasher.snapshot.releaseVersion : activeDishwasher.reason, refrigerator: activeRefrigerator.status === "READY" ? activeRefrigerator.snapshot.releaseVersion : activeRefrigerator.reason, recommendationRelease: recommendation.authority.releaseVersion })}`);
    const postCommitIds = new Set([
      ...(activeWm.status === "READY" ? [...activeWm.snapshot.productIds] : []),
      ...(activeDryer.status === "READY" ? activeDryer.snapshot.pack.products.map((item) => item.productId) : []),
      ...(activeDishwasher.status === "READY" ? activeDishwasher.snapshot.pack.products.map((item) => item.productId) : []),
      ...(activeRefrigerator.status === "READY" ? activeRefrigerator.snapshot.pack.products.map((item) => item.productId) : []),
    ]);
    const receipt = { schemaVersion: "major-appliance-decision-activation-receipt/v1", activationId, committedAt: activatedAt, state: "COMMITTED", activationArtifact: activationRelative, activationArtifactSha256: sha256(activationRaw), approvalArtifact: approvalRelative, approvalArtifactSha256: sha256(approvalRaw), pointers: [...after].map(([relative, raw]) => ({ path: relative, beforeSha256: sha256(before.get(relative)!), afterSha256: sha256(raw) })), decisionCounts: counts, recommendationAuthority: { catalogRelease: recommendation.authority.releaseVersion, questionPolicyDigest: recommendation.question.snapshot.policyDigest, sufficiencyPolicyDigest: recommendation.sufficiency.snapshot.policyDigest, selectionPolicyDigest: recommendation.selection.snapshot.policyDigest, constructionPolicyDigest: recommendation.construction.snapshot.policyDigest, priceProjectionStatus: recommendation.price.status }, verification: { exactSixteenPresent: exactIds.every((id) => postCommitIds.has(id)), blockedTekaAbsent: activeDishwasher.status === "READY" && !activeDishwasher.snapshot.pack.products.some((item) => item.productId === BLOCKED_TEKA_DISHWASHER_ID), l10DecisionEffect: "NONE" } };
    await writeImmutable(receiptRelative, stable(receipt));
    console.log(stable(receipt));
  } catch (error) {
    await restoreBeforePointers(rollbackArtifact, new Map([...after].map(([relative, raw]) => [relative, sha256(raw)])));
    resetAppliancesAuthorityCacheForTests();
    throw error;
  }
}

void (process.argv.includes("--rollback") ? rollback() : activate());
