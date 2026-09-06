export interface SecurityTestEnvironmentManifest { readonly environmentId: string; readonly deploymentRef: string | null; readonly databaseRef: string | null; readonly identityRealmRef: string | null; readonly internetIngressEnabled: false; readonly productionNetworkPeeringAllowed: false; readonly productionBackupRestoreAllowed: false; readonly syntheticDataOnly: true; readonly resetAfterEngagementRequired: true; readonly outboundAllowlist: readonly string[]; readonly provisioned: false }
export const usedCarsSecurityTestEnvironment: SecurityTestEnvironmentManifest = Object.freeze({ environmentId: "used-cars-security-staging-v1", deploymentRef: null, databaseRef: null, identityRealmRef: null, internetIngressEnabled: false, productionNetworkPeeringAllowed: false, productionBackupRestoreAllowed: false, syntheticDataOnly: true, resetAfterEngagementRequired: true, outboundAllowlist: [], provisioned: false });

export function validateSecurityTestEnvironment(manifest: SecurityTestEnvironmentManifest) {
  const codes: string[] = [];
  if (manifest.deploymentRef || manifest.databaseRef || manifest.identityRealmRef || manifest.provisioned) codes.push("ENVIRONMENT_PROVISIONING_FORBIDDEN");
  if (manifest.internetIngressEnabled || manifest.productionNetworkPeeringAllowed || manifest.productionBackupRestoreAllowed || !manifest.syntheticDataOnly) codes.push("ENVIRONMENT_ISOLATION_REQUIRED");
  if (!manifest.resetAfterEngagementRequired) codes.push("RESET_POLICY_REQUIRED");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), environmentProvisioningAuthorized: false as const });
}
