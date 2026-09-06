import { usedCarsStagingDeployables, type StagingSurface } from "./environmentManifest";

export interface StagingDeploymentBoundary {
  readonly surface: StagingSurface;
  readonly host: string;
  readonly deploymentProjectRef: string | null;
  readonly runtimeServiceAccountRef: string | null;
  readonly wafPolicyRef: string | null;
  readonly rateLimitNamespace: string;
  readonly sessionCookieDomain: null;
  readonly crossSurfaceSessionReadable: false;
  readonly inboundInternetEnabled: false;
  readonly deploymentCreated: false;
}

export const usedCarsStagingDeploymentBoundaries: readonly StagingDeploymentBoundary[] = Object.freeze(usedCarsStagingDeployables.map((deployable) => ({
  surface: deployable.surface,
  host: deployable.host,
  deploymentProjectRef: null,
  runtimeServiceAccountRef: null,
  wafPolicyRef: null,
  rateLimitNamespace: `used-cars:${deployable.surface.toLowerCase()}:staging`,
  sessionCookieDomain: null,
  crossSurfaceSessionReadable: false as const,
  inboundInternetEnabled: false as const,
  deploymentCreated: false as const,
})));

export function validateStagingDeploymentBoundaries(boundaries: readonly StagingDeploymentBoundary[]) {
  const codes: string[] = [];
  if (boundaries.length !== 3 || new Set(boundaries.map((item) => item.surface)).size !== 3) codes.push("SURFACE_COVERAGE_REQUIRED");
  for (const field of ["host", "rateLimitNamespace"] as const) if (new Set(boundaries.map((item) => item[field])).size !== boundaries.length) codes.push(`SURFACE_ISOLATION_REQUIRED:${field}`);
  for (const boundary of boundaries) {
    if (boundary.sessionCookieDomain !== null || boundary.crossSurfaceSessionReadable) codes.push(`SESSION_BOUNDARY_VIOLATION:${boundary.surface}`);
    if (boundary.deploymentProjectRef || boundary.runtimeServiceAccountRef || boundary.wafPolicyRef || boundary.inboundInternetEnabled || boundary.deploymentCreated) codes.push(`DEPLOYMENT_ENABLEMENT_FORBIDDEN:${boundary.surface}`);
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), deploymentCreationAuthorized: false as const, dnsChangeAuthorized: false as const });
}
