export type PartnerCompanyType = "AUTO_GALLERY" | "AUTHORIZED_DEALER_USED" | "CORPORATE_USED_CARS" | "FLEET_RENTAL" | "OTHER_VERIFIED_CORPORATE";
export type PartnerDocumentType = "TAX_CERTIFICATE" | "TRADE_REGISTRY" | "SIGNATURE_CIRCULAR" | "IETTS_CERTIFICATE" | "BRANCH_AUTHORIZATION" | "REPRESENTATIVE_AUTHORIZATION" | "OTHER_CORPORATE";

export interface DocumentRequirement {
  readonly documentType: PartnerDocumentType; readonly appliesTo: readonly PartnerCompanyType[] | "ALL";
  readonly branchScoped: boolean; readonly required: boolean; readonly legalReviewRequired: boolean;
}
export interface DocumentRequirementRegistry {
  readonly version: string; readonly effectiveFrom: string; readonly supersedes: string | null;
  readonly requirements: readonly DocumentRequirement[]; readonly legalApprovalStatus: "DRAFT" | "APPROVED";
  readonly productionCollectionAuthorized: false;
}

export const syntheticPartnerDocumentRegistryV1: DocumentRequirementRegistry = {
  version: "partner-documents/tr-synthetic-v1", effectiveFrom: "2026-09-02", supersedes: null, legalApprovalStatus: "DRAFT", productionCollectionAuthorized: false,
  requirements: [
    { documentType: "TAX_CERTIFICATE", appliesTo: "ALL", branchScoped: false, required: true, legalReviewRequired: true },
    { documentType: "TRADE_REGISTRY", appliesTo: "ALL", branchScoped: false, required: true, legalReviewRequired: true },
    { documentType: "SIGNATURE_CIRCULAR", appliesTo: "ALL", branchScoped: false, required: true, legalReviewRequired: true },
    { documentType: "IETTS_CERTIFICATE", appliesTo: "ALL", branchScoped: true, required: true, legalReviewRequired: true },
    { documentType: "BRANCH_AUTHORIZATION", appliesTo: ["AUTHORIZED_DEALER_USED", "FLEET_RENTAL"], branchScoped: true, required: true, legalReviewRequired: true },
    { documentType: "REPRESENTATIVE_AUTHORIZATION", appliesTo: "ALL", branchScoped: false, required: true, legalReviewRequired: true },
    { documentType: "OTHER_CORPORATE", appliesTo: ["OTHER_VERIFIED_CORPORATE"], branchScoped: false, required: false, legalReviewRequired: true },
  ],
};

export function resolveDocumentRequirements(input: { readonly registry: DocumentRequirementRegistry; readonly companyType: PartnerCompanyType; readonly includeOptional?: boolean }) {
  return Object.freeze(input.registry.requirements.filter(requirement => (input.includeOptional || requirement.required) && (requirement.appliesTo === "ALL" || requirement.appliesTo.includes(input.companyType))));
}
