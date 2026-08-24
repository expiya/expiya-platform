import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const requestDirectory = path.join(
  root,
  "data/production/personas/evidence/owner-approval/requests/persona-v3.9-2026-08-24-01",
);
const requestPath = path.join(requestDirectory, "owner-approval-request.json");
const requestRaw = readFileSync(requestPath, "utf8");
const request = JSON.parse(requestRaw);
const requestChecksum = `sha256:${createHash("sha256").update(requestRaw).digest("hex")}`;
const requestManifest = JSON.parse(readFileSync(path.join(requestDirectory, "manifest.json"), "utf8"));

if (requestManifest.payloadSha256 !== requestChecksum) throw new Error("OWNER_APPROVAL_REQUEST_CHECKSUM_MISMATCH");
if (request.approvalStatus !== "AWAITING_OWNER_SIGNATURE" || request.ownerSignature !== null) {
  throw new Error("OWNER_APPROVAL_REQUEST_NOT_SIGNABLE");
}

const approvalStatement = "595 onay ve 5 ret kararını onaylıyorum";
const eventId = "PERSONA-V39-OWNER-APPROVAL-2026-08-24-01";
const eventDirectory = path.join(root, "data/production/personas/evidence/owner-approval/events", eventId);
const eventPath = path.join(eventDirectory, "owner-approval-event.json");
const approvedAt = existsSync(eventPath)
  ? JSON.parse(readFileSync(eventPath, "utf8")).approvedAt
  : new Date().toISOString();

const approved = request.decisions.filter((decision) => decision.recommendedDecision === "APPROVE");
const rejected = request.decisions.filter((decision) => decision.recommendedDecision === "REJECT");
if (approved.length !== 595 || rejected.length !== 5) throw new Error("OWNER_APPROVAL_DISPOSITION_MISMATCH");

const approvalEvent = {
  schemaVersion: "3.9.0-owner-approval-event.1",
  eventId,
  eventType: "PERSONA_TRAIT_DISPOSITION_OWNER_APPROVED",
  actor: { role: "PRODUCT_OWNER", instanceId: "EXPIYA_CARS_PRODUCT_OWNER_001" },
  approvalStatement,
  approvalStatementSha256: `sha256:${createHash("sha256").update(approvalStatement).digest("hex")}`,
  requestId: request.requestId,
  requestPayloadSha256: requestChecksum,
  decisionScope: request.decisionScope,
  disposition: { approveClaimCount: approved.length, rejectClaimCount: rejected.length },
  scorePolicy: request.scorePolicy,
  approvedAt,
  runtimeActivationAuthorized: false,
  activePointerMutationAuthorized: false,
  appendOnly: true,
};

const releaseId = "v3.9.0-catalog-v0.55.4-2026-08-24-owner-approved-rc.1";
const ownerApprovedCandidate = {
  schemaVersion: "3.9.0-owner-approved-candidate.1",
  releaseVersion: releaseId,
  approvalStatus: "OWNER_APPROVED_NOT_ACTIVE",
  sourceRequest: { requestId: request.requestId, payloadSha256: requestChecksum },
  ownerApproval: { eventId, approvedAt, actor: approvalEvent.actor },
  scorePolicy: request.scorePolicy,
  coverage: {
    familyCount: request.families.length,
    variantCount: new Set(request.families.flatMap((family) => family.exactVariantIds)).size,
    reviewedClaimCount: request.decisions.length,
    approvedClaimCount: approved.length,
    rejectedClaimCount: rejected.length,
  },
  families: request.families,
  approvedClaims: approved.map((decision) => ({ ...decision, finalDecision: "APPROVE" })),
  rejectedClaims: rejected.map((decision) => ({ ...decision, finalDecision: "REJECT" })),
  activationPerformed: false,
  rankingMutationAllowed: false,
  activePointerMutationAllowed: false,
};

mkdirSync(eventDirectory, { recursive: true });
writeFileSync(eventPath, `${JSON.stringify(approvalEvent, null, 2)}\n`);
writeFileSync(path.join(eventDirectory, "approval-statement.txt"), `${approvalStatement}\n`);

const releaseDirectory = path.join(
  root,
  "data/production/personas/evidence/owner-approved/release-candidates",
  releaseId,
);
mkdirSync(releaseDirectory, { recursive: true });
const candidateRaw = `${JSON.stringify(ownerApprovedCandidate, null, 2)}\n`;
writeFileSync(path.join(releaseDirectory, "owner-approved-candidate.json"), candidateRaw);
const manifest = {
  releaseVersion: releaseId,
  payloadSha256: `sha256:${createHash("sha256").update(candidateRaw).digest("hex")}`,
  ownerApprovalEventId: eventId,
  ownerApprovalRequestSha256: requestChecksum,
  familyCount: ownerApprovedCandidate.coverage.familyCount,
  variantCount: ownerApprovedCandidate.coverage.variantCount,
  reviewedClaimCount: ownerApprovedCandidate.coverage.reviewedClaimCount,
  approvedClaimCount: ownerApprovedCandidate.coverage.approvedClaimCount,
  rejectedClaimCount: ownerApprovedCandidate.coverage.rejectedClaimCount,
  approvalStatus: ownerApprovedCandidate.approvalStatus,
  activationPerformed: false,
  activePointerChanged: false,
};
writeFileSync(path.join(releaseDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  path.join(eventDirectory, "manifest.json"),
  `${JSON.stringify({ eventId, requestPayloadSha256: requestChecksum, releaseVersion: releaseId, approvalEventSha256: `sha256:${createHash("sha256").update(`${JSON.stringify(approvalEvent, null, 2)}\n`).digest("hex")}`, activationPerformed: false }, null, 2)}\n`,
);

console.log(JSON.stringify(manifest, null, 2));
