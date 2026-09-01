export type SupplyChainEvidenceKind = "CI_SCAN_SUMMARY" | "SBOM" | "SIGNED_PROVENANCE" | "IMMUTABILITY_TEST" | "LICENSE_REVIEW" | "REPRODUCIBLE_BUILD" | "PROMOTION_DIGEST_MATCH";
const requiredKinds: readonly SupplyChainEvidenceKind[] = Object.freeze(["CI_SCAN_SUMMARY", "SBOM", "SIGNED_PROVENANCE", "IMMUTABILITY_TEST", "LICENSE_REVIEW", "REPRODUCIBLE_BUILD", "PROMOTION_DIGEST_MATCH"]);
export interface SupplyChainEvidence { readonly kind: SupplyChainEvidenceKind; readonly environment: "STAGING"; readonly artifactDigest: string; readonly evidenceChecksum: string; readonly passed: boolean; readonly syntheticOnly: true; readonly independentReviewerId: string | null }

export function assessStagingSupplyChainEvidence(evidence: readonly SupplyChainEvidence[]) {
  const digestPattern = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredKinds.filter((kind) => !evidence.some((item) => item.kind === kind && item.environment === "STAGING" && item.passed && item.syntheticOnly && digestPattern.test(item.artifactDigest) && digestPattern.test(item.evidenceChecksum) && Boolean(item.independentReviewerId)));
  const artifactDigests = new Set(evidence.filter((item) => item.passed).map((item) => item.artifactDigest));
  const codes = artifactDigests.size > 1 ? ["ARTIFACT_DIGEST_MISMATCH"] : [];
  return Object.freeze({ complete: missing.length === 0 && codes.length === 0, missing: Object.freeze(missing), codes: Object.freeze(codes), artifactPromotionAuthorized: false as const });
}
