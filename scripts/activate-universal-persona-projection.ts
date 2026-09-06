import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const releaseId = "XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review";
const packageDigest = "sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa";
const statement =
  "I approve production runtime activation of XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review at digest sha256:62d2d5f23cb92b337052fdb0e3eb16c8b96126e3bc156fa16ebaac11be03f4aa for bounded Persona ordering of only the four evidence-qualified projections, with 165 UNKNOWN records remaining neutral, the 0.75 aggregate cap, unchanged candidate membership, preserved ties/non-dominated outcomes, no Persona-only winner authorization, and Cars V3.9 remaining unchanged. I authorize the required active-pointer mutation, non-force push, unified production deployment, and rollback if production smoke fails.";
const releaseDirectory = path.join(root, "data/production/personas/universal/projection-materialization", releaseId);
const governanceDirectory = path.join(releaseDirectory, "governance/production-activation");
const eventPath = path.join(governanceDirectory, "activation-event.json");
const activePath = path.join(root, "data/production/personas/universal/active.json");
const sha256 = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8"));
const fileSha = async (file: string) => sha256(await readFile(file, "utf8"));

async function main() {
  const [manifest, candidate, approvalRequest, pointerSnapshot, carsSnapshot, shadowEvent] = await Promise.all([
    readJson<{ packageDigest: string; artifactDigests: Record<string, string>; counts: Record<string, number> }>(
      path.join(releaseDirectory, "manifest.json"),
    ),
    readJson<{ records: unknown[]; categoryBindings: Array<{ status: string }> }>(path.join(releaseDirectory, "projection-candidate.json")),
    readJson<{ packageDigest: string }>(path.join(releaseDirectory, "approval-request.json")),
    readJson<{ pointers: Array<{ file: string; sha256: string }> }>(path.join(releaseDirectory, "active-pointer-snapshot.json")),
    readJson<{ files: Array<{ file: string; sha256: string }> }>(path.join(releaseDirectory, "cars-v39-immutability.json")),
    readJson<{ state: string; runtimeRegistration: { sha256: string } }>(
      path.join(releaseDirectory, "governance/shadow-activation/shadow-authority-event.json"),
    ),
  ]);
  if (manifest.packageDigest !== packageDigest || approvalRequest.packageDigest !== packageDigest) {
    throw new Error("ACTIVATION_PACKAGE_DIGEST_MISMATCH");
  }
  if (
    candidate.records.length !== 169 ||
    manifest.counts.governed !== 4 ||
    manifest.counts.unknown !== 165 ||
    candidate.categoryBindings.filter((binding) => binding.status === "INACTIVE_CANDIDATE_USABLE_MAPPING").length !== 4 ||
    shadowEvent.state !== "MATERIALIZED_INACTIVE_SHADOW_ONLY"
  ) {
    throw new Error("ACTIVATION_SCOPE_MISMATCH");
  }
  for (const snapshot of [...pointerSnapshot.pointers, ...carsSnapshot.files]) {
    if ((await fileSha(path.join(root, snapshot.file))) !== snapshot.sha256) throw new Error(`PRE_ACTIVATION_DRIFT:${snapshot.file}`);
  }
  const activatedAt = existsSync(eventPath)
    ? (await readJson<{ activatedAt: string }>(eventPath)).activatedAt
    : new Date().toISOString();
  const activationEventId = "UNIVERSAL-PERSONA-PRODUCTION-ACTIVATION-20260906";
  const projectionArtifactDigest = manifest.artifactDigests["projection-candidate.json"];
  const activePointer = {
    schemaVersion: "xpy-universal-persona-active-pointer/v1",
    state: "ACTIVE_BOUNDED_PERSONA_ORDERING",
    releaseId,
    packageDigest,
    projectionArtifact: `data/production/personas/universal/projection-materialization/${releaseId}/projection-candidate.json`,
    projectionArtifactDigest,
    activationEventId,
    authority: "BOUNDED_SOFT_RANKING_ONLY",
    aggregateCap: 0.75,
    activeGovernedProjectionCount: 4,
    neutralUnknownCount: 165,
    membershipEffect: "NONE",
    singleSelectionAuthorized: false,
    futureCatalogReadinessGate: "MANDATORY",
  };
  const pointerRaw = json(activePointer);
  const runtimeFile = "features/xpy/domainPacks.ts";
  const runtimeSha = await fileSha(path.join(root, runtimeFile));
  if (runtimeSha === shadowEvent.runtimeRegistration.sha256) throw new Error("RUNTIME_REGISTRATION_NOT_UPDATED");
  const approvalEvent = {
    schemaVersion: "xpy-universal-persona-production-approval/v1",
    eventId: "UNIVERSAL-PERSONA-PRODUCTION-OWNER-APPROVAL-20260906",
    actor: { role: "PRODUCT_OWNER", instanceId: "EXPIYA_PRODUCT_OWNER_001" },
    releaseId,
    approvedPackageDigest: packageDigest,
    statement,
    statementSha256: sha256(statement),
    authorizedActions: ["ACTIVE_POINTER_MUTATION", "NON_FORCE_PUSH", "UNIFIED_PRODUCTION_DEPLOYMENT", "ROLLBACK_ON_SMOKE_FAILURE"],
    approvedAt: activatedAt,
    appendOnly: true,
  };
  const activationEvent = {
    schemaVersion: "xpy-universal-persona-production-activation/v1",
    activationEventId,
    activatedAt,
    releaseId,
    packageDigest,
    projectionArtifactDigest,
    ownerApprovalEventId: approvalEvent.eventId,
    activePointerSha256: sha256(pointerRaw),
    runtimeRegistration: { file: runtimeFile, predecessorSha256: shadowEvent.runtimeRegistration.sha256, activeSha256: runtimeSha },
    scope: { governedProjectionCount: 4, neutralUnknownCount: 165, categoryBindingCount: 49, activeCategoryCount: 4 },
    invariants: {
      aggregateCap: 0.75,
      membershipEffect: "NONE",
      tiesAndNonDominatedOutcomesPreserved: true,
      personaOnlyWinnerAuthorized: false,
      carsV39Changed: false,
      futureCatalogReadinessGate: "MANDATORY",
    },
    deploymentState: "AUTHORIZED_NOT_YET_PERFORMED",
  };
  const rollbackPlan = {
    schemaVersion: "xpy-universal-persona-production-rollback/v1",
    trigger: "PRODUCTION_SMOKE_FAILURE",
    predecessorCommit: "bf2e753b5f90b4c2e794c08e62ccbd1602be41c3",
    actions: [
      "Restore features/xpy/domainPacks.ts to predecessorSha256.",
      "Remove data/production/personas/universal/active.json.",
      "Create an append-only rollback event preserving approval and activation history.",
      "Non-force push the rollback commit and redeploy unified production.",
    ],
    dataDeletionAuthorized: false,
    immutableGovernanceArtifactsRetained: true,
  };
  await mkdir(governanceDirectory, { recursive: true });
  await writeFile(activePath, pointerRaw);
  await writeFile(path.join(governanceDirectory, "owner-approval-event.json"), json(approvalEvent));
  await writeFile(eventPath, json(activationEvent));
  await writeFile(path.join(governanceDirectory, "rollback-plan.json"), json(rollbackPlan));
  await writeFile(
    path.join(governanceDirectory, "manifest.json"),
    json({
      schemaVersion: "xpy-universal-persona-production-activation-manifest/v1",
      releaseId,
      packageDigest,
      ownerApprovalEventSha256: await fileSha(path.join(governanceDirectory, "owner-approval-event.json")),
      activationEventSha256: await fileSha(eventPath),
      rollbackPlanSha256: await fileSha(path.join(governanceDirectory, "rollback-plan.json")),
      activePointerSha256: await fileSha(activePath),
      runtimeRegistrationSha256: runtimeSha,
      state: "ACTIVATED_AWAITING_DEPLOYMENT",
    }),
  );
  console.log(json(activationEvent));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
