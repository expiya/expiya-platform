import { describe, expect, it } from "vitest";
import { reconcileCandidateManualEvidence, sha256, stableJson, validateGlobalEvidenceCandidate, verifySha256 } from "./globalEvidence";

const boundaries = { candidateSelection: "NONE", hardFilters: "NONE", questions: "NONE", sufficiency: "NONE", ranking: "NONE", recommendation: "NONE", yAuthorization: "NONE", commerceOrdering: "NONE" };

describe("appliances global evidence candidate", () => {
  it("rejects exact assertions inherited from family-scoped evidence", () => {
    const issues = validateGlobalEvidenceCandidate({ assertions: [{ assertionId: "a", productId: "p", sourceId: "s", scope: "EXACT_PRODUCT", decisionUse: "EXPLANATION_ONLY", market: "TR", targetKey: "x", value: 1, applicabilityReason: "" }], sources: [{ sourceId: "s", url: "https://manufacturer.example/p", publisher: "manufacturer", sourceType: "MANUFACTURER_PRODUCT_PAGE", market: "GB", retrievedAt: "2026-09-05T00:00:00.000Z", applicability: "FAMILY_SCOPED", exactModelCodeObserved: "M", disposition: "EXPLANATION_ONLY" }], manuals: [], conflicts: [], boundaries });
    expect(issues).toContain("EXACT_ASSERTION_FROM_FAMILY_SOURCE:a");
  });

  it("keeps cross-market conflicts unknown and excluded", () => {
    expect(validateGlobalEvidenceCandidate({ assertions: [], sources: [], manuals: [], conflicts: [{ productId: "p", targetKey: "width", disposition: "PREFERRED_VALUE" }], boundaries })).toContain("CONFLICT_NOT_UNKNOWN:p:width");
  });

  it("requires checksum-bound in-range manual locators", () => {
    const issues = validateGlobalEvidenceCandidate({ assertions: [], sources: [], manuals: [{ productId: "p", exactProductCode: "M", sourceUrl: "https://manufacturer.example/m.pdf", officialPublisher: true, market: "TR", language: "tr-TR", retrievedAt: "2026-09-04T21:29:10.000Z", documentVersion: null, artifactSha256: `sha256:${"a".repeat(64)}`, immutableBytesPath: "bytes/m.pdf", applicabilityDetermination: "EXACT_TR_VERIFIED", disposition: "ADMITTED_EXACT_TR", byteLength: 1, pageCount: 2, identityLocator: { page: 1, section: "M" }, knowledgeLocators: [{ page: 3, section: "Safety", kind: "SAFETY" }] }], conflicts: [], boundaries });
    expect(issues).toContain("MANUAL_KNOWLEDGE_LOCATOR_INVALID:p");
  });

  it("keeps every decision surface neutral", () => {
    expect(validateGlobalEvidenceCandidate({ assertions: [], sources: [], manuals: [], conflicts: [], boundaries: { ...boundaries, ranking: "SOFT" } })).toContain("DECISION_NEUTRALITY_VIOLATION:ranking");
  });

  it("produces deterministic digests", () => {
    expect(sha256(stableJson({ b: 2, a: 1 }))).toBe(sha256(stableJson({ a: 1, b: 2 })));
    expect(verifySha256(`sha256:${sha256("payload")}`, "payload")).toBe(true);
    expect(verifySha256(`sha256:${sha256("payload")}`, "tampered")).toBe(false);
  });

  it("deduplicates active manual bytes and overlapping L9 locators while retaining new sections", () => {
    const shared = {
      productId: "ARZUM_AR012_LAGUNA_TR",
      exactProductCode: "AR 012",
      sourceUrl: "https://manufacturer.example/ar012.pdf",
      officialPublisher: true,
      market: "TR",
      language: "tr-TR",
      retrievedAt: "2026-09-04T21:29:10.000Z",
      documentVersion: null,
      artifactSha256: `sha256:${"a".repeat(64)}`,
      immutableBytesPath: "bytes/ar012.pdf",
      applicabilityDetermination: "EXACT_TR_VERIFIED" as const,
      disposition: "ADMITTED_EXACT_TR" as const,
      byteLength: 100,
      pageCount: 32,
      identityLocator: { page: 1, section: "AR 012" },
      knowledgeLocators: [
        { page: 4, section: "Topraklı elektrik bağlantısı güvenlik uyarısı", kind: "SAFETY" as const },
        { page: 10, section: "MONTAJ ŞEMASI", kind: "INSTALLATION" as const },
      ],
    };
    const reconciled = reconcileCandidateManualEvidence({
      activeManuals: [{ productId: shared.productId, artifactSha256: shared.artifactSha256 }],
      activeL9: [{ productId: shared.productId, locator: { page: 4, section: "topraklı" } }],
      candidateManuals: [shared],
    });

    expect(reconciled.newManuals).toEqual([]);
    expect(reconciled.newL9).toEqual([{ productId: shared.productId, manualArtifactSha256: shared.artifactSha256, locator: shared.knowledgeLocators[1] }]);
    expect(reconciled.newlyCoveredManualProductIds).toEqual([]);
    expect(reconciled.newlyCoveredL9ProductIds).toEqual([]);
  });
});
