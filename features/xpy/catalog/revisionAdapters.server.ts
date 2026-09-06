import { readFile } from "node:fs/promises";
import path from "node:path";

import { APPLIANCES_PRODUCT_TYPES, type AppliancesProductType } from "@/features/appliances/contracts";
import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority } from "@/features/appliances/authority/loader.server";
import { isBoundedType, loadActiveBoundedAuthority } from "@/features/appliances/bounded/authority.server";
import { loadActiveDryerAuthority } from "@/features/appliances/dryer/authority.server";
import { loadActiveRefrigeratorAuthority } from "@/features/appliances/refrigerator/authority.server";
import { buildCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { requireXpyDomainPack } from "../domainPacks";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import { XPY_CATALOG_VERSION } from "./contract";
import {
  catalogMembershipDigest,
  createCatalogRevisionDryRunReport,
  createCatalogRevisionManifest,
  sha256Digest,
  type CatalogRevisionDryRunReport,
  type CatalogRevisionManifest,
  type CatalogRevisionMember,
} from "./revision";

type Json = Record<string, unknown>;
const object = (value: unknown): Json => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value : "";
const shaBody = (value: string): string => sha256Digest(value).slice("sha256:".length);
const parse = (raw: string): Json => object(JSON.parse(raw) as unknown);
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const applianceSlug: Readonly<Record<AppliancesProductType, string>> = Object.freeze({
  WASHING_MACHINE: "washing-machines", REFRIGERATOR: "refrigerators", DISHWASHER: "dishwashers", DRYER: "dryers", VACUUM: "vacuums", ROBOT_VACUUM: "robot-vacuums", FREEZER: "freezers", BUILT_IN_OVEN: "built-in-ovens", FREESTANDING_COOKER: "freestanding-cookers", HOB: "hobs", RANGE_HOOD: "range-hoods", COUNTERTOP_MICROWAVE_OVEN: "countertop-microwave-ovens", BUILT_IN_MICROWAVE_OVEN: "built-in-microwave-ovens", AIR_PURIFIER: "air-purifiers", FULLY_AUTOMATIC_ESPRESSO_MACHINE: "fully-automatic-espresso-machines", MANUAL_ESPRESSO_MACHINE: "manual-espresso-machines", FILTER_COFFEE_MACHINE: "filter-coffee-machines", TURKISH_COFFEE_MACHINE: "turkish-coffee-machines", AIR_FRYER: "air-fryers", BLENDER: "blenders", FOOD_PROCESSOR: "food-processors", ELECTRIC_STORAGE_WATER_HEATER: "electric-storage-water-heaters", INSTANTANEOUS_ELECTRIC_WATER_HEATER: "instantaneous-electric-water-heaters", SPLIT_AIR_CONDITIONER: "split-air-conditioners",
});

async function readJson(root: string, relative: string): Promise<{ readonly raw: string; readonly value: Json }> {
  const raw = await readFile(path.join(root, relative), "utf8");
  return { raw, value: parse(raw) };
}

function recursiveProvenanceCount(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((total, child) => total + recursiveProvenanceCount(child), 0);
  if (!value || typeof value !== "object") return 0;
  const item = object(value);
  return (Array.isArray(item.provenance) ? item.provenance.length : 0) + Object.values(item).reduce<number>((total, child) => total + recursiveProvenanceCount(child), 0);
}

function carsIdentity(record: Json): string {
  const variant = object(record.variant);
  return [text(object(variant.brand).value), text(object(variant.model).value), text(object(variant.trim).value), String(object(variant.modelYear).value ?? ""), text(variant.market)].join("|");
}

export async function loadCarsCatalogRevision(root: string, releaseVersion: string, now = new Date()): Promise<CatalogRevisionManifest> {
  const normalized = releaseVersion.replace(/^v/u, "");
  if (!/^\d+\.\d+\.\d+$/u.test(normalized)) throw new TypeError("UNSAFE_CARS_CATALOG_RELEASE");
  const base = `data/production/catalog/releases/v${normalized}`;
  const [manifestFile, catalogFile, facetsFile] = await Promise.all([
    readJson(root, `${base}/manifest.json`),
    readJson(root, `${base}/catalog.json`),
    readJson(root, `${base}/decision-facets.json`),
  ]);
  const result = buildCatalogSnapshot({ manifest: manifestFile.value, catalog: catalogFile.value, decisionFacets: facetsFile.value, now });
  const records = array(catalogFile.value.records).map(object);
  const members: CatalogRevisionMember[] = records.map((record) => {
    const variant = object(record.variant);
    const provenanceCount = recursiveProvenanceCount(variant);
    return {
      exactId: text(variant.id),
      exactConfigurationIdentity: carsIdentity(record),
      market: text(variant.market),
      lifecycle: text(variant.lifecycleStatus) === "ON_SALE" ? "ELIGIBLE" : text(variant.lifecycleStatus) === "RETIRED" ? "RETIRED" : "INELIGIBLE",
      provenanceCount,
      evidenceCount: provenanceCount,
    };
  });
  const pack = requireXpyDomainPack("CARS");
  const domainIssues = result.status === "READY" ? [] : result.diagnostics.map((diagnostic) => diagnostic.code);
  const releaseDigest = text(manifestFile.value.catalog_payload_hash);
  const normalizedReleaseDigest = /^sha256:[a-f0-9]{64}$/u.test(releaseDigest) ? releaseDigest as `sha256:${string}` : sha256Digest(catalogFile.raw);
  const semanticVersion = text(facetsFile.value.version) || "cars-decision-facets/unknown";
  return createCatalogRevisionManifest({
    release: { version: normalized, digest: normalizedReleaseDigest, membershipDigest: catalogMembershipDigest(members.map((member) => member.exactId)), memberCount: members.length, lifecycle: "FROZEN" },
    scope: { departmentId: "CARS", categoryId: "NEW_CAR", market: "TR" },
    compatibility: { catalogSchemaVersion: text(manifestFile.value.catalog_schema_version), xpyCatalogVersion: XPY_CATALOG_VERSION, runtimeVersion: XPY_RUNTIME_VERSION, runtimeDigest: XPY_RUNTIME_DIGEST, domainPackId: pack.domainPackId, semanticAuthorityVersion: semanticVersion, semanticAuthorityDigest: sha256Digest(facetsFile.raw) },
    authority: { domainValidatorId: "cars-buildCatalogSnapshot/v0.1", domainValidationStatus: domainIssues.length ? "FAIL" : "PASS", domainValidationIssues: domainIssues, provenanceDigest: sha256Digest(JSON.stringify(records.map((record) => object(record.variant)))), evidenceDigest: sha256Digest(facetsFile.raw) },
    members,
  });
}

function recordsForProduct(catalog: Json, productId: string): Json[] {
  return Object.values(catalog).flatMap((value) => Array.isArray(value) ? value.map(object).filter((item) => item.productId === productId) : []);
}

function validateCommonAppliancePack(input: { readonly category: AppliancesProductType; readonly releaseVersion: string; readonly pointer?: Json; readonly artifact: Json; readonly raw: string; readonly semantic?: { readonly raw: string; readonly value: Json }; readonly manifest?: Json }): string[] {
  const { category, releaseVersion, pointer, artifact, raw, semantic, manifest } = input;
  const issues: string[] = [];
  const products = array(artifact.products).map(object);
  const ids = products.map((product) => text(product.productId));
  const configurations = products.map((product) => text(product.configurationIdentity));
  const isWashingMachine = category === "WASHING_MACHINE";
  if (!releaseVersion || text(artifact.releaseVersion) !== releaseVersion) issues.push("RELEASE_VERSION_MISMATCH");
  if (pointer && text(pointer.releaseVersion) !== releaseVersion) issues.push("POINTER_RELEASE_MISMATCH");
  const expectedArtifactHash = text(pointer?.artifactSha256) || text(manifest?.catalogArtifactSha256);
  if (expectedArtifactHash && expectedArtifactHash !== shaBody(raw)) issues.push("ARTIFACT_DIGEST_MISMATCH");
  if (isWashingMachine) {
    if (text(manifest?.departmentId) !== "APPLIANCES" || text(manifest?.productType) !== category || text(manifest?.market) !== "TR") issues.push("AUTHORITY_SCOPE_MISMATCH");
    if (text(manifest?.catalogReleaseVersion) !== releaseVersion || Number(manifest?.memberCount) !== products.length) issues.push("MANIFEST_BINDING_MISMATCH");
    if (text(artifact.schemaVersion) !== "WASHING_MACHINE_CANONICAL_CATALOG/v0.1") issues.push("CATALOG_SCHEMA_UNSUPPORTED");
    if (text(artifact.membershipDigest) !== shaBody([...ids].sort((a, b) => a.localeCompare(b, "en")).join("\n"))) issues.push("MEMBERSHIP_DIGEST_MISMATCH");
    const memberIds = array(artifact.releaseMembers).map(String);
    if (memberIds.length !== ids.length || ids.some((id) => !memberIds.includes(id))) issues.push("RELEASE_MEMBERSHIP_MISMATCH");
    if (!semantic || text(semantic.value.registryVersion) !== text(manifest?.semanticRegistryVersion) || shaBody(semantic.raw) !== text(manifest?.semanticRegistryDigest)) issues.push("SEMANTIC_AUTHORITY_MISMATCH");
    const validLifecycle = new Map(array(artifact.lifecycle).map((entry) => [text(object(entry).productId), text(object(entry).toState)]));
    const validMarket = new Map(array(artifact.marketApplicability).map((entry) => [text(object(entry).productId), object(entry)]));
    if (products.some((product) => text(product.departmentId) !== "APPLIANCES" || text(product.productType) !== category || text(product.market) !== "TR" || !validLifecycle.has(text(product.productId)) || text(validMarket.get(text(product.productId))?.market) !== "TR")) issues.push("PRODUCT_SCOPE_OR_LIFECYCLE_MISMATCH");
    if (products.some((product) => recordsForProduct(artifact, text(product.productId)).length < 2)) issues.push("PRODUCT_EVIDENCE_MISSING");
  } else {
    if (text(artifact.departmentId) !== "APPLIANCES" || text(artifact.productType) !== category || text(artifact.market) !== "TR") issues.push("AUTHORITY_SCOPE_MISMATCH");
    if (text(artifact.governanceStatus) !== "APPROVED" || text(artifact.lifecycle) !== "FROZEN" || artifact.runtimeActive !== true) issues.push("GOVERNANCE_OR_LIFECYCLE_INVALID");
    if (!/^appliances-(?:bounded|dryer|refrigerator)-domain-pack\/v1$/u.test(text(artifact.schemaVersion))) issues.push("CATALOG_SCHEMA_UNSUPPORTED");
    const sourceIds = new Set(array(artifact.sources).map((source) => text(object(source).sourceId)));
    if (products.some((product) => !array(product.evidenceRefs).length || array(product.evidenceRefs).some((reference) => !sourceIds.has(String(reference))))) issues.push("EVIDENCE_BINDING_MISMATCH");
    if (products.some((product) => product.runtimeSelectable === true && array(product.runtimeBlockers).length > 0)) issues.push("INCOMPLETE_PRODUCT_SELECTABLE");
    if (category === "DRYER" && products.some((product) => object(product.technicalFacts).noiseDbA !== null && (object(product.technicalFacts).noiseContext !== "ACOUSTIC_AIRBORNE_NOISE" || object(product.technicalFacts).noiseRegime !== null))) issues.push("NON_COMPARABLE_NOISE_PROMOTED");
    if (category === "REFRIGERATOR" && products.some((product) => {
      if (product.runtimeSelectable !== true) return false;
      const facts = object(product.technicalFacts);
      return facts.dimensionConflict === true
        || ![null, "TR_2019_2016_AB"].includes(facts.energyRegime as null | string)
        || ![null, "TR_2019_2016_AB"].includes(facts.noiseRegime as null | string);
    })) issues.push("NON_COMPARABLE_REFRIGERATOR_PROMOTED");
  }
  if (!ids.length || ids.some((id) => !id) || new Set(ids).size !== ids.length || configurations.some((identity) => !identity) || new Set(configurations).size !== configurations.length) issues.push("EXACT_IDENTITY_INVALID");
  return unique(issues);
}

async function validateCurrentApplianceAuthority(root: string, category: AppliancesProductType): Promise<string[]> {
  const result = category === "WASHING_MACHINE"
    ? await loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) })
    : category === "DRYER"
      ? await loadActiveDryerAuthority(root)
      : category === "REFRIGERATOR"
        ? await loadActiveRefrigeratorAuthority(root)
        : isBoundedType(category)
          ? await loadActiveBoundedAuthority(root, category)
          : { status: "FAILED_CLOSED" as const, reason: "CATEGORY_VALIDATOR_MISSING" };
  return result.status === "READY" ? [] : [result.reason];
}

export async function loadAppliancesCatalogRevision(root: string, category: AppliancesProductType, releaseVersion?: string): Promise<CatalogRevisionManifest> {
  const slug = applianceSlug[category];
  const pointerFile = await readJson(root, `data/production/appliances/${slug}/active.json`);
  const activeRelease = text(pointerFile.value.releaseVersion);
  const selectedRelease = releaseVersion ?? activeRelease;
  if (!/^[A-Z0-9.-]+(?:_[A-Z0-9.-]+)*-v\d+\.\d+$/u.test(selectedRelease)) throw new TypeError("UNSAFE_APPLIANCES_CATALOG_RELEASE");
  const base = `data/production/appliances/${slug}/releases/${selectedRelease}`;
  const isWashingMachine = category === "WASHING_MACHINE";
  const artifactFile = await readJson(root, `${base}/${isWashingMachine ? "catalog.json" : "domain-pack.json"}`);
  const manifestFile = isWashingMachine ? await readJson(root, `${base}/manifest.json`) : undefined;
  const semanticFile = isWashingMachine ? await readJson(root, `${base}/semantic-registry.json`) : undefined;
  const pointer = selectedRelease === activeRelease ? pointerFile.value : undefined;
  const commonIssues = validateCommonAppliancePack({ category, releaseVersion: selectedRelease, pointer, artifact: artifactFile.value, raw: artifactFile.raw, semantic: semanticFile, manifest: manifestFile?.value });
  const currentIssues = selectedRelease === activeRelease ? await validateCurrentApplianceAuthority(root, category) : [];
  const domainIssues = unique([...commonIssues, ...currentIssues]);
  const products = array(artifactFile.value.products).map(object);
  const sourceCount = array(artifactFile.value.sources).length;
  const members: CatalogRevisionMember[] = products.map((product) => {
    const productId = text(product.productId);
    const related = recordsForProduct(artifactFile.value, productId);
    const evidenceCount = isWashingMachine ? Math.max(0, related.length - 1) : array(product.evidenceRefs).length;
    const lifecycleState = text(product.lifecycleState);
    return {
      exactId: productId,
      exactConfigurationIdentity: text(product.configurationIdentity),
      market: text(product.market) || "TR",
      lifecycle: (product.runtimeSelectable === false || lifecycleState === "TEMPORARILY_UNAVAILABLE") ? "INELIGIBLE" : lifecycleState === "RETIRED" ? "RETIRED" : "ELIGIBLE",
      provenanceCount: isWashingMachine ? Math.max(1, related.filter((entry) => Array.isArray(entry.sourceAssertionRefs) || Array.isArray(entry.promotedAssertionRefs)).length) : Math.min(sourceCount, array(product.evidenceRefs).length),
      evidenceCount,
    };
  });
  const pack = requireXpyDomainPack("APPLIANCES");
  const releaseDigestBody = isWashingMachine ? text(manifestFile?.value.catalogDigest) : shaBody(artifactFile.raw);
  const releaseDigest = /^sha256:[a-f0-9]{64}$/u.test(releaseDigestBody) ? releaseDigestBody as `sha256:${string}` : `sha256:${releaseDigestBody}` as `sha256:${string}`;
  const semanticVersion = isWashingMachine ? text(manifestFile?.value.semanticRegistryVersion) : `${category}_SEMANTIC_REGISTRY/v0.1`;
  const semanticDigest = isWashingMachine ? `sha256:${text(manifestFile?.value.semanticRegistryDigest)}` as `sha256:${string}` : sha256Digest(artifactFile.raw);
  return createCatalogRevisionManifest({
    release: { version: selectedRelease, digest: releaseDigest, membershipDigest: catalogMembershipDigest(members.map((member) => member.exactId)), memberCount: members.length, lifecycle: "FROZEN" },
    scope: { departmentId: "APPLIANCES", categoryId: category, market: "TR" },
    compatibility: { catalogSchemaVersion: text(artifactFile.value.schemaVersion), xpyCatalogVersion: XPY_CATALOG_VERSION, runtimeVersion: XPY_RUNTIME_VERSION, runtimeDigest: XPY_RUNTIME_DIGEST, domainPackId: pack.domainPackId, semanticAuthorityVersion: semanticVersion, semanticAuthorityDigest: semanticDigest },
    authority: { domainValidatorId: isWashingMachine ? "appliances-washing-machine-authority/v1" : category === "DRYER" ? "appliances-dryer-authority/v1" : category === "REFRIGERATOR" ? "appliances-refrigerator-authority/v1" : "appliances-bounded-domain-pack/v1", domainValidationStatus: domainIssues.length ? "FAIL" : "PASS", domainValidationIssues: domainIssues, provenanceDigest: sha256Digest(JSON.stringify(array(artifactFile.value.sources))), evidenceDigest: sha256Digest(JSON.stringify(products.map((product) => [product.productId, product.evidenceRefs, recordsForProduct(artifactFile.value, text(product.productId)).length]))) },
    members,
  });
}

export async function loadAllActiveAppliancesCatalogRevisions(root: string): Promise<readonly CatalogRevisionManifest[]> {
  return Promise.all(APPLIANCES_PRODUCT_TYPES.map((category) => loadAppliancesCatalogRevision(root, category)));
}

export async function dryRunCarsCatalogRevision(root: string, proposedReleaseVersion: string, now = new Date()): Promise<CatalogRevisionDryRunReport> {
  const active = await readJson(root, "data/production/catalog/active.json");
  const current = await loadCarsCatalogRevision(root, text(active.value.active_catalog_release_version), now);
  const proposed = await loadCarsCatalogRevision(root, proposedReleaseVersion, now);
  return createCatalogRevisionDryRunReport(current, proposed);
}

export async function dryRunAppliancesCatalogRevision(root: string, category: AppliancesProductType, proposedReleaseVersion: string): Promise<CatalogRevisionDryRunReport> {
  const current = await loadAppliancesCatalogRevision(root, category);
  const proposed = await loadAppliancesCatalogRevision(root, category, proposedReleaseVersion);
  return createCatalogRevisionDryRunReport(current, proposed);
}
