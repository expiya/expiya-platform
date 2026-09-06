import type { Wave4EvidenceRelease } from "./wave4EvidenceClosure";

export const ELECTRONICS_WAVE_4_SMART_HOME_HUB_REPAIR_VERSION = "ELECTRONICS-WAVE-4-SMART-HOME-HUB-REPAIR-TR-v0.1" as const;
export const ELECTRONICS_WAVE_4_RELEASE_DIGEST = "sha256:3cebc6073546f3a9dac526310f60edc131e84afe8eccf3d1bdb75ef37746ce0b" as const;

export interface Wave4SmartHomeHubRepairRelease extends Omit<Wave4EvidenceRelease, "schemaVersion" | "releaseVersion" | "parent" | "carryForward"> {
  readonly schemaVersion: "electronics-wave-4-smart-home-hub-repair/v1";
  readonly releaseVersion: typeof ELECTRONICS_WAVE_4_SMART_HOME_HUB_REPAIR_VERSION;
  readonly parent: { readonly releaseDigest: typeof ELECTRONICS_WAVE_4_RELEASE_DIGEST; readonly relationship: "IMMUTABLE_CHILD_NO_OVERWRITE" };
  readonly hubRepair: { readonly disposition: "REPAIRED"; readonly repairedCategoryId: "SMART_HOME_HUB"; readonly addedExactProductId: string; readonly independentManufacturer: "Signify / Philips Hue"; readonly productClassification: "STANDALONE_SMART_HOME_AUTOMATION_HUB" };
  readonly unchangedProof: { readonly scope: "ALL_NON_SMART_HOME_HUB_WAVE_4_RECORDS"; readonly parentSubsetDigest: `sha256:${string}`; readonly childSubsetDigest: `sha256:${string}`; readonly byteIdentical: true };
  readonly carryForward: { readonly scope: "WAVES_1_TO_3_AND_WAVE_4_NON_HUB_RECORDS"; readonly parentReleaseDigest: typeof ELECTRONICS_WAVE_4_RELEASE_DIGEST; readonly parentBytesUnmodified: true };
}

export function validateWave4SmartHomeHubRepair(release: Wave4SmartHomeHubRepairRelease): readonly string[] {
  const issues: string[] = [];
  const hubs = release.products.filter(row => row.categoryId === "SMART_HOME_HUB");
  const hue = hubs.find(row => row.exactProductId === release.hubRepair.addedExactProductId);
  const readiness = release.categoryReadiness.find(row => row.categoryId === "SMART_HOME_HUB");
  const gate = release.riskGates.find(row => row.categoryId === "SMART_HOME_HUB");
  if (release.parent.releaseDigest !== ELECTRONICS_WAVE_4_RELEASE_DIGEST || !release.carryForward.parentBytesUnmodified) issues.push("PARENT_PIN_INVALID");
  if (!hue || hue.modelCode !== "EAN 8719514342620 / 12NC 929001180642" || hue.unresolvedIdentityDiscriminators.length) issues.push("HUE_EXACT_IDENTITY_INVALID");
  if (new Set(hubs.map(row => row.manufacturer)).size < 2 || release.hubRepair.productClassification !== "STANDALONE_SMART_HOME_AUTOMATION_HUB") issues.push("HUB_DIVERSITY_OR_CLASSIFICATION_INVALID");
  if (!hue?.trApplicabilitySourceIds.some(id => release.sources.some(source => source.sourceId === id && source.market === "TR" && source.trApplicabilityAuthority === "EXACT"))) issues.push("TR_APPLICABILITY_INVALID");
  const keys = new Set(release.comparativeFacts.filter(row => row.exactProductId === hue?.exactProductId).map(row => row.key));
  for (const key of ["product_type", "protocols", "device_capacity", "account_cloud_local_dependency", "subscription", "privacy_data", "power_safety", "included_components"]) if (!keys.has(key)) issues.push(`MISSING_${key.toUpperCase()}`);
  if (!release.manuals.some(row => row.exactProductId === hue?.exactProductId && /^sha256:[a-f0-9]{64}$/u.test(row.sha256) && row.locators.length)) issues.push("HUE_MANUAL_INVALID");
  if (!readiness || readiness.readiness !== "DECISION_EVIDENCE_READY" || readiness.candidateCount !== 2 || readiness.manufacturerCount !== 2 || !gate || Object.values(gate).includes("BLOCKED_MATERIAL")) issues.push("HUB_NOT_READY");
  if (release.categoryReadiness.some(row => row.readiness !== "DECISION_EVIDENCE_READY")) issues.push("WAVE_4_NOT_FULLY_READY");
  if (!release.unchangedProof.byteIdentical || release.unchangedProof.parentSubsetDigest !== release.unchangedProof.childSubsetDigest) issues.push("NON_HUB_MUTATION");
  if (release.boundaries.activationPerformed || release.boundaries.runtimeChanged || release.boundaries.databaseChanged || release.boundaries.pointerChanged || release.boundaries.deploymentPerformed) issues.push("BOUNDARY_LEAK");
  return Object.freeze(issues);
}
