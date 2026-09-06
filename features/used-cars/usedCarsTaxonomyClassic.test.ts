import { describe, expect, it } from "vitest";
import { evaluateClassicClaim, type ClassicClaimEvidence } from "./inventory/classicClaims";
import { canTransitionIdentityRequest, canTransitionTaxonomyRelease, isIdentityRequestResolved, isTaxonomyReleaseActivatable } from "./taxonomy/governance";
import { evaluateTaxonomySourceForPublicUse, isAutomatedAcquisitionAllowed, type UsedTaxonomySource } from "./taxonomy/sourcePolicy";

describe("used-cars taxonomy governance", () => {
  it("requires validation and owner approval before release activation", () => {
    expect(canTransitionTaxonomyRelease("DRAFT", "ACTIVE")).toBe(false);
    expect(canTransitionTaxonomyRelease("DRAFT", "VALIDATED")).toBe(true);
    expect(canTransitionTaxonomyRelease("VALIDATED", "OWNER_APPROVED")).toBe(true);
    expect(canTransitionTaxonomyRelease("OWNER_APPROVED", "ACTIVE")).toBe(true);
    expect(canTransitionTaxonomyRelease("WITHDRAWN", "ACTIVE")).toBe(false);
    expect(isTaxonomyReleaseActivatable({ version: "0.1.0", status: "OWNER_APPROVED", payloadChecksum: `sha256:${"a".repeat(64)}`, entityCount: 10, market: "TR", previousReleaseVersion: null, approvedBy: "owner-1", approvedAt: "2026-09-01T00:00:00.000Z" })).toBe(true);
    expect(isTaxonomyReleaseActivatable({ version: "0.1.0", status: "VALIDATED", payloadChecksum: `sha256:${"a".repeat(64)}`, entityCount: 10, market: "TR", previousReleaseVersion: null })).toBe(false);
  });

  it("prevents seller requests from directly creating canonical identities", () => {
    expect(canTransitionIdentityRequest("SUBMITTED", "RESOLVED")).toBe(false);
    expect(canTransitionIdentityRequest("EVIDENCE_REVIEW", "NEW_ENTITY_PROPOSED")).toBe(true);
    expect(canTransitionIdentityRequest("NEW_ENTITY_PROPOSED", "SECOND_REVIEW")).toBe(true);
    expect(canTransitionIdentityRequest("SECOND_REVIEW", "RESOLVED")).toBe(true);
    expect(isIdentityRequestResolved({ requestStatus: "RESOLVED", moderatorApproved: true, secondReviewerApproved: true, resolvedTaxonomyEntityId: "taxonomy-1", sellerCanCreateCanonicalIdentity: false })).toBe(true);
    expect(isIdentityRequestResolved({ requestStatus: "RESOLVED", moderatorApproved: true, secondReviewerApproved: false, resolvedTaxonomyEntityId: "taxonomy-1", sellerCanCreateCanonicalIdentity: false })).toBe(false);
  });
});

describe("used-cars taxonomy source and licence gate", () => {
  const source: UsedTaxonomySource = {
    id: "source-1", authority: "OFFICIAL", usagePermission: "PUBLIC_FACTS_ONLY",
    reviewedAt: "2026-08-01T00:00:00.000Z", marketApplicability: "TR", automatedAcquisitionApproved: false,
  };

  it("allows current permitted TR sources but does not infer automation permission", () => {
    expect(evaluateTaxonomySourceForPublicUse(source, "2026-09-01T00:00:00.000Z")).toEqual({ allowed: true, codes: [] });
    expect(isAutomatedAcquisitionAllowed(source)).toBe(false);
  });

  it("blocks restricted, stale, expired, wrong-market and dealer-only sources", () => {
    expect(evaluateTaxonomySourceForPublicUse({ ...source, usagePermission: "PERMISSION_REQUIRED" }, "2026-09-01T00:00:00.000Z").codes).toContain("PUBLIC_USE_NOT_PERMITTED");
    expect(evaluateTaxonomySourceForPublicUse({ ...source, reviewedAt: "2025-01-01T00:00:00.000Z" }, "2026-09-01T00:00:00.000Z").codes).toContain("SOURCE_REVIEW_STALE");
    expect(evaluateTaxonomySourceForPublicUse({ ...source, usagePermission: "LICENSED", licenseValidUntil: "2026-08-31T00:00:00.000Z" }, "2026-09-01T00:00:00.000Z").codes).toContain("LICENSE_EXPIRED");
    expect(evaluateTaxonomySourceForPublicUse({ ...source, marketApplicability: "OTHER_MARKET" }, "2026-09-01T00:00:00.000Z").codes).toContain("TR_MARKET_APPLICABILITY_MISSING");
    expect(evaluateTaxonomySourceForPublicUse({ ...source, authority: "DEALER_SUBMISSION" }, "2026-09-01T00:00:00.000Z").codes).toContain("DEALER_SOURCE_CANNOT_VERIFY_CANONICAL_IDENTITY");
    expect(isAutomatedAcquisitionAllowed({ ...source, usagePermission: "OPEN_LICENSE", automatedAcquisitionApproved: true })).toBe(true);
  });
});

describe("classic vehicle high-risk public claims", () => {
  const evidence: ClassicClaimEvidence = {
    assertionStatus: "EXPIYA_VERIFIED", expertReviewStatus: "PASSED", sourceReferenceIds: ["archive-1"],
    chassisOrSerialEvidencePresent: true, archiveOrFactoryReferencePresent: true, conflictPresent: false, stale: false,
  };

  it("requires expert, archival and exact identity evidence for verified claims", () => {
    expect(evaluateClassicClaim("MATCHING_NUMBERS", evidence)).toMatchObject({ display: "EXPIYA_VERIFIED", purchaseInstructionAllowed: false, specialistInspectionRequired: true });
    expect(evaluateClassicClaim("MATCHING_NUMBERS", { ...evidence, chassisOrSerialEvidencePresent: false })).toMatchObject({ display: "DEALER_DECLARATION" });
    expect(evaluateClassicClaim("ORIGINAL", { ...evidence, expertReviewStatus: "NOT_REVIEWED" })).toMatchObject({ display: "DEALER_DECLARATION" });
    expect(evaluateClassicClaim("COLLECTIBLE", { ...evidence, stale: true })).toMatchObject({ display: "DEALER_DECLARATION" });
  });

  it("hides missing or conflicting claims instead of presenting them as facts", () => {
    expect(evaluateClassicClaim("ORIGINAL", { ...evidence, conflictPresent: true })).toMatchObject({ display: "HIDDEN", purchaseInstructionAllowed: false });
    expect(evaluateClassicClaim("PERIOD_CORRECT", { ...evidence, assertionStatus: "MISSING" })).toMatchObject({ display: "HIDDEN" });
  });
});

