export interface UsedCarsMigrationPrerequisites {
  readonly verifiedSessionContract: boolean; readonly poolTransactionIsolationTested: boolean; readonly compositeTenantKeysReviewed: boolean;
  readonly retentionMatrixLegallyApproved: boolean; readonly kmsAndHmacRotationApproved: boolean; readonly publicProjectionFailClosedTested: boolean;
  readonly moderatorGrantModelReviewed: boolean; readonly independentSecurityReviewComplete: boolean; readonly stagingRollbackTested: boolean;
}
export interface UsedCarsMigrationReadiness { readonly ready: boolean; readonly missing: readonly (keyof UsedCarsMigrationPrerequisites)[]; readonly productionWriteAuthorized: false }
export function assessMigrationReadiness(input: UsedCarsMigrationPrerequisites): UsedCarsMigrationReadiness { const missing = (Object.entries(input) as [keyof UsedCarsMigrationPrerequisites, boolean][]).filter(([,ready]) => !ready).map(([key]) => key); return Object.freeze({ ready: missing.length === 0, missing: Object.freeze(missing), productionWriteAuthorized: false }); }
