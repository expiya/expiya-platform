import { describe, expect, it } from "vitest";

import { validateExactTrManualPromotion, verifySha256Content, type ExactTrCatalogIdentity, type ExactTrManualPromotion } from "./ownerManualExactTrPromotion";

const hash = `sha256:${"a".repeat(64)}`;
const identity: ExactTrCatalogIdentity = { exactVariantId: "variant-1", market: "TR", modelYear: 2025, trim: "Comfort", body: "Hatchback", powertrain: "BEV" };
const promotion: ExactTrManualPromotion = {
  authorityLevel: "EXACT_VARIANT_VERIFIED", exactVariantId: "variant-1", featureCode: "ISOFIX_REAR_OUTER", polarity: "POSITIVE", confidence: "HIGH", status: "VERIFIED",
  applicability: { market: "TR", modelYear: 2025, trim: "Comfort", body: "Hatchback", powertrain: "BEV" },
  manualSource: { sourceId: "OM-ART-1", artifactReference: "https://manufacturer.test/manual.pdf", artifactSha256: hash, language: "tr", market: "TR", observedAt: "2026-08-25T00:00:00.000Z", locator: { physicalPdfPage: 24, sectionHeading: "ISOFIX" } },
  exactApplicabilitySource: { sourceId: "SRC-1", sourceType: "OFFICIAL_EQUIPMENT_MATRIX", artifactReference: "data/snapshot.pdf", originalUrl: "https://manufacturer.test/matrix.pdf", artifactSha256: hash, observedAt: "2026-08-19T00:45:00.000+03:00", reviewedAt: "2026-08-19T07:00:00.000+03:00", locator: { pageNumber: 3, row: "ISOFIX", column: "Comfort" } },
  reviewerAuthority: { ownerActorId: "OWNER-1", ownerApprovalEventId: "APPROVAL-1", independentReviewerActorId: "REVIEWER-1", independentReviewEventId: "REVIEW-1", approvalManifestId: "MANIFEST-1", approvalManifestChecksum: hash },
  limitations: ["Manual instructions remain read-only L9 knowledge."], manualConditionalEquipment: true, familyInheritance: false, conditionalPromotedToStandard: false, missingMentionTreatedAsNegative: false,
};

describe("exact-TR owner-manual promotion", () => {
  it("accepts a conditional family manual only when a separate exact source supplies applicability", () => {
    expect(validateExactTrManualPromotion(promotion, identity)).toEqual([]);
  });

  it.each([
    ["wrong market", { applicability: { ...promotion.applicability, market: "TR" as const }, manualSource: { ...promotion.manualSource, market: "TR" as const } }, { ...identity, market: "GB" }, "MARKET_MISMATCH"],
    ["wrong model year", { applicability: { ...promotion.applicability, modelYear: 2024 } }, identity, "MODEL_YEAR_MISMATCH"],
    ["wrong trim", { applicability: { ...promotion.applicability, trim: "Design" } }, identity, "TRIM_MISMATCH"],
    ["wrong powertrain", { applicability: { ...promotion.applicability, powertrain: "HEV" } }, identity, "POWERTRAIN_MISMATCH"],
  ])("fails closed for %s", (_label, patch, catalogIdentity, issue) => {
    expect(validateExactTrManualPromotion({ ...promotion, ...patch } as ExactTrManualPromotion, catalogIdentity as ExactTrCatalogIdentity)).toContain(issue);
  });

  it("rejects conditional promotion, sibling inheritance, and missing-mention negatives", () => {
    const unsafe = { ...promotion, familyInheritance: true, conditionalPromotedToStandard: true, missingMentionTreatedAsNegative: true } as unknown as ExactTrManualPromotion;
    expect(validateExactTrManualPromotion(unsafe, identity)).toEqual(expect.arrayContaining(["UNSAFE_INHERITANCE", "CONDITIONAL_PROMOTION_FORBIDDEN", "MISSING_MENTION_NEGATIVE_FORBIDDEN"]));
  });

  it("requires locators, checksums, and reviewer authority", () => {
    const incomplete = {
      ...promotion,
      manualSource: { ...promotion.manualSource, artifactSha256: "", locator: { physicalPdfPage: 0, sectionHeading: "" } },
      reviewerAuthority: { ...promotion.reviewerAuthority, ownerActorId: "", approvalManifestChecksum: "bad" },
    } as ExactTrManualPromotion;
    expect(validateExactTrManualPromotion(incomplete, identity)).toEqual(expect.arrayContaining(["LOCATOR_REQUIRED", "CHECKSUM_REQUIRED", "REVIEWER_AUTHORITY_REQUIRED"]));
  });

  it("detects digest tampering", () => {
    const expected = "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(verifySha256Content("abc", expected)).toBe(true);
    expect(verifySha256Content("tampered", expected)).toBe(false);
  });
});
