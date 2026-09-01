export type TaxonomyRollbackScenario = "DUAL_READ_COMPATIBILITY" | "POINTER_ACTIVATION_ABORT" | "PREVIOUS_RELEASE_RESTORE" | "CACHE_NAMESPACE_INVALIDATION" | "IDENTITY_REQUEST_QUEUE_CONTINUITY" | "LISTING_REFERENCE_CONTINUITY";
export const requiredTaxonomyRollbackScenarios: readonly TaxonomyRollbackScenario[] = Object.freeze(["DUAL_READ_COMPATIBILITY", "POINTER_ACTIVATION_ABORT", "PREVIOUS_RELEASE_RESTORE", "CACHE_NAMESPACE_INVALIDATION", "IDENTITY_REQUEST_QUEUE_CONTINUITY", "LISTING_REFERENCE_CONTINUITY"]);
export interface TaxonomyRollbackResult { readonly scenario: TaxonomyRollbackScenario; readonly environment: "STAGING"; readonly syntheticOnly: true; readonly passed: boolean; readonly recoveryTimeSeconds: number; readonly orphanReferenceCount: number; readonly evidenceChecksum: string; readonly productionPointerChanged: false }
export function assessTaxonomyRollbackSuite(results: readonly TaxonomyRollbackResult[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredTaxonomyRollbackScenarios.filter((scenario) => !results.some((result) => result.scenario === scenario && result.environment === "STAGING" && result.syntheticOnly && result.passed && result.recoveryTimeSeconds > 0 && result.recoveryTimeSeconds <= 600 && result.orphanReferenceCount === 0 && checksum.test(result.evidenceChecksum) && !result.productionPointerChanged));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), activationAuthorized: false as const, productionPointerChangeAuthorized: false as const });
}
