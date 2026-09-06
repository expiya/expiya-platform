export type DeploymentRollbackScenario = "PARTNER_RELEASE_ROLLBACK" | "PUBLIC_RELEASE_ROLLBACK" | "OPS_RELEASE_ROLLBACK" | "DNS_CHANGE_ABORT" | "LEGACY_REDIRECT_ROLLBACK" | "SESSION_KEY_ROLLBACK";
export const requiredDeploymentRollbackScenarios: readonly DeploymentRollbackScenario[] = Object.freeze(["PARTNER_RELEASE_ROLLBACK", "PUBLIC_RELEASE_ROLLBACK", "OPS_RELEASE_ROLLBACK", "DNS_CHANGE_ABORT", "LEGACY_REDIRECT_ROLLBACK", "SESSION_KEY_ROLLBACK"]);
export interface DeploymentRollbackResult { readonly scenario: DeploymentRollbackScenario; readonly environment: "STAGING"; readonly passed: boolean; readonly syntheticOnly: true; readonly recoveryTimeSeconds: number; readonly evidenceChecksum: string; readonly productionChangePerformed: false }

export function assessDeploymentRollbackSuite(results: readonly DeploymentRollbackResult[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredDeploymentRollbackScenarios.filter((scenario) => !results.some((result) => result.scenario === scenario && result.environment === "STAGING" && result.passed && result.syntheticOnly && result.recoveryTimeSeconds > 0 && result.recoveryTimeSeconds <= 900 && checksum.test(result.evidenceChecksum) && !result.productionChangePerformed));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), rollbackExecutionAuthorized: false as const, productionChangeAuthorized: false as const });
}
