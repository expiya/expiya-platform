import { describe, expect, it } from "vitest";

import { validateExactEquipmentOwnerReview, exactEquipmentOwnerManifestChecksum, exactEquipmentProposalFingerprint, type ExactEquipmentOwnerDecision, type ExactEquipmentOwnerManifest } from "./exactEquipmentOwnerReview";
import type { ExactEquipmentAssociationProposal, ExactEquipmentCatalogIdentity } from "./exactEquipmentAssociationProposal";

const hash = `sha256:${"a".repeat(64)}` as const;
const identity: ExactEquipmentCatalogIdentity = { exactVariantId: "variant-1", market: "TR", modelYear: 2026, trim: "Exact", body: "SUV", powertrain: "BEV" };
const proposal: ExactEquipmentAssociationProposal = { proposalId: "proposal-1", exactVariantId: "variant-1", featureCode: "ADAPTIVE_CRUISE_CONTROL", availabilityStatus: "STANDARD", applicability: identity, source: { sourceId: "source-1", originalUrl: "https://example.com.tr/matrix.pdf", artifactReference: "matrix.pdf", artifactSha256: hash, capturedAt: "2026-09-04T12:00:00Z", language: "tr", market: "TR", publicationDate: "2026-06-01T00:00:00Z", modelYear: 2026, documentTrimLabel: "Exact", documentBody: "SUV", documentPowertrain: "BEV", replaced: false, stale: false, locator: { pageNumber: 2, row: "ACC", column: "Exact" } }, interpretation: { explicitMatrixCell: true, optional: false, conditional: false, footnoteQualified: false, missingMentionTreatedAsNegative: false, siblingTrimInference: false, crossModelYearInference: false, foreignMarketInference: false }, collection: { collectorActorId: "ACTOR-COLLECTOR-CODEX-CATALOG-001", collectedAt: "2026-09-04T12:00:00Z" }, independentReview: { status: "PASSED", reviewerActorId: "ACTOR-REVIEWER-CODEX-EQUIPMENT-001", reviewedAt: "2026-09-04T13:00:00Z", eventId: "review-1" }, ownerApproval: null, materializationStatus: "PROPOSAL_REVIEWED_OWNER_APPROVAL_PENDING" };
const subject = { proposalId: proposal.proposalId, exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, proposalFingerprint: exactEquipmentProposalFingerprint(proposal), sourceArtifactSha256: hash, independentReviewEventId: proposal.independentReview.eventId };
const manifestPayload = { manifestId: "manifest-1", policyVersion: "1.0.0", catalogRelease: "v0.55.4", catalogFingerprint: hash, parentProposalRelease: "v4.2.0-equipment-evidence-batch-01", ownerActorId: "EQUIPMENT_OWNER_001", generatedAt: "2026-09-04T14:00:00Z", subjectCount: 1, subjects: [subject] } as const;
const manifest: ExactEquipmentOwnerManifest = { ...manifestPayload, manifestChecksum: exactEquipmentOwnerManifestChecksum(manifestPayload) };
const decision: ExactEquipmentOwnerDecision = { eventId: "event-1", eventType: "OWNER_PROPOSAL_DISPOSITION_RECORDED", action: "APPROVED", proposalId: proposal.proposalId, exactVariantId: proposal.exactVariantId, featureCode: proposal.featureCode, proposalFingerprint: subject.proposalFingerprint, sourceArtifactSha256: hash, independentReviewEventId: proposal.independentReview.eventId, actorId: "EQUIPMENT_OWNER_001", actorRole: "EQUIPMENT_OWNER_APPROVER", approvalManifestId: manifest.manifestId, approvalManifestChecksum: manifest.manifestChecksum, policyVersion: "1.0.0", reviewedAt: "2026-09-04T14:00:00Z", reasonCodes: ["ALL_GATES_PASSED"], limitations: [], decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" };
const actor = { actorId: "EQUIPMENT_OWNER_001", role: "EQUIPMENT_OWNER_APPROVER", scope: "EQUIPMENT_EVIDENCE_ONLY", status: "ACTIVE", authorityVersion: "1.0.0", allowedActions: ["APPROVE_SECOND_REVIEW_PASSED"] } as const;
const valid = { actor, manifest, proposals: [proposal], identities: new Map([[identity.exactVariantId, identity]]), decisions: [decision], artifactDigests: new Map([[proposal.source.artifactReference, hash]]), allowedDomains: ["example.com.tr"] };

describe("validateExactEquipmentOwnerReview", () => {
  it("accepts a complete exact owner disposition", () => expect(validateExactEquipmentOwnerReview(valid)).toEqual([]));

  it("rejects unauthorized reviewer, duplicate/conflicting events and digest changes", () => {
    expect(validateExactEquipmentOwnerReview({ ...valid, actor: { ...actor, actorId: "ACTOR-REVIEWER-CODEX-EQUIPMENT-001" }, decisions: [decision, { ...decision, action: "REJECTED" }], artifactDigests: new Map([[proposal.source.artifactReference, `sha256:${"b".repeat(64)}`]]) } as unknown as typeof valid)).toEqual(expect.arrayContaining(["OWNER_ACTOR_UNAUTHORIZED", "DUPLICATE_OR_CONFLICTING_OWNER_EVENT", "SOURCE_ARTIFACT_DIGEST_MISMATCH", "OWNER_EVENT_COMPLETENESS_INVALID"]));
    expect(validateExactEquipmentOwnerReview({ ...valid, manifest: { ...manifest, manifestChecksum: `sha256:${"b".repeat(64)}` } })).toContain("OWNER_MANIFEST_CHECKSUM_MISMATCH");
  });

  it("rejects changed matrix cell, wrong trim/MY/market and supports a reasoned defer", () => {
    const changed = { ...proposal, applicability: { ...proposal.applicability, market: "DE", modelYear: 2025, trim: "Sibling" }, source: { ...proposal.source, locator: { ...proposal.source.locator, row: "Changed" } } } as unknown as ExactEquipmentAssociationProposal;
    expect(validateExactEquipmentOwnerReview({ ...valid, proposals: [changed] })).toEqual(expect.arrayContaining(["OWNER_EVENT_EVIDENCE_BINDING_MISMATCH", "INVALID_PROPOSAL_APPROVED"]));
    expect(validateExactEquipmentOwnerReview({ ...valid, decisions: [{ ...decision, action: "DEFERRED", reasonCodes: ["SOURCE_REVIEW_REQUIRED"] }] })).toEqual([]);
    expect(validateExactEquipmentOwnerReview({ ...valid, decisions: [{ ...decision, action: "REJECTED", reasonCodes: ["EXACT_APPLICABILITY_FAILED"] }] })).toEqual([]);
  });
});
