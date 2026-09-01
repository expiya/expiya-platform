export type IettsVerificationResult = "VERIFIED" | "NOT_FOUND" | "EXPIRED" | "BRANCH_MISMATCH" | "UNAVAILABLE" | "REVOKED";

export interface IettsBranchVerification {
  readonly tenantId: string;
  readonly branchId: string;
  readonly authorizationCertificateNumber: string;
  readonly checkedAt: string;
  readonly validUntil: string | null;
  readonly renewalDueAt: string | null;
  readonly result: IettsVerificationResult;
  readonly source: "IETTS_RESERVED_SYNTHETIC_RESPONSE";
  readonly sourceReference: string;
  readonly syntheticOnly: true;
  readonly realProviderCallMade: false;
}

export function evaluateIettsBranchGate(input: {
  readonly verification: IettsBranchVerification | null;
  readonly tenantId: string;
  readonly branchId: string;
  readonly now: string;
}) {
  const codes: string[] = [];
  const record = input.verification;
  if (!record) codes.push("IETTS_VERIFICATION_REQUIRED");
  else {
    if (record.tenantId !== input.tenantId) codes.push("IETTS_TENANT_MISMATCH");
    if (record.branchId !== input.branchId) codes.push("IETTS_BRANCH_MISMATCH");
    if (!record.authorizationCertificateNumber.trim()) codes.push("IETTS_CERTIFICATE_NUMBER_REQUIRED");
    if (record.result !== "VERIFIED") codes.push(`IETTS_${record.result}`);
    if (!record.validUntil || record.validUntil <= input.now) codes.push("IETTS_VALIDITY_EXPIRED_OR_UNKNOWN");
    if (record.realProviderCallMade || !record.syntheticOnly || record.source !== "IETTS_RESERVED_SYNTHETIC_RESPONSE") codes.push("IETTS_PROVIDER_BOUNDARY_VIOLATION");
  }
  return Object.freeze({ gatePassed: codes.length === 0, codes: Object.freeze(codes), onboardingEligible: codes.length === 0, renewalEligible: codes.length === 0, publishingEligible: codes.length === 0, productionProviderCallAuthorized: false as const, productionMutationAuthorized: false as const });
}
