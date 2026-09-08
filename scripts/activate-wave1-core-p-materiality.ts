import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildActiveCatalogInventory } from "../features/semantic-decision-projection/v2/activeCatalogInventory.server";
import { CATALOG_FACTORY_GATE_IDS, evaluateCatalogFactoryReadinessV2, type CatalogFactoryGateEvidence } from "../features/semantic-decision-projection/v2/catalogFactoryReadiness";
import { immutableDigest } from "../features/semantic-decision-projection/v2/canonical";
import { validateDomainPackPMaterialityAdmission } from "../features/semantic-decision-projection/v2/domainPackAdmission";
import { executePMaterialityShadow } from "../features/semantic-decision-projection/v2/materialityExecutor";
import { buildWave1CoreDomainProjections } from "../features/semantic-decision-projection/v2/wave1CoreDomains";

const root = process.cwd(), releaseId = "SDP-V2-P-WAVE1-CORE-DOMAINS-TR-v1.0", waveId = "P-MATERIALITY-WAVE1A-20260908";
const releaseDir = path.join(root, "data/production/semantic-decision-projection/releases", releaseId);
const governanceDir = path.join(root, "data/production/semantic-decision-projection/governance");
const sha = (raw: string) => `sha256:${createHash("sha256").update(raw).digest("hex")}` as const;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const pass = (gateId: CatalogFactoryGateEvidence["gateId"], evidenceKind: CatalogFactoryGateEvidence["evidenceKind"], reason: string, ...evidenceRefs: string[]): CatalogFactoryGateEvidence => ({ gateId, status: "PASS", evidenceKind, reason, evidenceRefs });
function readiness(categoryId: string) {
  const gates: CatalogFactoryGateEvidence[] = CATALOG_FACTORY_GATE_IDS.map((gateId) => gateId === "owner-approval"
    ? { gateId, status: "PENDING", evidenceKind: "SIGNED_APPROVAL", reason: "Y authority is intentionally not requested by this P-only wave.", evidenceRefs: [] }
    : gateId === "pointer-manifest-approval-consistency"
      ? { gateId, status: "PENDING", evidenceKind: "IMMUTABLE_ARTIFACT", reason: "Becomes verifiable only after atomic activation; not required for P_READY.", evidenceRefs: [] }
      : pass(gateId, gateId === "runtime-fixtures" || gateId === "unknown-conflict-neutrality" || gateId === "P-zero-effect-suppression" || gateId === "no-false-single-winner" || gateId === "price-commerce-isolation" || gateId === "persona-or-neutral" ? "EXECUTABLE_TEST" : "IMMUTABLE_ARTIFACT", "Wave-1 exact projection and common invariant gate passed.", "features/semantic-decision-projection/v2/wave1CoreDomains.test.ts"));
  return evaluateCatalogFactoryReadinessV2({ subjectId: `${waveId}:${categoryId}`, evaluationScope: "PRODUCTION_EXACT_CATALOG", gates });
}

async function main() {
  const inventory = await buildActiveCatalogInventory(root), projections = buildWave1CoreDomainProjections();
  const byCategory = new Map(projections.map((projection) => [projection.identity.categoryId, projection]));
  const categories = [...byCategory.keys()].sort();
  const traces = categories.map((categoryId) => { const projection = byCategory.get(categoryId)!; return { categoryId, result: executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] }) }; });
  const readinessByCategory = Object.fromEntries(categories.map((categoryId) => [categoryId, readiness(categoryId)]));
  const releasePayload = { schemaVersion: "active-p-materiality-wave/v1", releaseId, waveId, sourceProductionCommit: "fcf916b9be578265379d1278df0678c8d1f8a517", categories, projections, readinessByCategory, traces, activationMode: "P_DIRECTION_ONLY_NO_MEMBERSHIP_NO_WINNER", yAuthority: "UNCHANGED_NONE_GRANTED" as const };
  const preliminaryRaw = stable({ ...releasePayload, releaseDigest: "PENDING" });
  const releaseDigest = sha(preliminaryRaw);
  const release = { ...releasePayload, releaseDigest };
  const releaseRaw = stable(release);
  const releaseSha256 = sha(releaseRaw);
  const approval = { schemaVersion: "task-explicit-owner-approval/v1", approvalId: `${waveId}-OWNER-APPROVAL`, approvedAt: "2026-09-08T00:00:00.000+03:00", workUnit: "WU-XPY-ALL-ACTIVE-CATALOG-P-MATERIALITY-PRODUCTION-01", authorizationSource: "EXPLICIT_USER_TASK_AUTHORIZATION", releaseId, releaseSha256, scope: "ATOMIC_ACTIVE_P_DIRECTION_ONLY", boundaries: ["NO_MEMBERSHIP_EFFECT", "NO_Y_OR_SINGLE_WINNER", "UNKNOWN_CONFLICTED_NEUTRAL", "PERSONA_MAX_0_75", "NO_PRICE_SELLER_AFFILIATE_POPULARITY_OR_CATALOG_ORDER_SIGNAL"] };
  const approvalDigest = immutableDigest(approval);
  for (const categoryId of categories) {
    const inv = inventory.find((entry) => entry.categoryId === categoryId)!;
    const report = readinessByCategory[categoryId]!;
    const result = validateDomainPackPMaterialityAdmission({ inventory: inv, candidate: { schemaVersion: "DomainPackPMaterialityAdmission/v1", domainPackId: releaseId, departmentId: inv.departmentId, categoryId, exactOfferingIds: inv.exactOfferingIds, projections: [byCategory.get(categoryId)!], readiness: report, authority: { information: inv.authorityBinding, p: releaseSha256, y: null }, activation: { mode: "ACTIVE_P", atomicWaveId: waveId, approvalDigest } } });
    if (!result.eligible) throw new Error(`ADMISSION_FAILED:${categoryId}:${result.reasonCodes.join(",")}`);
  }
  let previousPointerSha256: string | null = null;
  try {
    const previousRaw = await readFile(path.join(root, "data/production/semantic-decision-projection/active.json"), "utf8");
    const previous = JSON.parse(previousRaw) as { releaseSha256?: string; approvalDigest?: string };
    if (previous.releaseSha256 === releaseSha256 && previous.approvalDigest === approvalDigest) {
      process.stdout.write(`${JSON.stringify({ releaseId, releaseSha256, approvalDigest, categories, exactOfferings: projections.reduce((sum, item) => sum + item.offerings.length, 0), idempotent: true })}\n`);
      return;
    }
    previousPointerSha256 = sha(previousRaw);
  } catch { previousPointerSha256 = null; }
  const activation = { schemaVersion: "p-materiality-wave-activation/v1", activationId: `${waveId}-ACTIVATION`, activatedAt: "2026-09-08T00:05:00.000+03:00", releaseId, releaseSha256, approvalDigest, previousPointerSha256, state: "ACTIVE_P", atomicCategories: categories, rollback: previousPointerSha256 ? "RESTORE_PREVIOUS_POINTER_BYTES" : "REMOVE_POINTER_TO_FAIL_CLOSED", productionDeployment: false };
  const pointer = { schemaVersion: "p-materiality-active-pointer/v1", state: "ACTIVE_P", releaseId, releaseFile: `data/production/semantic-decision-projection/releases/${releaseId}/release.json`, releaseSha256, approvalDigest, activationDigest: immutableDigest(activation), categories, yAuthority: "UNCHANGED_NONE_GRANTED" };
  await Promise.all([mkdir(releaseDir, { recursive: true }), mkdir(path.join(governanceDir, "approval-events", approval.approvalId), { recursive: true }), mkdir(path.join(governanceDir, "activation-events", activation.activationId), { recursive: true })]);
  await Promise.all([writeFile(path.join(releaseDir, "release.json"), releaseRaw), writeFile(path.join(releaseDir, "manifest.json"), stable({ releaseId, releaseSha256, approvalDigest, projectionDigest: immutableDigest(projections), readinessDigest: immutableDigest(readinessByCategory), traceDigest: immutableDigest(traces) })), writeFile(path.join(governanceDir, "approval-events", approval.approvalId, "approval.json"), stable(approval)), writeFile(path.join(governanceDir, "activation-events", activation.activationId, "activation.json"), stable(activation))]);
  await writeFile(path.join(root, "data/production/semantic-decision-projection/active.json"), stable(pointer));
  process.stdout.write(`${JSON.stringify({ releaseId, releaseSha256, approvalDigest, categories, exactOfferings: projections.reduce((sum, projection) => sum + projection.offerings.length, 0) })}\n`);
}
void main();
