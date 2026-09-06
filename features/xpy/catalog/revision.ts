import { createHash } from "node:crypto";

import { requireXpyDomainPack } from "../domainPacks";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import { XPY_CATALOG_VERSION } from "./contract";

export const XPY_CATALOG_REVISION_VERSION = "xpy-catalog-revision/v1" as const;

export type CatalogRevisionDepartment = "CARS" | "APPLIANCES" | "ELECTRONICS";
export type CatalogRevisionLifecycle = "ELIGIBLE" | "INELIGIBLE" | "RETIRED";
export type CatalogRevisionValidationIssue =
  | "MANIFEST_DIGEST_MISMATCH"
  | "REVISION_SCHEMA_UNSUPPORTED"
  | "CATALOG_SCHEMA_UNSUPPORTED"
  | "RELEASE_DIGEST_INVALID"
  | "MEMBERSHIP_DIGEST_MISMATCH"
  | "MEMBER_COUNT_MISMATCH"
  | "EXACT_IDENTITY_COLLISION"
  | "EXACT_CONFIGURATION_COLLISION"
  | "MARKET_MISMATCH"
  | "LIFECYCLE_INVALID"
  | "PROVENANCE_REQUIRED"
  | "EVIDENCE_REQUIRED"
  | "DOMAIN_VALIDATION_FAILED"
  | "XPY_RUNTIME_INCOMPATIBLE"
  | "DOMAIN_PACK_INCOMPATIBLE"
  | "SEMANTIC_AUTHORITY_INVALID"
  | "VOLATILE_BOUNDARY_INVALID"
  | "ACTIVATION_POLICY_INVALID";

export interface CatalogRevisionMember {
  readonly exactId: string;
  readonly exactConfigurationIdentity: string;
  readonly market: string;
  readonly lifecycle: CatalogRevisionLifecycle;
  readonly provenanceCount: number;
  readonly evidenceCount: number;
}

export interface CatalogRevisionManifest {
  readonly schemaVersion: typeof XPY_CATALOG_REVISION_VERSION;
  readonly manifestDigest: `sha256:${string}`;
  readonly release: {
    readonly version: string;
    readonly digest: `sha256:${string}`;
    readonly membershipDigest: `sha256:${string}`;
    readonly memberCount: number;
    readonly lifecycle: "FROZEN";
  };
  readonly scope: {
    readonly departmentId: CatalogRevisionDepartment;
    readonly categoryId: string;
    readonly market: "TR";
  };
  readonly compatibility: {
    readonly catalogSchemaVersion: string;
    readonly xpyCatalogVersion: typeof XPY_CATALOG_VERSION;
    readonly runtimeVersion: typeof XPY_RUNTIME_VERSION;
    readonly runtimeDigest: typeof XPY_RUNTIME_DIGEST;
    readonly domainPackId: string;
    readonly semanticAuthorityVersion: string;
    readonly semanticAuthorityDigest: `sha256:${string}`;
  };
  readonly authority: {
    readonly domainValidatorId: string;
    readonly domainValidationStatus: "PASS" | "FAIL";
    readonly domainValidationIssues: readonly string[];
    readonly provenanceDigest: `sha256:${string}`;
    readonly evidenceDigest: `sha256:${string}`;
  };
  readonly members: readonly CatalogRevisionMember[];
  readonly volatileData: {
    readonly price: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN";
    readonly media: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN";
    readonly offers: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN";
    readonly contributesToFrozenReleaseDigest: false;
    readonly decisionAuthority: "NONE";
  };
  readonly activation: {
    readonly automatic: false;
    readonly requiresValidatedDryRun: true;
    readonly requiresExplicitOperatorSelection: true;
  };
}

type UnsignedCatalogRevisionManifest = Omit<CatalogRevisionManifest, "manifestDigest">;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
    .join(",")}}`;
}

export const sha256Digest = (value: string): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const catalogMembershipDigest = (ids: readonly string[]): `sha256:${string}` => sha256Digest([...ids].sort((a, b) => a.localeCompare(b, "en")).join("\n"));

export function catalogRevisionManifestDigest(manifest: UnsignedCatalogRevisionManifest | CatalogRevisionManifest): `sha256:${string}` {
  const { manifestDigest: ignored, ...unsigned } = manifest as CatalogRevisionManifest;
  void ignored;
  return sha256Digest(canonical(unsigned));
}

export function createCatalogRevisionManifest(input: Omit<UnsignedCatalogRevisionManifest, "schemaVersion" | "volatileData" | "activation">): CatalogRevisionManifest {
  const unsigned: UnsignedCatalogRevisionManifest = {
    schemaVersion: XPY_CATALOG_REVISION_VERSION,
    ...input,
    volatileData: {
      price: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN",
      media: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN",
      offers: "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN",
      contributesToFrozenReleaseDigest: false,
      decisionAuthority: "NONE",
    },
    activation: { automatic: false, requiresValidatedDryRun: true, requiresExplicitOperatorSelection: true },
  };
  return Object.freeze({ ...unsigned, manifestDigest: catalogRevisionManifestDigest(unsigned) });
}

const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const add = (issues: CatalogRevisionValidationIssue[], issue: CatalogRevisionValidationIssue) => {
  if (!issues.includes(issue)) issues.push(issue);
};

export function validateCatalogRevisionManifest(manifest: CatalogRevisionManifest): readonly CatalogRevisionValidationIssue[] {
  const issues: CatalogRevisionValidationIssue[] = [];
  if (manifest.schemaVersion !== XPY_CATALOG_REVISION_VERSION) add(issues, "REVISION_SCHEMA_UNSUPPORTED");
  if (manifest.manifestDigest !== catalogRevisionManifestDigest(manifest)) add(issues, "MANIFEST_DIGEST_MISMATCH");
  if (!manifest.compatibility.catalogSchemaVersion.trim()) add(issues, "CATALOG_SCHEMA_UNSUPPORTED");
  if (!digestPattern.test(manifest.release.digest)) add(issues, "RELEASE_DIGEST_INVALID");
  if (manifest.release.membershipDigest !== catalogMembershipDigest(manifest.members.map((member) => member.exactId))) add(issues, "MEMBERSHIP_DIGEST_MISMATCH");
  if (manifest.release.memberCount < 1 || manifest.release.memberCount !== manifest.members.length) add(issues, "MEMBER_COUNT_MISMATCH");
  if (manifest.members.some((member) => !member.exactId.trim()) || new Set(manifest.members.map((member) => member.exactId)).size !== manifest.members.length) add(issues, "EXACT_IDENTITY_COLLISION");
  if (manifest.members.some((member) => !member.exactConfigurationIdentity.trim()) || new Set(manifest.members.map((member) => member.exactConfigurationIdentity)).size !== manifest.members.length) add(issues, "EXACT_CONFIGURATION_COLLISION");
  if (manifest.scope.market !== "TR" || manifest.members.some((member) => member.market !== manifest.scope.market)) add(issues, "MARKET_MISMATCH");
  if (manifest.release.lifecycle !== "FROZEN" || manifest.members.some((member) => !["ELIGIBLE", "INELIGIBLE", "RETIRED"].includes(member.lifecycle))) add(issues, "LIFECYCLE_INVALID");
  if (manifest.members.some((member) => member.provenanceCount < 1) || !digestPattern.test(manifest.authority.provenanceDigest)) add(issues, "PROVENANCE_REQUIRED");
  if (manifest.members.some((member) => member.evidenceCount < 1) || !digestPattern.test(manifest.authority.evidenceDigest)) add(issues, "EVIDENCE_REQUIRED");
  if (manifest.authority.domainValidationStatus !== "PASS" || manifest.authority.domainValidationIssues.length) add(issues, "DOMAIN_VALIDATION_FAILED");
  if (manifest.compatibility.xpyCatalogVersion !== XPY_CATALOG_VERSION || manifest.compatibility.runtimeVersion !== XPY_RUNTIME_VERSION || manifest.compatibility.runtimeDigest !== XPY_RUNTIME_DIGEST) add(issues, "XPY_RUNTIME_INCOMPATIBLE");
  try {
    const pack = requireXpyDomainPack(manifest.scope.departmentId);
    if (pack.domainPackId !== manifest.compatibility.domainPackId || !pack.categories.includes(manifest.scope.categoryId)) add(issues, "DOMAIN_PACK_INCOMPATIBLE");
  } catch {
    add(issues, "DOMAIN_PACK_INCOMPATIBLE");
  }
  if (!manifest.compatibility.semanticAuthorityVersion.trim() || !digestPattern.test(manifest.compatibility.semanticAuthorityDigest)) add(issues, "SEMANTIC_AUTHORITY_INVALID");
  if (manifest.volatileData.price !== "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN" || manifest.volatileData.media !== "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN" || manifest.volatileData.offers !== "SEPARATE_REVISION_BOUND_EXACT_ID_JOIN" || manifest.volatileData.contributesToFrozenReleaseDigest !== false || manifest.volatileData.decisionAuthority !== "NONE") add(issues, "VOLATILE_BOUNDARY_INVALID");
  if (manifest.activation.automatic !== false || manifest.activation.requiresValidatedDryRun !== true || manifest.activation.requiresExplicitOperatorSelection !== true) add(issues, "ACTIVATION_POLICY_INVALID");
  return Object.freeze(issues);
}

export const XPY_REVISION_ARTIFACTS = [
  "X_INFORMATIONAL_RESPONSE",
  "Y_VALIDATED_CONTEXT_FACTS",
  "Y_CANDIDATE_EVALUATION",
  "P_QUESTIONS",
  "Y_SUFFICIENCY",
  "Y_SELECTION",
  "Y_RECOMMENDATION",
  "Y_AUTHORIZATION",
  "ASAMA_1_CARDS",
  "ASAMA_2_ADVISOR",
  "ASAMA_2_COMPARISON_ENTITLEMENTS",
  "ASAMA_2_SIGNED_HANDOFFS",
  "ASAMA_3_SIGNED_HANDOFFS",
  "ASAMA_3_ACTIONS",
] as const;
export type XpyRevisionArtifact = typeof XPY_REVISION_ARTIFACTS[number];
export type XpyRevisionDisposition = "REMAINS_VALID" | "RECOMPUTE_REQUIRED" | "FAIL_CLOSED";

export interface CatalogRevisionImpact {
  readonly compatibility: "UNCHANGED" | "COMPATIBLE_CONTENT_CHANGE" | "INCOMPATIBLE";
  readonly reason: string;
  readonly artifacts: Readonly<Record<XpyRevisionArtifact, XpyRevisionDisposition>>;
}

const artifacts = (disposition: XpyRevisionDisposition): Record<XpyRevisionArtifact, XpyRevisionDisposition> => Object.fromEntries(XPY_REVISION_ARTIFACTS.map((artifact) => [artifact, disposition])) as Record<XpyRevisionArtifact, XpyRevisionDisposition>;

export function determineCatalogRevisionImpact(previous: CatalogRevisionManifest, proposed: CatalogRevisionManifest): CatalogRevisionImpact {
  const validationIssues = [...validateCatalogRevisionManifest(previous), ...validateCatalogRevisionManifest(proposed)];
  const sameScope = previous.scope.departmentId === proposed.scope.departmentId && previous.scope.categoryId === proposed.scope.categoryId && previous.scope.market === proposed.scope.market;
  const sameCompatibility = previous.compatibility.catalogSchemaVersion === proposed.compatibility.catalogSchemaVersion
    && previous.compatibility.xpyCatalogVersion === proposed.compatibility.xpyCatalogVersion
    && previous.compatibility.runtimeVersion === proposed.compatibility.runtimeVersion
    && previous.compatibility.runtimeDigest === proposed.compatibility.runtimeDigest
    && previous.compatibility.domainPackId === proposed.compatibility.domainPackId
    && previous.compatibility.semanticAuthorityVersion === proposed.compatibility.semanticAuthorityVersion
    && previous.compatibility.semanticAuthorityDigest === proposed.compatibility.semanticAuthorityDigest;
  if (validationIssues.length || !sameScope || !sameCompatibility) {
    return Object.freeze({ compatibility: "INCOMPATIBLE", reason: validationIssues.length ? `REVISION_VALIDATION_FAILED:${[...new Set(validationIssues)].join(",")}` : "SCOPE_OR_SEMANTIC_COMPATIBILITY_CHANGED", artifacts: Object.freeze(artifacts("FAIL_CLOSED")) });
  }
  if (previous.release.digest === proposed.release.digest && previous.release.membershipDigest === proposed.release.membershipDigest) {
    return Object.freeze({ compatibility: "UNCHANGED", reason: "FROZEN_RELEASE_AND_MEMBERSHIP_DIGESTS_UNCHANGED", artifacts: Object.freeze(artifacts("REMAINS_VALID")) });
  }
  const result = artifacts("RECOMPUTE_REQUIRED");
  result.X_INFORMATIONAL_RESPONSE = "REMAINS_VALID";
  result.Y_VALIDATED_CONTEXT_FACTS = "REMAINS_VALID";
  for (const artifact of ["Y_AUTHORIZATION", "ASAMA_1_CARDS", "ASAMA_2_ADVISOR", "ASAMA_2_COMPARISON_ENTITLEMENTS", "ASAMA_2_SIGNED_HANDOFFS", "ASAMA_3_SIGNED_HANDOFFS", "ASAMA_3_ACTIONS"] as const) result[artifact] = "FAIL_CLOSED";
  return Object.freeze({ compatibility: "COMPATIBLE_CONTENT_CHANGE", reason: "CATALOG_CONTENT_OR_MEMBERSHIP_CHANGED_WITH_STABLE_RUNTIME_DOMAIN_AND_SEMANTICS", artifacts: Object.freeze(result) });
}

export interface CatalogRevisionBinding {
  readonly releaseVersion: string;
  readonly releaseDigest: string;
  readonly membershipDigest: string;
  readonly semanticAuthorityDigest: string;
  readonly runtimeDigest: string;
  readonly domainPackId: string;
  readonly exactIds: readonly string[];
}

export const bindCatalogRevision = (manifest: CatalogRevisionManifest, exactIds: readonly string[]): CatalogRevisionBinding => ({
  releaseVersion: manifest.release.version,
  releaseDigest: manifest.release.digest,
  membershipDigest: manifest.release.membershipDigest,
  semanticAuthorityDigest: manifest.compatibility.semanticAuthorityDigest,
  runtimeDigest: manifest.compatibility.runtimeDigest,
  domainPackId: manifest.compatibility.domainPackId,
  exactIds: Object.freeze([...new Set(exactIds)].sort((a, b) => a.localeCompare(b, "en"))),
});

const bindingMatches = (binding: CatalogRevisionBinding, manifest: CatalogRevisionManifest) => binding.releaseDigest === manifest.release.digest
  && binding.membershipDigest === manifest.release.membershipDigest
  && binding.semanticAuthorityDigest === manifest.compatibility.semanticAuthorityDigest
  && binding.runtimeDigest === manifest.compatibility.runtimeDigest
  && binding.domainPackId === manifest.compatibility.domainPackId
  && binding.exactIds.every((id) => manifest.members.some((member) => member.exactId === id));

export type CatalogBoundArtifactRevalidation =
  | { readonly status: "ACTIVE_VALID"; readonly executable: true }
  | { readonly status: "RECOMPUTE_REQUIRED"; readonly executable: false; readonly recoveryMessage: string }
  | { readonly status: "HISTORICAL_READ_ONLY"; readonly executable: false; readonly releaseVersion: string; readonly recoveryMessage: string }
  | { readonly status: "FAILED_CLOSED"; readonly executable: false; readonly recoveryMessage: string };

export function revalidateCatalogBoundArtifact(input: { readonly artifact: XpyRevisionArtifact; readonly binding: CatalogRevisionBinding; readonly current: CatalogRevisionManifest; readonly historical?: readonly CatalogRevisionManifest[] }): CatalogBoundArtifactRevalidation {
  if (validateCatalogRevisionManifest(input.current).length) return { status: "FAILED_CLOSED", executable: false, recoveryMessage: "Etkin katalog doğrulanamadı. Karar, yetki veya işlem taşınmadı; operatör doğrulaması gerekir." };
  if (bindingMatches(input.binding, input.current)) return { status: "ACTIVE_VALID", executable: true };
  const historical = input.historical?.find((manifest) => validateCatalogRevisionManifest(manifest).length === 0 && manifest.release.version === input.binding.releaseVersion && bindingMatches(input.binding, manifest));
  if (historical) return { status: "HISTORICAL_READ_ONLY", executable: false, releaseVersion: historical.release.version, recoveryMessage: "Bu kayıt bağlı olduğu doğrulanmış katalog sürümüyle salt okunur açıldı; yeni işlem için karar yeniden hesaplanmalıdır." };
  const compatibleSemantics = input.binding.semanticAuthorityDigest === input.current.compatibility.semanticAuthorityDigest
    && input.binding.runtimeDigest === input.current.compatibility.runtimeDigest
    && input.binding.domainPackId === input.current.compatibility.domainPackId;
  if (compatibleSemantics && (input.artifact === "X_INFORMATIONAL_RESPONSE" || input.artifact === "Y_VALIDATED_CONTEXT_FACTS")) return { status: "ACTIVE_VALID", executable: true };
  if (compatibleSemantics && ["Y_CANDIDATE_EVALUATION", "P_QUESTIONS", "Y_SUFFICIENCY", "Y_SELECTION", "Y_RECOMMENDATION"].includes(input.artifact)) return { status: "RECOMPUTE_REQUIRED", executable: false, recoveryMessage: "Katalog değişti. Korunan kullanıcı bağlamıyla değerlendirme yeniden hesaplanmalıdır." };
  return { status: "FAILED_CLOSED", executable: false, recoveryMessage: "Bağlı katalog sürümü doğrulanamadı. Karar, yetki veya işlem taşınmadı; yeni bir değerlendirme başlatın." };
}

export interface CatalogVolatileSnapshotBinding {
  readonly kind: "PRICE" | "MEDIA" | "OFFER";
  readonly catalogReleaseVersion: string;
  readonly catalogReleaseDigest: string;
  readonly membershipDigest: string;
  readonly exactIds: readonly string[];
}

export function validateCatalogVolatileSnapshotBinding(binding: CatalogVolatileSnapshotBinding, manifest: CatalogRevisionManifest): { readonly status: "VALID" } | { readonly status: "REJECTED"; readonly reason: "CATALOG_REVISION_INVALID" | "CATALOG_REVISION_MISMATCH" | "EXACT_IDENTITY_MISMATCH" } {
  if (validateCatalogRevisionManifest(manifest).length) return { status: "REJECTED", reason: "CATALOG_REVISION_INVALID" };
  if (binding.catalogReleaseVersion !== manifest.release.version || binding.catalogReleaseDigest !== manifest.release.digest || binding.membershipDigest !== manifest.release.membershipDigest) return { status: "REJECTED", reason: "CATALOG_REVISION_MISMATCH" };
  const members = new Set(manifest.members.map((member) => member.exactId));
  if (new Set(binding.exactIds).size !== binding.exactIds.length || binding.exactIds.some((id) => !members.has(id))) return { status: "REJECTED", reason: "EXACT_IDENTITY_MISMATCH" };
  return { status: "VALID" };
}

export interface CatalogRevisionDryRunReport {
  readonly schemaVersion: "xpy-catalog-revision-dry-run/v1";
  readonly proposed: CatalogRevisionManifest;
  readonly validation: { readonly status: "PASS" | "FAIL"; readonly issues: readonly CatalogRevisionValidationIssue[] };
  readonly impact: CatalogRevisionImpact;
  readonly activationGate: {
    readonly status: "READY_FOR_EXPLICIT_OPERATOR_SELECTION" | "BLOCKED";
    readonly automaticActivation: false;
    readonly activePointerMutated: false;
    readonly reason: string;
  };
}

export function createCatalogRevisionDryRunReport(current: CatalogRevisionManifest, proposed: CatalogRevisionManifest): CatalogRevisionDryRunReport {
  const issues = validateCatalogRevisionManifest(proposed);
  const impact = determineCatalogRevisionImpact(current, proposed);
  const ready = issues.length === 0 && impact.compatibility !== "INCOMPATIBLE";
  return Object.freeze({
    schemaVersion: "xpy-catalog-revision-dry-run/v1",
    proposed,
    validation: { status: ready ? "PASS" as const : "FAIL" as const, issues },
    impact,
    activationGate: {
      status: ready ? "READY_FOR_EXPLICIT_OPERATOR_SELECTION" as const : "BLOCKED" as const,
      automaticActivation: false as const,
      activePointerMutated: false as const,
      reason: ready ? "Validation passed; activation still requires an explicit operator selection outside this dry-run." : "Validation or compatibility failed; activation is forbidden.",
    },
  });
}
