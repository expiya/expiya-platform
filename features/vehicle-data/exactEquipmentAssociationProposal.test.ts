import { describe, expect, it } from "vitest";

import { validateExactEquipmentAssociationProposal, type ExactEquipmentAssociationProposal, type ExactEquipmentCatalogIdentity } from "./exactEquipmentAssociationProposal";

const hash = `sha256:${"a".repeat(64)}`;
const identity: ExactEquipmentCatalogIdentity = { exactVariantId: "variant-1", market: "TR", modelYear: 2026, trim: "Exact Trim", body: "SUV", powertrain: "BEV" };
const proposal: ExactEquipmentAssociationProposal = {
  proposalId: "proposal-1", exactVariantId: "variant-1", featureCode: "ADAPTIVE_CRUISE_CONTROL", availabilityStatus: "STANDARD", applicability: identity,
  source: { sourceId: "source-1", originalUrl: "https://www.example.com.tr/matrix.pdf", artifactReference: "data/matrix.pdf", artifactSha256: hash, capturedAt: "2026-09-04T12:21:54Z", language: "tr", market: "TR", publicationDate: "2026-06-01T00:00:00Z", modelYear: 2026, documentTrimLabel: "Exact Trim", documentBody: "SUV", documentPowertrain: "BEV", replaced: false, stale: false, locator: { pageNumber: 2, row: "ACC", column: "Exact Trim" } },
  interpretation: { explicitMatrixCell: true, optional: false, conditional: false, footnoteQualified: false, missingMentionTreatedAsNegative: false, siblingTrimInference: false, crossModelYearInference: false, foreignMarketInference: false },
  collection: { collectorActorId: "ACTOR-COLLECTOR-OWNER-MANUAL-001", collectedAt: "2026-09-04T12:21:54Z" },
  independentReview: { status: "PASSED", reviewerActorId: "ACTOR-REVIEWER-CODEX-EQUIPMENT-001", reviewedAt: "2026-09-04T13:00:00Z", eventId: "review-1" },
  ownerApproval: null, materializationStatus: "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING",
};

describe("validateExactEquipmentAssociationProposal", () => {
  it("accepts an exact, checksum-bound, independently reviewed proposal", () => {
    expect(validateExactEquipmentAssociationProposal(proposal, identity, ["example.com.tr"])).toEqual([]);
  });

  it("fails closed for wrong model year, sibling trim, optional/footnote scope, stale replacement, digest, and domain", () => {
    const unsafe = {
      ...proposal,
      applicability: { ...proposal.applicability, modelYear: 2025, trim: "Sibling Trim" },
      source: { ...proposal.source, originalUrl: "https://example.net/matrix.pdf", artifactSha256: "bad", modelYear: 2025, stale: true, replaced: true },
      interpretation: { ...proposal.interpretation, optional: true, footnoteQualified: true, siblingTrimInference: true, crossModelYearInference: true },
    } as unknown as ExactEquipmentAssociationProposal;
    expect(validateExactEquipmentAssociationProposal(unsafe, identity, ["example.com.tr"])).toEqual(expect.arrayContaining([
      "MODEL_YEAR_MISMATCH", "TRIM_MISMATCH", "SOURCE_DOMAIN_MISMATCH", "CHECKSUM_REQUIRED", "STALE_OR_REPLACED_SOURCE", "OPTIONAL_CONDITIONAL_OR_FOOTNOTE_SCOPE", "UNSAFE_INFERENCE",
    ]));
  });

  it("requires independent actor separation and preserves owner-pending status", () => {
    const unsafe = {
      ...proposal,
      collection: { ...proposal.collection, collectorActorId: proposal.independentReview.reviewerActorId },
      independentReview: { ...proposal.independentReview, reviewedAt: "2026-09-04T11:00:00Z" },
      materializationStatus: "VERIFIED",
    } as unknown as ExactEquipmentAssociationProposal;
    expect(validateExactEquipmentAssociationProposal(unsafe, identity, ["example.com.tr"])).toEqual(expect.arrayContaining([
      "COLLECTOR_REVIEWER_SEPARATION_REQUIRED", "REVIEW_DATE_INVALID", "OWNER_APPROVAL_MUST_REMAIN_PENDING",
    ]));
  });
});
