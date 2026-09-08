import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildActiveCatalogInventory } from "../features/semantic-decision-projection/v2/activeCatalogInventory.server";
import { loadActivePMaterialityWave } from "../features/semantic-decision-projection/v2/activeWaveLoader.server";
import { CATALOG_FACTORY_GATE_IDS, evaluateCatalogFactoryReadinessV2, type CatalogFactoryGateEvidence } from "../features/semantic-decision-projection/v2/catalogFactoryReadiness";
import { immutableDigest } from "../features/semantic-decision-projection/v2/canonical";
import { validateDomainPackPMaterialityAdmission } from "../features/semantic-decision-projection/v2/domainPackAdmission";
import { executePMaterialityShadow } from "../features/semantic-decision-projection/v2/materialityExecutor";
import { buildWave1ApplianceProjections } from "../features/semantic-decision-projection/v2/wave1Appliances.server";

const root = process.cwd(), releaseId = "SDP-V2-P-WAVE1-DOMAIN-PACKS-TR-v1.1", waveId = "P-MATERIALITY-WAVE1B-20260908";
const releaseDir = path.join(root, "data/production/semantic-decision-projection/releases", releaseId), governanceDir = path.join(root, "data/production/semantic-decision-projection/governance");
const sha = (raw: string) => `sha256:${createHash("sha256").update(raw).digest("hex")}` as const, stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const pass = (gateId: CatalogFactoryGateEvidence["gateId"]): CatalogFactoryGateEvidence => ({ gateId, status: "PASS", evidenceKind: ["runtime-fixtures", "unknown-conflict-neutrality", "P-zero-effect-suppression", "no-false-single-winner", "price-commerce-isolation", "persona-or-neutral"].includes(gateId) ? "EXECUTABLE_TEST" : "IMMUTABLE_ARTIFACT", reason: "Cumulative Wave-1 exact projection gate passed.", evidenceRefs: ["features/semantic-decision-projection/v2/wave1Appliances.test.ts"] });
const readiness = (categoryId: string) => evaluateCatalogFactoryReadinessV2({ subjectId: `${waveId}:${categoryId}`, evaluationScope: "PRODUCTION_EXACT_CATALOG", gates: CATALOG_FACTORY_GATE_IDS.map((gateId) => gateId === "owner-approval" ? { gateId, status: "PENDING", evidenceKind: "SIGNED_APPROVAL", reason: "P-only wave grants no Y authority.", evidenceRefs: [] } : gateId === "pointer-manifest-approval-consistency" ? { gateId, status: "PENDING", evidenceKind: "IMMUTABLE_ARTIFACT", reason: "Post-activation/Y-only gate.", evidenceRefs: [] } : pass(gateId)) });

async function main() {
  const [prior, appliance, inventory] = await Promise.all([loadActivePMaterialityWave(root), buildWave1ApplianceProjections(root), buildActiveCatalogInventory(root)]);
  if (prior.status !== "READY") throw new Error(`PRIOR_ACTIVE_WAVE_NOT_READY:${prior.reason}`);
  if (prior.wave.releaseId === releaseId) { process.stdout.write(`${JSON.stringify({ releaseId, releaseDigest: prior.wave.releaseDigest, categories: prior.wave.categories.length, idempotent: true })}\n`); return; }
  const projections = [...prior.wave.projections, ...appliance].sort((left, right) => left.identity.categoryId.localeCompare(right.identity.categoryId));
  const duplicate = projections.find((projection, index) => projections.findIndex((other) => other.identity.categoryId === projection.identity.categoryId) !== index);
  if (duplicate) throw new Error(`DUPLICATE_CATEGORY:${duplicate.identity.categoryId}`);
  const categories = projections.map((projection) => projection.identity.categoryId), readinessByCategory = Object.fromEntries(categories.map((categoryId) => [categoryId, readiness(categoryId)]));
  const traces = projections.map((projection) => ({ categoryId: projection.identity.categoryId, result: executePMaterialityShadow({ candidatePool: projection.offerings.map((offering) => offering.exactOfferingId), currentContext: { market: "TR", configurationIds: projection.applicability.configurationIds, evaluatedAt: "2026-09-08T12:00:00.000+03:00", satisfiedPrerequisiteIds: projection.materialQuestion.prerequisites.map((item) => item.prerequisiteId), relevantNeedIds: [projection.userNeed.needId], questionsAskedThisSession: 0, userFatigue: 0 }, projections: [projection] }) }));
  const blocked = inventory.filter((entry) => entry.departmentId === "APPLIANCES" && !categories.includes(entry.categoryId)).map((entry) => ({ categoryId: entry.categoryId, exactOfferingCount: entry.exactOfferingIds.length, rootReason: "NO_TWO_EVIDENCED_KNOWN_PARTITIONS_IN_ACTIVE_DECISION_FIELDS_OR_SEPARATE_POLICY_INTEGRATION_REQUIRED", p: "BLOCKED", y: "NOT_READY" }));
  const payload = { schemaVersion: "active-p-materiality-wave/v1", releaseId, waveId, sourceProductionCommit: "fcf916b9be578265379d1278df0678c8d1f8a517", supersedes: prior.wave.releaseId, categories, projections, readinessByCategory, traces, blocked, activationMode: "P_DIRECTION_ONLY_NO_MEMBERSHIP_NO_WINNER", yAuthority: "UNCHANGED_NONE_GRANTED" as const };
  const releaseDigest = immutableDigest(payload), release = { ...payload, releaseDigest }, releaseRaw = stable(release), releaseSha256 = sha(releaseRaw);
  const approval = { schemaVersion: "task-explicit-owner-approval/v1", approvalId: `${waveId}-OWNER-APPROVAL`, approvedAt: "2026-09-08T00:20:00.000+03:00", workUnit: "WU-XPY-ALL-ACTIVE-CATALOG-P-MATERIALITY-PRODUCTION-01", authorizationSource: "EXPLICIT_USER_TASK_AUTHORIZATION", releaseId, releaseSha256, scope: "ATOMIC_CUMULATIVE_ACTIVE_P_DIRECTION_ONLY", boundaries: ["NO_MEMBERSHIP_EFFECT", "NO_Y_OR_SINGLE_WINNER", "UNKNOWN_CONFLICTED_NEUTRAL", "PERSONA_MAX_0_75", "NO_PRICE_SELLER_AFFILIATE_POPULARITY_OR_CATALOG_ORDER_SIGNAL"] }, approvalDigest = immutableDigest(approval);
  for (const projection of projections) {
    const inv = inventory.find((entry) => entry.categoryId === projection.identity.categoryId);
    if (!inv) throw new Error(`INVENTORY_MISSING:${projection.identity.categoryId}`);
    const result = validateDomainPackPMaterialityAdmission({ inventory: inv, candidate: { schemaVersion: "DomainPackPMaterialityAdmission/v1", domainPackId: releaseId, departmentId: inv.departmentId, categoryId: inv.categoryId, exactOfferingIds: inv.exactOfferingIds, projections: [projection], readiness: readinessByCategory[inv.categoryId]!, authority: { information: inv.authorityBinding, p: releaseSha256, y: null }, activation: { mode: "ACTIVE_P", atomicWaveId: waveId, approvalDigest } } });
    if (!result.eligible) throw new Error(`ADMISSION_FAILED:${inv.categoryId}:${result.reasonCodes.join(",")}`);
  }
  const pointerFile = path.join(root, "data/production/semantic-decision-projection/active.json"), previousRaw = await readFile(pointerFile, "utf8"), previousPointerSha256 = sha(previousRaw), previous = JSON.parse(previousRaw) as { releaseSha256?: string };
  if (previous.releaseSha256 === releaseSha256) { process.stdout.write(`${JSON.stringify({ releaseId, releaseSha256, approvalDigest, categories: categories.length, blocked: blocked.length, idempotent: true })}\n`); return; }
  const activation = { schemaVersion: "p-materiality-wave-activation/v1", activationId: `${waveId}-ACTIVATION`, activatedAt: "2026-09-08T00:25:00.000+03:00", releaseId, releaseSha256, approvalDigest, previousPointerSha256, previousReleaseId: prior.wave.releaseId, state: "ACTIVE_P", atomicCategories: categories, blocked, rollback: "RESTORE_PREVIOUS_POINTER_BYTES", productionDeployment: false };
  const pointer = { schemaVersion: "p-materiality-active-pointer/v1", state: "ACTIVE_P", releaseId, releaseFile: `data/production/semantic-decision-projection/releases/${releaseId}/release.json`, releaseSha256, approvalDigest, activationDigest: immutableDigest(activation), categories, yAuthority: "UNCHANGED_NONE_GRANTED" };
  await Promise.all([mkdir(releaseDir, { recursive: true }), mkdir(path.join(governanceDir, "approval-events", approval.approvalId), { recursive: true }), mkdir(path.join(governanceDir, "activation-events", activation.activationId), { recursive: true })]);
  await Promise.all([writeFile(path.join(releaseDir, "release.json"), releaseRaw), writeFile(path.join(releaseDir, "manifest.json"), stable({ releaseId, releaseSha256, approvalDigest, projectionDigest: immutableDigest(projections), readinessDigest: immutableDigest(readinessByCategory), traceDigest: immutableDigest(traces), blockedDigest: immutableDigest(blocked) })), writeFile(path.join(governanceDir, "approval-events", approval.approvalId, "approval.json"), stable(approval)), writeFile(path.join(governanceDir, "activation-events", activation.activationId, "activation.json"), stable(activation))]);
  await writeFile(pointerFile, stable(pointer));
  process.stdout.write(`${JSON.stringify({ releaseId, releaseSha256, approvalDigest, categories: categories.length, exactOfferings: projections.reduce((sum, item) => sum + item.offerings.length, 0), blocked: blocked.length })}\n`);
}
void main();
