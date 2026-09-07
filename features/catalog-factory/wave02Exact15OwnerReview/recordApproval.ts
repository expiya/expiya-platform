import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT = "outputs/catalog-factory-wave-02-15-exact-owner-review-01";
const RECORDED_AT = "2026-09-07T06:30:00.000Z";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item);
const sha256 = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");

export async function recordWave02Exact15OwnerApproval(base = process.cwd()) {
  const directory = path.join(base, OUTPUT);
  const ownerReviewPackage = JSON.parse(await readFile(path.join(directory, "OWNER_REVIEW_PACKAGE.json"), "utf8"));
  const submittedText = (await readFile(path.join(directory, "OWNER_APPROVAL_SENTENCE.txt"), "utf8")).trimEnd();

  if (submittedText !== ownerReviewPackage.ownerApprovalSentence) throw new Error("OWNER_APPROVAL_SENTENCE_MISMATCH");
  if (sha256(submittedText) !== ownerReviewPackage.ownerApprovalSentenceDigest) throw new Error("OWNER_APPROVAL_SENTENCE_DIGEST_MISMATCH");
  if (ownerReviewPackage.candidateDigest !== "d874eda28ba560b03a1ee3af53168717bc815f9f46e73753c2e0ffbeb9673669") throw new Error("CANDIDATE_DIGEST_MISMATCH");
  if (ownerReviewPackage.totals.proposedAdditions !== 15 || ownerReviewPackage.approvalEligibility !== true) throw new Error("PACKAGE_NOT_APPROVAL_ELIGIBLE");

  const eventCore = {
    schemaVersion: "catalog-factory-owner-approval-event/v0.1",
    eventId: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-OWNER-REVIEW-01-OWNER-APPROVAL-01",
    eventType: "OWNER_APPROVAL_GRANTED",
    workUnitId: ownerReviewPackage.workUnitId,
    recordedAt: RECORDED_AT,
    decision: "APPROVED_FOR_SEPARATE_ATOMIC_ACTIVATION",
    candidateDigest: ownerReviewPackage.candidateDigest,
    packageDigest: ownerReviewPackage.packageDigest,
    ownerApprovalSentence: submittedText,
    ownerApprovalSentenceDigest: sha256(submittedText),
    approvedScope: {
      exactProductAdditions: 15,
      existingActiveMembership: "PRESERVE_EXACTLY",
    },
    authorizationBoundary: {
      separateAtomicActivationRequired: true,
      activationExecuted: false,
      activePointerWrite: false,
      runtimeMutation: false,
      databaseMutation: false,
      productionMutation: false,
      deployment: false,
      push: false,
    },
  } as const;
  const event = { ...eventCore, eventDigest: sha256(eventCore) };
  const governanceDirectory = path.join(directory, "governance", "approval-events", event.eventId);
  const checksums = {
    "owner-approval-event.json": `sha256:${sha256(event)}`,
    "owner-approval-sentence.txt": `sha256:${sha256(`${submittedText}\n`)}`,
  };

  await mkdir(governanceDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(governanceDirectory, "owner-approval-event.json"), `${stable(event)}\n`),
    writeFile(path.join(governanceDirectory, "owner-approval-sentence.txt"), `${submittedText}\n`),
    writeFile(path.join(governanceDirectory, "checksums.json"), `${stable(checksums)}\n`),
  ]);
  return event;
}

if (process.argv[1]?.endsWith("recordApproval.ts")) recordWave02Exact15OwnerApproval().then(event => console.log(JSON.stringify(event, null, 2)));
