export interface BuildArtifactAttestation { readonly artifactId: string; readonly sourceCommit: string; readonly buildWorkflowId: string; readonly artifactChecksum: string; readonly sbomChecksum: string; readonly provenanceChecksum: string; readonly signature: string; readonly builderIdentity: string; readonly dependencyLockChecksum: string; readonly secretScanPassed: boolean; readonly sastPassed: boolean; readonly dependencyScanPassed: boolean; readonly artifactScanPassed: boolean; readonly generatedAt: string; readonly reproducibleBuildVerified: boolean; readonly productionPromotionAuthorized: false }
const checksum = /^sha256:[a-f0-9]{64}$/u;
export function validateBuildArtifactAttestation(attestation: BuildArtifactAttestation) {
  const codes: string[] = [];
  if (!/^[a-f0-9]{40,64}$/u.test(attestation.sourceCommit)) codes.push("INVALID_SOURCE_COMMIT");
  for (const [name, value] of [["ARTIFACT", attestation.artifactChecksum], ["SBOM", attestation.sbomChecksum], ["PROVENANCE", attestation.provenanceChecksum], ["LOCKFILE", attestation.dependencyLockChecksum]] as const) if (!checksum.test(value)) codes.push(`${name}_CHECKSUM_INVALID`);
  if (!attestation.signature || !attestation.builderIdentity) codes.push("SIGNATURE_AND_BUILDER_REQUIRED");
  if (!attestation.secretScanPassed) codes.push("SECRET_SCAN_FAILED");
  if (!attestation.sastPassed) codes.push("SAST_FAILED");
  if (!attestation.dependencyScanPassed) codes.push("DEPENDENCY_SCAN_FAILED");
  if (!attestation.artifactScanPassed) codes.push("ARTIFACT_SCAN_FAILED");
  if (!attestation.reproducibleBuildVerified) codes.push("REPRODUCIBLE_BUILD_NOT_VERIFIED");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), productionPromotionAuthorized: false as const });
}

export function verifyPromotionArtifact(input: { readonly attestation: BuildArtifactAttestation; readonly deployedArtifactChecksum: string; readonly expectedSourceCommit: string }) {
  const codes = [...validateBuildArtifactAttestation(input.attestation).codes];
  if (input.attestation.artifactChecksum !== input.deployedArtifactChecksum) codes.push("DEPLOYED_ARTIFACT_MISMATCH");
  if (input.attestation.sourceCommit !== input.expectedSourceCommit) codes.push("SOURCE_COMMIT_MISMATCH");
  return Object.freeze({ verified: codes.length === 0, codes: Object.freeze(codes), deploymentAuthorized: false as const });
}
