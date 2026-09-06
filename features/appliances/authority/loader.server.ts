import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AppliancesAuthorityFailure, AppliancesAuthorityLoadResult, AppliancesAuthoritySnapshot, PriceProjectionFailure, PriceProjectionLoadResult } from "./types";
import { decisionActivationPointerSchema, validateDecisionApprovalRaw } from "../decisionAdoption/approval.server";
import { BLOCKED_TEKA_DISHWASHER_ID, isExpectedDecisionAdoptionBinding, MAJOR_APPLIANCE_DECISION_ADDITIONS, MAJOR_APPLIANCE_DECISION_RELEASES } from "../decisionAdoption/contract";

const EXPECTED = Object.freeze({ release: "APPLIANCES-WM-TR-v0.1", catalogDigest: "1f6c6ea12b19b32d363e1889a1c8c4b8a6a621e4bb13a22384e0e4de2c586c9e", catalogSha: "35a8132910a7b565dea94ec14b43625b0a46e0d8153723e25fcd39a063090c2b", membershipDigest: "ec5b339604209c4aa04263f19f4acdc52b6c1ff68d8b41495d0f768eabc88f9e", semanticVersion: "WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1", semanticDigest: "44784b43d818bee505e85f66ed60ce065809a1ff2bd42852157d4e44d7d7038a" });
const SAFE_RELEASE = /^APPLIANCES-WM-TR-v\d+\.\d+$/u;
const activeFields = { releaseVersion: z.string(), lifecycle: z.literal("ACTIVE") } as const;
const activeSchema = z.union([
  z.strictObject({ schemaVersion: z.literal("appliances-authority-active-pointer/v1"), ...activeFields }),
  z.strictObject({ schemaVersion: z.literal("appliances-authority-active-pointer/v2"), ...activeFields, richness: z.strictObject({ releaseVersion: z.enum(["APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.2", "APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate"]), releaseDigest: z.string().startsWith("sha256:"), catalogArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), membershipDigest: z.string().regex(/^[a-f0-9]{64}$/u), activationManifest: z.string(), activationManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE_READ_ONLY") }) }),
  z.strictObject({ schemaVersion: z.literal("appliances-authority-active-pointer/v3"), ...activeFields, decisionArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), membershipDigest: z.string().regex(/^[a-f0-9]{64}$/u), richness: z.strictObject({ releaseVersion: z.literal("APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate"), releaseDigest: z.string().startsWith("sha256:"), catalogArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), membershipDigest: z.string().regex(/^[a-f0-9]{64}$/u), activationManifest: z.string(), activationManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE_READ_ONLY") }), decisionActivation: decisionActivationPointerSchema }),
]);
const manifestSchema = z.strictObject({ schemaVersion: z.literal("appliances-authority-manifest/v1"), departmentId: z.literal("APPLIANCES"), productType: z.literal("WASHING_MACHINE"), market: z.literal("TR"), catalogReleaseVersion: z.string(), catalogDigest: z.string(), catalogArtifactSha256: z.string(), membershipDigest: z.string(), memberCount: z.number().int(), semanticRegistryVersion: z.string(), semanticRegistryDigest: z.string(), catalogSchemaVersion: z.string(), semanticSchemaVersion: z.string(), lifecycle: z.literal("ACTIVE"), decisionAdoption: z.unknown().optional() });
const catalogSchema = z.object({ schemaVersion: z.literal("WASHING_MACHINE_CANONICAL_CATALOG/v0.1"), releaseVersion: z.string(), releaseDigest: z.string(), membershipDigest: z.string(), semanticRegistryRef: z.object({ version: z.string(), digest: z.string(), bindingStatus: z.string() }).passthrough(), semanticRegistryDigest: z.string(), releaseMembers: z.array(z.string()), products: z.array(z.object({ productId: z.string(), departmentId: z.string(), productType: z.string(), market: z.string(), lifecycleState: z.string() }).passthrough()), historicalProducts: z.array(z.object({ productId: z.string() }).passthrough()), capabilityRegistry: z.array(z.string()), capabilityFacts: z.array(z.object({ productId: z.string(), capabilityId: z.string() }).passthrough()), technicalFacts: z.array(z.object({ productId: z.string(), factKey: z.string() }).passthrough()) }).passthrough();
const semanticSchema = z.object({ registryVersion: z.literal("WASHING_MACHINE_SEMANTIC_REGISTRY/v0.1"), status: z.string(), artifacts: z.record(z.string(), z.unknown()) }).passthrough();
const pricePointerSchema = z.strictObject({ schemaVersion: z.literal("appliances-price-active-pointer/v1"), snapshotId: z.string(), projectionFingerprint: z.string(), snapshotFile: z.string() });
const priceSchema = z.object({ schemaVersion: z.literal("washing-machine-price-projection/v1"), snapshotId: z.string(), catalogReleaseVersion: z.string(), catalogReleaseDigest: z.string(), membershipDigest: z.string(), publishedAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }), projectionFingerprint: z.string(), products: z.array(z.object({ productId: z.string(), status: z.enum(["PRICE_AVAILABLE", "PRICE_UNKNOWN", "CURRENTLY_UNAVAILABLE"]), observationRefs: z.array(z.string()), asOf: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }) }).passthrough()), observations: z.array(z.record(z.string(), z.unknown())) }).passthrough();
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const successorCatalogDigest = (catalog: Record<string, unknown>): string => { const { releaseDigest: ignored, ...core } = catalog; void ignored; return sha(JSON.stringify(canonical(core))); };
const deepFreeze = <T>(value: T, seen = new WeakSet<object>()): T => { if (!value || typeof value !== "object" || seen.has(value as object)) return value; seen.add(value as object); for (const child of Object.values(value as object)) deepFreeze(child, seen); return Object.freeze(value); };
const cache = new Map<string, AppliancesAuthoritySnapshot>();
export interface AppliancesArtifactRepository { readActive(): Promise<string>; readRelease(release: string, file: "manifest.json" | "catalog.json" | "semantic-registry.json"): Promise<string>; readPricePointer(): Promise<string>; readPriceSnapshot(relativeFile: string): Promise<string>; readDecisionApproval?(relativeFile: string): Promise<string> }
export function createFileSystemAppliancesArtifactRepository(repositoryRoot: string): AppliancesArtifactRepository { const authorityRoot = path.join(repositoryRoot, "data/production/appliances/washing-machines"); const priceRoot = path.join(repositoryRoot, "data/production/appliances/prices"); const approvalRoot = path.join(repositoryRoot, "data/production/appliances/decision-adoption/governance/approval-events"); return { readActive: () => readFile(path.join(authorityRoot, "active.json"), "utf8"), readRelease: (release, file) => { if (!SAFE_RELEASE.test(release)) return Promise.reject(new TypeError("UNSAFE_RELEASE_PATH")); const resolved = path.resolve(authorityRoot, "releases", release, file); const expectedRoot = `${path.resolve(authorityRoot, "releases", release)}${path.sep}`; if (!resolved.startsWith(expectedRoot)) return Promise.reject(new TypeError("UNSAFE_RELEASE_PATH")); return readFile(resolved, "utf8"); }, readPricePointer: () => readFile(path.join(priceRoot, "current.json"), "utf8"), readPriceSnapshot: (relativeFile) => { if (!/^snapshots\/[A-Za-z0-9+_.-]+\.json$/u.test(relativeFile)) return Promise.reject(new TypeError("UNSAFE_RELEASE_PATH")); const resolved = path.resolve(priceRoot, relativeFile); if (!resolved.startsWith(`${path.resolve(priceRoot, "snapshots")}${path.sep}`)) return Promise.reject(new TypeError("UNSAFE_RELEASE_PATH")); return readFile(resolved, "utf8"); }, readDecisionApproval: (relativeFile) => { const resolved = path.resolve(repositoryRoot, relativeFile); if (!resolved.startsWith(`${path.resolve(approvalRoot)}${path.sep}`)) return Promise.reject(new TypeError("UNSAFE_RELEASE_PATH")); return readFile(resolved, "utf8"); } }; }
const parseJson = (raw: string): unknown => JSON.parse(raw) as unknown;
const failure = (reason: AppliancesAuthorityFailure): AppliancesAuthorityLoadResult => ({ status: "FAILED_CLOSED", reason });
export async function loadActiveAppliancesAuthority(input: { repository: AppliancesArtifactRepository }): Promise<AppliancesAuthorityLoadResult> {
  let activeRaw: string;
  try { activeRaw = await input.repository.readActive(); } catch { return failure("ACTIVE_POINTER_MISSING"); }
  let active: z.infer<typeof activeSchema>;
  try { active = activeSchema.parse(parseJson(activeRaw)); } catch { return failure("ACTIVE_POINTER_INVALID"); }
  if (!SAFE_RELEASE.test(active.releaseVersion)) return failure("UNSAFE_RELEASE_PATH");
  let manifestRaw: string, catalogRaw: string, semanticRaw: string;
  try {
    [manifestRaw, catalogRaw, semanticRaw] = await Promise.all([
      input.repository.readRelease(active.releaseVersion, "manifest.json"),
      input.repository.readRelease(active.releaseVersion, "catalog.json"),
      input.repository.readRelease(active.releaseVersion, "semantic-registry.json"),
    ]);
  } catch (error) { return failure(error instanceof Error && error.message === "UNSAFE_RELEASE_PATH" ? "UNSAFE_RELEASE_PATH" : "RELEASE_MISSING"); }
  let manifest: z.infer<typeof manifestSchema>, catalog: z.infer<typeof catalogSchema>, semantic: z.infer<typeof semanticSchema>;
  try { manifest = manifestSchema.parse(parseJson(manifestRaw)); } catch { return failure("MANIFEST_INVALID"); }
  try { catalog = catalogSchema.parse(parseJson(catalogRaw)); } catch { return failure("CATALOG_SCHEMA_MISMATCH"); }
  try { semantic = semanticSchema.parse(parseJson(semanticRaw)); } catch { return failure("SEMANTIC_SCHEMA_MISMATCH"); }
  if (manifest.departmentId !== "APPLIANCES" || catalog.products.some((product) => product.departmentId !== "APPLIANCES")) return failure("WRONG_DEPARTMENT");
  if (manifest.market !== "TR" || catalog.products.some((product) => product.market !== "TR")) return failure("WRONG_MARKET");
  if (manifest.productType !== "WASHING_MACHINE" || catalog.products.some((product) => product.productType !== "WASHING_MACHINE")) return failure("WRONG_PRODUCT_TYPE");
  if (manifest.catalogReleaseVersion !== active.releaseVersion || catalog.releaseVersion !== active.releaseVersion || ![EXPECTED.release, MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.successor].includes(active.releaseVersion)) return failure("INCOMPATIBLE_AUTHORITY");
  if (catalog.releaseMembers.length !== manifest.memberCount || catalog.products.length !== manifest.memberCount) return failure("MEMBER_COUNT_MISMATCH");
  const ids = catalog.products.map((product) => product.productId);
  if (new Set(ids).size !== ids.length || new Set(catalog.releaseMembers).size !== catalog.releaseMembers.length) return failure("DUPLICATE_PRODUCT_IDENTITY");
  const memberSet = new Set(catalog.releaseMembers);
  if (ids.some((id) => !memberSet.has(id)) || catalog.historicalProducts.some((product) => memberSet.has(product.productId))) return failure("HISTORICAL_MEMBER_CONTAMINATION");
  const capabilities = new Set(catalog.capabilityRegistry);
  if (catalog.capabilityFacts.some((fact) => !capabilities.has(fact.capabilityId))) return failure("UNKNOWN_CAPABILITY_ID");
  if (catalog.technicalFacts.some((fact) => Object.keys(fact).some((key) => /price|offer|retailer|seller|affiliate|asin|review/iu.test(key)))) return failure("INCOMPATIBLE_AUTHORITY");
  const computedMembership = sha([...catalog.releaseMembers].sort().join("\n"));
  if (computedMembership !== manifest.membershipDigest || computedMembership !== catalog.membershipDigest) return failure("MEMBERSHIP_DIGEST_MISMATCH");
  const catalogArtifactSha256 = sha(catalogRaw);
  if (manifest.catalogArtifactSha256 !== catalogArtifactSha256) return failure("CATALOG_ARTIFACT_DIGEST_MISMATCH");
  if (sha(semanticRaw) !== manifest.semanticRegistryDigest || sha(semanticRaw) !== EXPECTED.semanticDigest || catalog.semanticRegistryDigest !== EXPECTED.semanticDigest) return failure("SEMANTIC_DIGEST_MISMATCH");
  if (manifest.semanticRegistryVersion !== EXPECTED.semanticVersion || semantic.registryVersion !== EXPECTED.semanticVersion || catalog.semanticRegistryRef.version !== EXPECTED.semanticVersion || catalog.semanticRegistryRef.digest !== EXPECTED.semanticDigest) return failure("SEMANTIC_REGISTRY_MISSING");
  if (active.releaseVersion === EXPECTED.release) {
    if (manifest.catalogDigest !== EXPECTED.catalogDigest || catalog.releaseDigest !== EXPECTED.catalogDigest || computedMembership !== EXPECTED.membershipDigest || catalogArtifactSha256 !== EXPECTED.catalogSha) return failure("INCOMPATIBLE_AUTHORITY");
  } else {
    if (active.schemaVersion !== "appliances-authority-active-pointer/v3" || active.decisionArtifactSha256 !== catalogArtifactSha256 || active.membershipDigest !== computedMembership || !input.repository.readDecisionApproval) return failure("INCOMPATIBLE_AUTHORITY");
    let approvalRaw: string;
    try { approvalRaw = await input.repository.readDecisionApproval(active.decisionActivation.approvalManifest); } catch { return failure("INCOMPATIBLE_AUTHORITY"); }
    if (!validateDecisionApprovalRaw(active.decisionActivation, approvalRaw)) return failure("INCOMPATIBLE_AUTHORITY");
    if (!isExpectedDecisionAdoptionBinding("WASHING_MACHINE", manifest.decisionAdoption) || !isExpectedDecisionAdoptionBinding("WASHING_MACHINE", (catalog as Record<string, unknown>).decisionAdoption)) return failure("INCOMPATIBLE_AUTHORITY");
    if (manifest.memberCount !== MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.expectedCount || memberSet.has(BLOCKED_TEKA_DISHWASHER_ID) || MAJOR_APPLIANCE_DECISION_ADDITIONS.WASHING_MACHINE.some((id) => !memberSet.has(id))) return failure("MEMBER_COUNT_MISMATCH");
    if (successorCatalogDigest(catalog as Record<string, unknown>) !== catalog.releaseDigest || manifest.catalogDigest !== catalog.releaseDigest) return failure("CATALOG_DIGEST_MISMATCH");
    let parentRaw: string;
    try { parentRaw = await input.repository.readRelease(MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.parent, "catalog.json"); } catch { return failure("RELEASE_MISSING"); }
    const parentMembers = (JSON.parse(parentRaw) as { releaseMembers: string[] }).releaseMembers;
    if (sha(parentRaw) !== MAJOR_APPLIANCE_DECISION_RELEASES.WASHING_MACHINE.parentArtifactSha256 || parentMembers.some((id) => !memberSet.has(id))) return failure("HISTORICAL_MEMBER_CONTAMINATION");
  }
  const existing = cache.get(manifest.catalogArtifactSha256);
  if (existing) return { status: "READY", snapshot: existing };
  const conceptRecords = (semantic.artifacts["washing-machine-user-needs/v1"] as { records?: unknown[] } | undefined)?.records ?? [];
  const conceptIds = new Set(conceptRecords.flatMap((record) => Array.isArray(record) && typeof record[0] === "string" ? [record[0]] : []));
  const snapshot = deepFreeze({ manifest, catalog, semanticRegistry: semantic, releaseVersion: catalog.releaseVersion, catalogDigest: catalog.releaseDigest, semanticDigest: manifest.semanticRegistryDigest, productIds: deepFreeze(memberSet), conceptIds: deepFreeze(conceptIds) });
  cache.set(manifest.catalogArtifactSha256, snapshot);
  return { status: "READY", snapshot };
}
const priceFailure = (reason: PriceProjectionFailure): PriceProjectionLoadResult => ({ status: "UNAVAILABLE", reason });
export async function loadCurrentPriceProjection(input: { repository: AppliancesArtifactRepository; authority: AppliancesAuthoritySnapshot; now: Date }): Promise<PriceProjectionLoadResult> { let pointerRaw: string; try { pointerRaw = await input.repository.readPricePointer(); } catch { return priceFailure("PRICE_POINTER_MISSING"); } let pointer; try { pointer = pricePointerSchema.parse(parseJson(pointerRaw)); } catch { return priceFailure("PRICE_POINTER_INVALID"); } let raw: string; try { raw = await input.repository.readPriceSnapshot(pointer.snapshotFile); } catch { return priceFailure("PRICE_SNAPSHOT_MISSING"); } let projection; let rawProjection: Record<string, unknown>; try { rawProjection = parseJson(raw) as Record<string, unknown>; projection = priceSchema.parse(rawProjection); } catch { return priceFailure("PRICE_SCHEMA_MISMATCH"); } const { projectionFingerprint: ignored, ...core } = rawProjection; void ignored; if (sha(JSON.stringify(core)) !== projection.projectionFingerprint || projection.projectionFingerprint !== pointer.projectionFingerprint) return priceFailure("PRICE_FINGERPRINT_MISMATCH"); if (projection.catalogReleaseVersion !== input.authority.releaseVersion || projection.catalogReleaseDigest !== input.authority.catalogDigest || projection.membershipDigest !== EXPECTED.membershipDigest) return priceFailure("PRICE_BINDING_MISMATCH"); const ids = projection.products.map((p) => p.productId); if (ids.length !== input.authority.productIds.size || new Set(ids).size !== ids.length || ids.some((id) => !input.authority.productIds.has(id))) return priceFailure("PRICE_PRODUCT_SET_MISMATCH"); return { status: Date.parse(projection.expiresAt) <= input.now.getTime() ? "STALE" : "READY", projection: deepFreeze(projection) }; }
export function resetAppliancesAuthorityCacheForTests(): void { cache.clear(); }
