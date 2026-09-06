export interface UsedCarsFoundationReadinessInput {
  readonly architectureApproved: boolean;
  readonly domainContractsReady: boolean;
  readonly tenantIsolationTestsPassed: boolean;
  readonly publicProjectionTestsPassed: boolean;
  readonly mediaFraudTestsPassed: boolean;
  readonly leadConsentRetentionTestsPassed: boolean;
  readonly taxonomyGovernanceTestsPassed: boolean;
  readonly matchingFairnessTestsPassed: boolean;
  readonly legalReviewComplete: boolean;
  readonly rlsDesignApproved: boolean;
  readonly productionAdaptersPresent: boolean;
}

export interface UsedCarsFoundationReadiness {
  readonly foundationComplete: boolean;
  readonly pilotDataWriteAuthorized: false;
  readonly productionLaunchAuthorized: false;
  readonly blockingCodes: readonly string[];
}

export function assessUsedCarsFoundationReadiness(input: UsedCarsFoundationReadinessInput): UsedCarsFoundationReadiness {
  const foundationChecks = [
    [input.architectureApproved, "ARCHITECTURE_APPROVAL_MISSING"],
    [input.domainContractsReady, "DOMAIN_CONTRACTS_MISSING"],
    [input.tenantIsolationTestsPassed, "TENANT_ISOLATION_TESTS_MISSING"],
    [input.publicProjectionTestsPassed, "PUBLIC_PROJECTION_TESTS_MISSING"],
    [input.mediaFraudTestsPassed, "MEDIA_FRAUD_TESTS_MISSING"],
    [input.leadConsentRetentionTestsPassed, "LEAD_CONSENT_TESTS_MISSING"],
    [input.taxonomyGovernanceTestsPassed, "TAXONOMY_GOVERNANCE_TESTS_MISSING"],
    [input.matchingFairnessTestsPassed, "MATCHING_FAIRNESS_TESTS_MISSING"],
  ] as const;
  const blockingCodes = [
    ...foundationChecks.filter(([passed]) => !passed).map(([, code]) => code),
    ...(!input.legalReviewComplete ? ["LEGAL_REVIEW_REQUIRED"] : []),
    ...(!input.rlsDesignApproved ? ["RLS_DESIGN_APPROVAL_REQUIRED"] : []),
    ...(!input.productionAdaptersPresent ? ["PRODUCTION_ADAPTERS_NOT_IMPLEMENTED"] : []),
  ];
  return Object.freeze({
    foundationComplete: foundationChecks.every(([passed]) => passed),
    pilotDataWriteAuthorized: false,
    productionLaunchAuthorized: false,
    blockingCodes: Object.freeze(blockingCodes),
  });
}

