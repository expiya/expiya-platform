export type HostIsolationScenario = "HOST_HEADER_POISONING" | "CROSS_SURFACE_SESSION" | "CROSS_ORIGIN_REQUEST" | "CACHE_NAMESPACE_COLLISION" | "WRONG_AUTH_AUDIENCE" | "PUBLIC_WRITE_ATTEMPT" | "PARTNER_ROUTE_ON_PUBLIC_HOST" | "OPS_ROUTE_ON_PARTNER_HOST" | "CSP_REPORT_ONLY";
export const requiredHostIsolationScenarios: readonly HostIsolationScenario[] = Object.freeze(["HOST_HEADER_POISONING", "CROSS_SURFACE_SESSION", "CROSS_ORIGIN_REQUEST", "CACHE_NAMESPACE_COLLISION", "WRONG_AUTH_AUDIENCE", "PUBLIC_WRITE_ATTEMPT", "PARTNER_ROUTE_ON_PUBLIC_HOST", "OPS_ROUTE_ON_PARTNER_HOST", "CSP_REPORT_ONLY"]);
export interface HostIsolationResult { readonly scenario: HostIsolationScenario; readonly environment: "STAGING"; readonly blocked: boolean; readonly syntheticOnly: true; readonly evidenceChecksum: string; readonly reviewerId: string | null }

export function assessHostIsolationSuite(results: readonly HostIsolationResult[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredHostIsolationScenarios.filter((scenario) => !results.some((result) => result.scenario === scenario && result.environment === "STAGING" && result.blocked && result.syntheticOnly && checksum.test(result.evidenceChecksum) && Boolean(result.reviewerId)));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), hostExposureAuthorized: false as const });
}
