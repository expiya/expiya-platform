import type { Wave2EvidenceRelease } from "./wave2EvidenceClosure";

export const ELECTRONICS_WAVE_2_GAME_CONSOLE_REPAIR_VERSION = "ELECTRONICS-WAVE-2-GAME-CONSOLE-IDENTITY-REPAIR-TR-v0.1" as const;
export const ELECTRONICS_WAVE_2_GAME_CONSOLE_PARENT_DIGEST = "sha256:a92d56041f9150a87a5d4e01ae230217465b53507d247f8d134f28be2050892d" as const;

export interface Wave2GameConsoleIdentityRepairRelease extends Omit<Wave2EvidenceRelease, "schemaVersion" | "releaseVersion" | "parent"> {
  readonly schemaVersion: "electronics-wave-2-game-console-identity-repair/v1";
  readonly releaseVersion: typeof ELECTRONICS_WAVE_2_GAME_CONSOLE_REPAIR_VERSION;
  readonly parent: { readonly releaseDigest: typeof ELECTRONICS_WAVE_2_GAME_CONSOLE_PARENT_DIGEST; readonly relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" };
  readonly identityRepair: {
    readonly exactProductId: "electronics:game-console:microsoft:xbox-series-s-1tb-carbon-black";
    readonly disposition: "RESOLVED_BY_INDEPENDENT_TR_APPLICABILITY_AND_OFFICIAL_TECHNICAL_IDENTITY";
    readonly hardwareRevision: "MODEL_1883";
    readonly manufacturerProductId: "8ZCBGTT29H9C";
    readonly trApplicabilitySourceId: "xbox-tr:Series-S";
    readonly technicalIdentitySourceId: "microsoft-uk:8ZCBGTT29H9C";
    readonly revisionSensitiveClaims: "LIMITED_TO_MODEL_1883_SOURCE_SCOPE";
    readonly distinctConfigurationKey: "SERIES_S|1TB|ALL_DIGITAL|CARBON_BLACK|MODEL_1883|NO_BUNDLE";
  };
  readonly unchangedProof: { readonly scope: "ALL_NON_XBOX_WAVE_2_ENTITIES"; readonly parentSubsetDigest: `sha256:${string}`; readonly childSubsetDigest: `sha256:${string}`; readonly byteEquivalent: true };
}

export function validateWave2GameConsoleIdentityRepair(release: Wave2GameConsoleIdentityRepairRelease): readonly string[] {
  const issues: string[] = [];
  if (release.parent.releaseDigest !== ELECTRONICS_WAVE_2_GAME_CONSOLE_PARENT_DIGEST) issues.push("PARENT_DIGEST_MISMATCH");
  const xbox = release.products.find(row => row.exactProductId === release.identityRepair.exactProductId);
  if (!xbox || xbox.unresolvedIdentityDiscriminators.length || !xbox.configurationIdentity.includes("Model 1883") || !xbox.configurationIdentity.includes("1TB") || !xbox.configurationIdentity.includes("Carbon Black")) issues.push("XBOX_EXACT_IDENTITY_UNRESOLVED");
  const technicalSource = release.sources.find(row => row.sourceId === release.identityRepair.technicalIdentitySourceId);
  const trSource = release.sources.find(row => row.sourceId === release.identityRepair.trApplicabilitySourceId);
  if (!technicalSource || technicalSource.market !== "GLOBAL" || technicalSource.authority !== "INTERNATIONAL_BOUNDED" || technicalSource.trApplicabilityAuthority !== "NONE") issues.push("INTERNATIONAL_AUTHORITY_LEAK");
  if (!trSource || trSource.market !== "TR" || trSource.trApplicabilityAuthority !== "EXACT") issues.push("TR_APPLICABILITY_MISSING");
  const revisionFact = release.comparativeFacts.find(row => row.exactProductId === xbox?.exactProductId && row.key === "hardware_revision");
  if (!revisionFact || revisionFact.value !== "Model 1883" || revisionFact.sourceId !== release.identityRepair.technicalIdentitySourceId) issues.push("REVISION_FACT_INVALID");
  const readiness = release.categoryReadiness.find(row => row.categoryId === "GAME_CONSOLE");
  if (!readiness || readiness.readiness !== "DECISION_EVIDENCE_READY" || readiness.candidateCount < 2 || readiness.manufacturerCount < 2) issues.push("GAME_CONSOLE_NOT_READY");
  if (new Set(release.products.map(row => row.configurationIdentity)).size !== release.products.length || new Set(release.products.map(row => row.exactProductId)).size !== release.products.length) issues.push("IDENTITY_COLLISION");
  if (release.identityRepair.revisionSensitiveClaims !== "LIMITED_TO_MODEL_1883_SOURCE_SCOPE" || release.identityRepair.distinctConfigurationKey !== "SERIES_S|1TB|ALL_DIGITAL|CARBON_BLACK|MODEL_1883|NO_BUNDLE") issues.push("REVISION_SCOPE_UNSAFE");
  if (!release.unchangedProof.byteEquivalent || release.unchangedProof.parentSubsetDigest !== release.unchangedProof.childSubsetDigest) issues.push("UNCHANGED_WAVE_2_DRIFT");
  if (release.boundaries.l10YEffect !== "NONE" || release.boundaries.amazonStatusEffect !== "NONE" || release.boundaries.activationPerformed || release.boundaries.registryChanged || release.boundaries.runtimeChanged || release.boundaries.databaseChanged || release.boundaries.pointerChanged || release.boundaries.deploymentPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
