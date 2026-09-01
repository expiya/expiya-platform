export type StagingCiJobKind = "LOCKFILE_VERIFY" | "SECRET_SCAN" | "SAST" | "DEPENDENCY_SCAN" | "LICENSE_REVIEW" | "TEST_BUILD" | "SBOM_PROVENANCE" | "ARTIFACT_SCAN" | "PROMOTION_VERIFY";

export interface StagingCiJob {
  readonly jobId: string;
  readonly kind: StagingCiJobKind;
  readonly dependsOn: readonly string[];
  readonly blocksPromotionOnFailure: true;
  readonly networkMode: "NONE" | "DEPENDENCY_REGISTRY_ONLY";
  readonly writeTokenAvailable: false;
  readonly configured: false;
}

export const usedCarsStagingCiJobs: readonly StagingCiJob[] = Object.freeze([
  { jobId: "ci-lockfile", kind: "LOCKFILE_VERIFY", dependsOn: [], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-secret-scan", kind: "SECRET_SCAN", dependsOn: ["ci-lockfile"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-sast", kind: "SAST", dependsOn: ["ci-lockfile"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-dependency", kind: "DEPENDENCY_SCAN", dependsOn: ["ci-lockfile"], blocksPromotionOnFailure: true, networkMode: "DEPENDENCY_REGISTRY_ONLY", writeTokenAvailable: false, configured: false },
  { jobId: "ci-license", kind: "LICENSE_REVIEW", dependsOn: ["ci-dependency"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-test-build", kind: "TEST_BUILD", dependsOn: ["ci-secret-scan", "ci-sast", "ci-dependency"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-sbom-provenance", kind: "SBOM_PROVENANCE", dependsOn: ["ci-test-build", "ci-license"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-artifact-scan", kind: "ARTIFACT_SCAN", dependsOn: ["ci-sbom-provenance"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
  { jobId: "ci-promotion-verify", kind: "PROMOTION_VERIFY", dependsOn: ["ci-artifact-scan"], blocksPromotionOnFailure: true, networkMode: "NONE", writeTokenAvailable: false, configured: false },
]);

const requiredKinds: readonly StagingCiJobKind[] = Object.freeze(["LOCKFILE_VERIFY", "SECRET_SCAN", "SAST", "DEPENDENCY_SCAN", "LICENSE_REVIEW", "TEST_BUILD", "SBOM_PROVENANCE", "ARTIFACT_SCAN", "PROMOTION_VERIFY"]);

export function validateStagingCiManifest(jobs: readonly StagingCiJob[]) {
  const codes: string[] = [];
  const ids = new Set(jobs.map((job) => job.jobId));
  if (ids.size !== jobs.length) codes.push("DUPLICATE_JOB_ID");
  for (const kind of requiredKinds) if (!jobs.some((job) => job.kind === kind)) codes.push(`JOB_KIND_REQUIRED:${kind}`);
  for (const job of jobs) {
    if (job.dependsOn.some((dependency) => !ids.has(dependency))) codes.push(`UNKNOWN_DEPENDENCY:${job.jobId}`);
    if (!job.blocksPromotionOnFailure) codes.push(`FAIL_OPEN_FORBIDDEN:${job.jobId}`);
    if (job.writeTokenAvailable || job.configured) codes.push(`CI_ENABLEMENT_FORBIDDEN:${job.jobId}`);
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), ciConfigurationAuthorized: false as const });
}
