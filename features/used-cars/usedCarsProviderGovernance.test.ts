import { describe, expect, it } from "vitest";
import { assessProviderCandidate, assessProviderPortfolioCoverage } from "./vendor/providerAssessment";
import { usedCarsProviderRequirements, validateProviderRequirementRegistry } from "./vendor/providerRegistry";
describe("used-cars provider governance", () => {
  it("has one valid policy per provider capability", () => { expect(validateProviderRequirementRegistry(usedCarsProviderRequirements)).toEqual([]); expect(usedCarsProviderRequirements).toHaveLength(12); });
  it("fails incomplete candidates without enabling transfer", () => { const requirement = usedCarsProviderRequirements[0]; const result = assessProviderCandidate(requirement, { assessmentId: "a", providerReference: "candidate", capability: requirement.capability, satisfiedControls: [], dpaApproved: false, kvkkRoleRecorded: false, processingRegionsRecorded: false, internationalTransferMechanismApproved: false, subprocessorsReviewed: false, breachSlaApproved: false, deletionVerified: false, exitExportTested: false, securityReviewApproved: false, legalReviewApproved: false, commercialApprovalRecorded: false }); expect(result).toMatchObject({ approved: false, productionAdapterActivationAuthorized: false, dataTransferAuthorized: false }); });
  it("reports uncovered capabilities", () => expect(assessProviderPortfolioCoverage(usedCarsProviderRequirements, []).missing).toHaveLength(12));
});
