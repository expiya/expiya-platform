import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const packageDirectory = path.join(
  root,
  "data/production/personas/universal/evidence-class-admission/XPY-PERSONA-EVIDENCE-CLASS-ADMISSION-01",
);
const eventDirectory = path.join(packageDirectory, "owner-approval");
const eventPath = path.join(eventDirectory, "owner-approval-event.json");
const expectedDigest = "sha256:85bb241c57b995c95b7118b022c2272cf541a189c7c6f451839e7d7a7ba67610";
const approvalStatement =
  "I approve XPY-PERSONA-EVIDENCE-CLASS-ADMISSION-TR-v0.1-owner-review at payload digest sha256:85bb241c57b995c95b7118b022c2272cf541a189c7c6f451839e7d7a7ba67610 as the proposed Persona evidence-class policy and shadow projection authority only; this approval does not activate ranking or alter catalog membership.";
const sha256 = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function main() {
  const ownerReview = JSON.parse(await readFile(path.join(packageDirectory, "owner-review-package.json"), "utf8"));
  const request = JSON.parse(await readFile(path.join(packageDirectory, "approval-request.json"), "utf8"));
  if (ownerReview.payloadDigest !== expectedDigest || request.packageDigest !== expectedDigest) {
    throw new Error("OWNER_APPROVAL_DIGEST_MISMATCH");
  }
  if (request.exactSentence !== approvalStatement) throw new Error("OWNER_APPROVAL_STATEMENT_MISMATCH");

  const approvedAt = existsSync(eventPath)
    ? JSON.parse(await readFile(eventPath, "utf8")).approvedAt
    : new Date().toISOString();
  const event = {
    schemaVersion: "xpy-persona-evidence-class-owner-approval-event/v1",
    eventId: "PERSONA-EVIDENCE-CLASS-OWNER-APPROVAL-20260906",
    eventType: "PERSONA_EVIDENCE_CLASS_POLICY_AND_SHADOW_AUTHORITY_APPROVED",
    actor: { role: "PRODUCT_OWNER", instanceId: "EXPIYA_PRODUCT_OWNER_001" },
    releaseId: ownerReview.releaseId,
    approvedPayloadDigest: expectedDigest,
    approvalStatement,
    approvalStatementSha256: sha256(approvalStatement),
    approvedAt,
    authority: "POLICY_AND_SHADOW_PROJECTION_ONLY",
    rankingActivationAuthorized: false,
    catalogMembershipMutationAuthorized: false,
    domainPackBindingAuthorized: false,
    deploymentAuthorized: false,
    appendOnly: true,
  };
  const status = {
    schemaVersion: "xpy-persona-evidence-class-owner-approved-status/v1",
    releaseId: ownerReview.releaseId,
    packageDigest: expectedDigest,
    ownerApprovalEventId: event.eventId,
    approvalState: "APPROVED_SHADOW_AUTHORITY_NOT_ACTIVE",
    activationState: "NOT_ACTIVE",
    governedProducts: ownerReview.coverage.governed,
    unknownProducts: ownerReview.coverage.unknown,
    conflictedProducts: ownerReview.coverage.conflicted,
    rankingChanged: false,
    catalogMembershipChanged: false,
    activePointerChanged: false,
    deploymentPerformed: false,
  };
  const eventRaw = json(event);
  const statusRaw = json(status);
  const manifest = {
    schemaVersion: "xpy-persona-evidence-class-owner-approval-manifest/v1",
    eventId: event.eventId,
    approvedPayloadDigest: expectedDigest,
    eventSha256: sha256(eventRaw),
    statusSha256: sha256(statusRaw),
    approvalStatementSha256: sha256(approvalStatement),
    approvalStatementFileSha256: sha256(`${approvalStatement}\n`),
    activationPerformed: false,
    catalogMembershipChanged: false,
    deploymentPerformed: false,
  };

  await mkdir(eventDirectory, { recursive: true });
  await writeFile(eventPath, eventRaw);
  await writeFile(path.join(eventDirectory, "approval-statement.txt"), `${approvalStatement}\n`);
  await writeFile(path.join(eventDirectory, "owner-approved-status.json"), statusRaw);
  await writeFile(path.join(eventDirectory, "manifest.json"), json(manifest));
  console.log(json(status));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
