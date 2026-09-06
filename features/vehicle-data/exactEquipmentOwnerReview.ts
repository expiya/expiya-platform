import { fingerprint } from "./equipmentVerificationMaterialization";
import { validateExactEquipmentAssociationProposal, type ExactEquipmentAssociationProposal, type ExactEquipmentCatalogIdentity } from "./exactEquipmentAssociationProposal";

export const EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION = "1.0.0";

export type ExactEquipmentOwnerActor = {
  readonly actorId: string;
  readonly role: "EQUIPMENT_OWNER_APPROVER";
  readonly scope: "EQUIPMENT_EVIDENCE_ONLY";
  readonly status: "ACTIVE";
  readonly authorityVersion: string;
  readonly allowedActions: readonly string[];
};

export type ExactEquipmentOwnerManifest = {
  readonly manifestId: string;
  readonly policyVersion: typeof EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION;
  readonly catalogRelease: "v0.55.4";
  readonly catalogFingerprint: `sha256:${string}`;
  readonly parentProposalRelease: "v4.2.0-equipment-evidence-batch-01";
  readonly ownerActorId: "EQUIPMENT_OWNER_001";
  readonly generatedAt: string;
  readonly subjectCount: number;
  readonly subjects: readonly {
    readonly proposalId: string;
    readonly exactVariantId: string;
    readonly featureCode: string;
    readonly proposalFingerprint: `sha256:${string}`;
    readonly sourceArtifactSha256: `sha256:${string}`;
    readonly independentReviewEventId: string;
  }[];
  readonly manifestChecksum: `sha256:${string}`;
};

export type ExactEquipmentOwnerDecision = {
  readonly eventId: string;
  readonly eventType: "OWNER_PROPOSAL_DISPOSITION_RECORDED";
  readonly action: "APPROVED" | "REJECTED" | "DEFERRED";
  readonly proposalId: string;
  readonly exactVariantId: string;
  readonly featureCode: string;
  readonly proposalFingerprint: `sha256:${string}`;
  readonly sourceArtifactSha256: `sha256:${string}`;
  readonly independentReviewEventId: string;
  readonly actorId: "EQUIPMENT_OWNER_001";
  readonly actorRole: "EQUIPMENT_OWNER_APPROVER";
  readonly approvalManifestId: string;
  readonly approvalManifestChecksum: `sha256:${string}`;
  readonly policyVersion: typeof EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION;
  readonly reviewedAt: string;
  readonly reasonCodes: readonly string[];
  readonly limitations: readonly string[];
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
};

export const exactEquipmentProposalFingerprint = (proposal: ExactEquipmentAssociationProposal): `sha256:${string}` => fingerprint(proposal);
export const exactEquipmentOwnerManifestChecksum = (manifest: Omit<ExactEquipmentOwnerManifest, "manifestChecksum">): `sha256:${string}` => fingerprint(manifest);

export function validateExactEquipmentOwnerReview(input: {
  readonly actor: ExactEquipmentOwnerActor | undefined;
  readonly manifest: ExactEquipmentOwnerManifest;
  readonly proposals: readonly ExactEquipmentAssociationProposal[];
  readonly identities: ReadonlyMap<string, ExactEquipmentCatalogIdentity>;
  readonly decisions: readonly ExactEquipmentOwnerDecision[];
  readonly artifactDigests: ReadonlyMap<string, string>;
  readonly allowedDomains: readonly string[];
}): readonly string[] {
  const issues: string[] = [], push = (issue: string) => { if (!issues.includes(issue)) issues.push(issue); };
  const { manifestChecksum, ...manifestPayload } = input.manifest;
  if (!input.actor || input.actor.actorId !== input.manifest.ownerActorId || input.actor.role !== "EQUIPMENT_OWNER_APPROVER" || input.actor.scope !== "EQUIPMENT_EVIDENCE_ONLY" || input.actor.status !== "ACTIVE" || !input.actor.allowedActions.includes("APPROVE_SECOND_REVIEW_PASSED")) push("OWNER_ACTOR_UNAUTHORIZED");
  if (exactEquipmentOwnerManifestChecksum(manifestPayload) !== manifestChecksum) push("OWNER_MANIFEST_CHECKSUM_MISMATCH");
  if (input.manifest.subjectCount !== input.proposals.length || input.manifest.subjects.length !== input.proposals.length) push("OWNER_MANIFEST_SUBJECT_COUNT_MISMATCH");
  const proposals = new Map(input.proposals.map((proposal) => [proposal.proposalId, proposal]));
  const manifestSubjects = new Map(input.manifest.subjects.map((subject) => [subject.proposalId, subject]));
  const seen = new Set<string>();
  for (const decision of input.decisions) {
    if (seen.has(decision.proposalId)) push("DUPLICATE_OR_CONFLICTING_OWNER_EVENT");
    seen.add(decision.proposalId);
    const proposal = proposals.get(decision.proposalId), subject = manifestSubjects.get(decision.proposalId);
    if (!proposal || !subject) { push("OWNER_EVENT_SUBJECT_NOT_IN_MANIFEST"); continue; }
    const proposalFingerprint = exactEquipmentProposalFingerprint(proposal);
    if (subject.proposalFingerprint !== proposalFingerprint || decision.proposalFingerprint !== proposalFingerprint || decision.sourceArtifactSha256 !== proposal.source.artifactSha256 || subject.sourceArtifactSha256 !== proposal.source.artifactSha256 || decision.independentReviewEventId !== proposal.independentReview.eventId || subject.independentReviewEventId !== proposal.independentReview.eventId) push("OWNER_EVENT_EVIDENCE_BINDING_MISMATCH");
    if (input.artifactDigests.get(proposal.source.artifactReference) !== proposal.source.artifactSha256) push("SOURCE_ARTIFACT_DIGEST_MISMATCH");
    if (decision.exactVariantId !== proposal.exactVariantId || decision.featureCode !== proposal.featureCode || decision.actorId !== input.actor?.actorId || decision.actorRole !== "EQUIPMENT_OWNER_APPROVER") push("OWNER_EVENT_IDENTITY_MISMATCH");
    if (decision.approvalManifestId !== input.manifest.manifestId || decision.approvalManifestChecksum !== input.manifest.manifestChecksum || decision.policyVersion !== EXACT_EQUIPMENT_OWNER_REVIEW_POLICY_VERSION || decision.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") push("OWNER_EVENT_POLICY_MISMATCH");
    if (!Number.isFinite(Date.parse(decision.reviewedAt)) || Date.parse(decision.reviewedAt) < Date.parse(proposal.independentReview.reviewedAt)) push("OWNER_EVENT_DATE_INVALID");
    const identity = input.identities.get(proposal.exactVariantId);
    const proposalIssues = identity ? validateExactEquipmentAssociationProposal(proposal, identity, input.allowedDomains) : ["EXACT_VARIANT_ID_MISMATCH"];
    if (decision.action === "APPROVED" && proposalIssues.length) push("INVALID_PROPOSAL_APPROVED");
    if (decision.action !== "APPROVED" && decision.reasonCodes.length === 0) push("REJECTION_OR_DEFER_REASON_REQUIRED");
  }
  if (input.decisions.length !== input.proposals.length || seen.size !== input.proposals.length) push("OWNER_EVENT_COMPLETENESS_INVALID");
  return Object.freeze(issues.sort());
}
