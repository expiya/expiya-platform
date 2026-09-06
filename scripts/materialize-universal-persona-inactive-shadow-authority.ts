import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const releaseId = "XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review";
const packageDigest = "sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa";
const approvalStatement =
  "I approve XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review at package digest sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa for atomic inactive Domain Pack binding and bounded Persona ordering authority only; this approval does not authorize filtering, technical eligibility changes, standalone selection, Cars V3.9 changes, active-pointer mutation, deployment, or bypass of future catalog-readiness gates.";
const releaseDirectory = path.join(root, "data/production/personas/universal/projection-materialization", releaseId);
const governanceDirectory = path.join(releaseDirectory, "governance");
const approvalDirectory = path.join(governanceDirectory, "owner-approval");
const shadowDirectory = path.join(governanceDirectory, "shadow-activation");
const approvalEventPath = path.join(approvalDirectory, "owner-approval-event.json");

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const sha256 = (value: string | unknown) =>
  `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex")}`;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8"));
const fileSha256 = async (file: string) => sha256(await readFile(file, "utf8"));

type ReleaseManifest = {
  packageDigest: string;
  artifactDigests: Record<string, string>;
  counts: { exactProducts: number; governed: number; unknown: number; conflicted: number; categories: number };
  sharedBoundedSoftRankingCommit: string;
  [key: string]: unknown;
};
type ProjectionCandidate = {
  records: Array<{ exactProductId: string; status: string; score: number }>;
  categoryBindings: Array<{ categoryId: string; status: string; exactProductIds: string[] }>;
  activation: { state: string; activePointerChanged: boolean; rankingChanged: boolean; catalogMembershipChanged: boolean };
};
type Snapshot = { pointers?: Array<{ file: string; sha256: string }>; files?: Array<{ file: string; sha256: string }> };

async function verifySnapshot(entries: Array<{ file: string; sha256: string }>): Promise<boolean> {
  return (await Promise.all(entries.map(async (entry) => (await fileSha256(path.join(root, entry.file))) === entry.sha256))).every(Boolean);
}

async function main() {
  const [manifest, request, candidate, pointerSnapshot, carsSnapshot, invariants, activationPlan] = await Promise.all([
    readJson<ReleaseManifest>(path.join(releaseDirectory, "manifest.json")),
    readJson<{ packageDigest: string; exactSentence: string }>(path.join(releaseDirectory, "approval-request.json")),
    readJson<ProjectionCandidate>(path.join(releaseDirectory, "projection-candidate.json")),
    readJson<Snapshot>(path.join(releaseDirectory, "active-pointer-snapshot.json")),
    readJson<Snapshot>(path.join(releaseDirectory, "cars-v39-immutability.json")),
    readJson<Record<string, unknown>>(path.join(releaseDirectory, "invariant-proofs.json")),
    readJson<{ atomicSteps: string[]; deployRequiresSeparateAuthorization: boolean }>(
      path.join(releaseDirectory, "atomic-activation-plan.json"),
    ),
  ]);
  const { packageDigest: manifestDigest, ...manifestCore } = manifest;
  if (manifestDigest !== packageDigest || sha256(manifestCore) !== packageDigest) throw new Error("PACKAGE_DIGEST_MISMATCH");
  if (request.packageDigest !== packageDigest || request.exactSentence !== approvalStatement) {
    throw new Error("APPROVAL_STATEMENT_OR_DIGEST_MISMATCH");
  }
  for (const [file, expected] of Object.entries(manifest.artifactDigests)) {
    if (sha256(await readJson<unknown>(path.join(releaseDirectory, file))) !== expected) {
      throw new Error(`IMMUTABLE_ARTIFACT_DIGEST_MISMATCH:${file}`);
    }
  }
  if (
    manifest.counts.exactProducts !== 169 ||
    manifest.counts.governed !== 4 ||
    manifest.counts.unknown !== 165 ||
    manifest.counts.conflicted !== 0 ||
    manifest.counts.categories !== 49 ||
    candidate.records.length !== 169 ||
    candidate.categoryBindings.length !== 49 ||
    Math.max(...candidate.records.map((record) => record.score)) !== 0.75
  ) {
    throw new Error("APPROVED_PROJECTION_COUNTS_INVALID");
  }
  if (
    candidate.activation.activePointerChanged ||
    candidate.activation.rankingChanged ||
    candidate.activation.catalogMembershipChanged ||
    activationPlan.deployRequiresSeparateAuthorization !== true ||
    invariants.carsV39Changed !== false ||
    invariants.catalogOrderIndependent !== true ||
    invariants.noDoubleCounting !== true
  ) {
    throw new Error("APPROVED_BOUNDARY_INVALID");
  }
  const pointersBefore = pointerSnapshot.pointers ?? [];
  const carsBefore = carsSnapshot.files ?? [];
  if (!(await verifySnapshot(pointersBefore))) throw new Error("ACTIVE_POINTER_PRECONDITION_MISMATCH");
  if (!(await verifySnapshot(carsBefore))) throw new Error("CARS_V39_PRECONDITION_MISMATCH");

  const approvedAt = existsSync(approvalEventPath)
    ? (await readJson<{ approvedAt: string }>(approvalEventPath)).approvedAt
    : new Date().toISOString();
  const approvalEvent = {
    schemaVersion: "xpy-universal-persona-projection-owner-approval-event/v1",
    eventId: "UNIVERSAL-PERSONA-PROJECTION-OWNER-APPROVAL-20260906",
    eventType: "INACTIVE_DOMAIN_BINDING_AND_SHADOW_ORDERING_APPROVED",
    actor: { role: "PRODUCT_OWNER", instanceId: "EXPIYA_PRODUCT_OWNER_001" },
    releaseId,
    approvedPackageDigest: packageDigest,
    approvalStatement,
    approvalStatementSha256: sha256(approvalStatement),
    approvedAt,
    authority: "INACTIVE_BINDING_AND_SHADOW_ORDERING_ONLY",
    runtimeConsumptionAuthorized: false,
    activePointerMutationAuthorized: false,
    deploymentAuthorized: false,
    appendOnly: true,
  };
  const runtimeRegistrationFile = "features/xpy/domainPacks.ts";
  const runtimeRegistrationSha256 = await fileSha256(path.join(root, runtimeRegistrationFile));
  const shadowEvent = {
    schemaVersion: "xpy-universal-persona-inactive-shadow-authority/v1",
    eventId: "UNIVERSAL-PERSONA-INACTIVE-SHADOW-MATERIALIZATION-20260906",
    releaseId,
    packageDigest,
    ownerApprovalEventId: approvalEvent.eventId,
    state: "MATERIALIZED_INACTIVE_SHADOW_ONLY",
    sharedBoundedSoftRankingCommit: manifest.sharedBoundedSoftRankingCommit,
    records: { total: 169, governed: 4, unknownNeutral: 165, conflicted: 0 },
    categoryBindings: {
      total: 49,
      usableInShadow: candidate.categoryBindings.filter((binding) => binding.status === "INACTIVE_CANDIDATE_USABLE_MAPPING").length,
      failClosedLocally: candidate.categoryBindings.filter((binding) => binding.status.includes("FAIL_CLOSED")).length,
    },
    runtimeConsumption: "UNCHANGED_DISABLED",
    rankingMutation: false,
    membershipMutation: false,
    technicalEligibilityMutation: false,
    sufficiencyMutation: false,
    standaloneSelectionAuthority: false,
    carsV39Mutation: false,
    activePointerMutation: false,
    deploymentPerformed: false,
    runtimeRegistration: { file: runtimeRegistrationFile, sha256: runtimeRegistrationSha256, changed: false },
  };
  const planExecution = {
    schemaVersion: "xpy-universal-persona-projection-plan-execution/v1",
    packageDigest,
    disposition: "COMPLETED_WITHIN_EXPLICIT_INACTIVE_SHADOW_BOUNDARY",
    steps: [
      { planStep: activationPlan.atomicSteps[0], status: "NOT_EXECUTED_EXPLICITLY_PROHIBITED_ACTIVE_POINTER_MUTATION" },
      { planStep: activationPlan.atomicSteps[1], status: "NOT_EXECUTED_EXPLICITLY_PROHIBITED_RUNTIME_CONSUMPTION" },
      { planStep: activationPlan.atomicSteps[2], status: "VERIFIED_EXISTING_CATEGORY_LOCAL_FAIL_CLOSED_BINDINGS_PRESERVED" },
      { planStep: activationPlan.atomicSteps[3], status: "VERIFIED_NO_MUTATION" },
    ],
    evidenceAcquisitionRepeated: false,
    governedProjectionScopeBroadened: false,
  };
  const pointersAfterMatch = await verifySnapshot(pointersBefore);
  const carsAfterMatch = await verifySnapshot(carsBefore);
  const runtimeAfterSha256 = await fileSha256(path.join(root, runtimeRegistrationFile));
  const rollbackVerification = {
    schemaVersion: "xpy-universal-persona-projection-rollback-verification/v1",
    packageDigest,
    mutableRuntimeStateChanged: false,
    rollbackRequiredNow: false,
    activePointersMatchPreExecutionSnapshot: pointersAfterMatch,
    carsV39MatchesPreExecutionSnapshot: carsAfterMatch,
    runtimeRegistrationMatchesPreExecutionSnapshot: runtimeAfterSha256 === runtimeRegistrationSha256,
    rollbackModeIfShadowAuthorityIsLaterRevoked: "APPEND_ONLY_REVOCATION_EVENT_NO_POINTER_RESTORE_REQUIRED",
    immutableEvidenceRetained: true,
  };
  if (!pointersAfterMatch || !carsAfterMatch || runtimeAfterSha256 !== runtimeRegistrationSha256) {
    throw new Error("POST_EXECUTION_IMMUTABILITY_FAILED");
  }

  const approvalRaw = json(approvalEvent);
  const shadowRaw = json(shadowEvent);
  const planRaw = json(planExecution);
  const rollbackRaw = json(rollbackVerification);
  const governanceManifest = {
    schemaVersion: "xpy-universal-persona-inactive-shadow-governance-manifest/v1",
    releaseId,
    packageDigest,
    ownerApprovalEventId: approvalEvent.eventId,
    shadowMaterializationEventId: shadowEvent.eventId,
    approvalEventSha256: sha256(approvalRaw),
    shadowEventSha256: sha256(shadowRaw),
    planExecutionSha256: sha256(planRaw),
    rollbackVerificationSha256: sha256(rollbackRaw),
    approvalStatementFileSha256: sha256(`${approvalStatement}\n`),
    finalState: "APPROVED_AND_MATERIALIZED_INACTIVE_SHADOW_ONLY",
    runtimeConsumptionChanged: false,
    activePointerChanged: false,
    deploymentPerformed: false,
  };

  await mkdir(approvalDirectory, { recursive: true });
  await mkdir(shadowDirectory, { recursive: true });
  await writeFile(approvalEventPath, approvalRaw);
  await writeFile(path.join(approvalDirectory, "approval-statement.txt"), `${approvalStatement}\n`);
  await writeFile(path.join(shadowDirectory, "shadow-authority-event.json"), shadowRaw);
  await writeFile(path.join(shadowDirectory, "plan-execution.json"), planRaw);
  await writeFile(path.join(shadowDirectory, "rollback-verification.json"), rollbackRaw);
  await writeFile(path.join(governanceDirectory, "manifest.json"), json(governanceManifest));
  console.log(json(governanceManifest));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
