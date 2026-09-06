export type StagingArtifactClass = "APPLICATION_IMAGE" | "SBOM" | "PROVENANCE";
export interface StagingArtifactLane { readonly artifactClass: StagingArtifactClass; readonly repositoryRef: string | null; readonly immutableTagsRequired: true; readonly digestOnlyPromotion: true; readonly retentionDays: number; readonly encryptionRequired: true; readonly publicReadAllowed: false; readonly registryConfigured: false }

export const usedCarsStagingArtifactLanes: readonly StagingArtifactLane[] = Object.freeze([
  { artifactClass: "APPLICATION_IMAGE", repositoryRef: null, immutableTagsRequired: true, digestOnlyPromotion: true, retentionDays: 90, encryptionRequired: true, publicReadAllowed: false, registryConfigured: false },
  { artifactClass: "SBOM", repositoryRef: null, immutableTagsRequired: true, digestOnlyPromotion: true, retentionDays: 365, encryptionRequired: true, publicReadAllowed: false, registryConfigured: false },
  { artifactClass: "PROVENANCE", repositoryRef: null, immutableTagsRequired: true, digestOnlyPromotion: true, retentionDays: 365, encryptionRequired: true, publicReadAllowed: false, registryConfigured: false },
]);

export function validateStagingArtifactRegistry(lanes: readonly StagingArtifactLane[]) {
  const required: readonly StagingArtifactClass[] = ["APPLICATION_IMAGE", "SBOM", "PROVENANCE"];
  const codes: string[] = [];
  for (const artifactClass of required) if (!lanes.some((lane) => lane.artifactClass === artifactClass)) codes.push(`ARTIFACT_LANE_REQUIRED:${artifactClass}`);
  for (const lane of lanes) {
    if (!lane.immutableTagsRequired || !lane.digestOnlyPromotion || !lane.encryptionRequired || lane.publicReadAllowed) codes.push(`REGISTRY_POLICY_INVALID:${lane.artifactClass}`);
    if (lane.repositoryRef || lane.registryConfigured) codes.push(`REGISTRY_ENABLEMENT_FORBIDDEN:${lane.artifactClass}`);
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), registryProvisioningAuthorized: false as const });
}
