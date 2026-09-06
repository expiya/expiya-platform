import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority, resetAppliancesAuthorityCacheForTests } from "../features/appliances/authority/loader.server";
import { loadActiveBoundedAuthority } from "../features/appliances/bounded/authority.server";
import { loadActiveDryerAuthority } from "../features/appliances/dryer/authority.server";
import { loadActiveRefrigeratorAuthority } from "../features/appliances/refrigerator/authority.server";
import { loadMajorApplianceCatalogAdoptionCandidate, MAJOR_APPLIANCE_ADOPTION_RELEASE, MAJOR_APPLIANCE_ADOPTION_ROOT } from "../features/xpy/catalog/majorApplianceCatalogAdoption.server";
import {
  APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST,
  APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256,
  loadActiveMajorApplianceCatalogCategory,
  MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT,
  type MajorApplianceAdoptionCategory,
  type MajorApplianceCatalogActivationEvent,
} from "../features/xpy/catalog/majorApplianceCatalogActivation.server";

const root = path.resolve(process.cwd());
const activatedAt = "2026-09-05T13:00:00.000+03:00";
const activationId = "APPLIANCES-MAJOR-CATALOG-ACT-B3CB67E1DD00-2E76D621CE55";
const governanceRoot = "data/production/appliances/catalog-adoption/governance";
const approvalId = "APPLIANCES-MAJOR-CATALOG-POA-2E76D621CE55";
const approvalRelative = `${governanceRoot}/approval-events/${approvalId}/approval.json`;
const activationDirectory = `${governanceRoot}/activation-events/${activationId}`;
const activationRelative = `${activationDirectory}/activation.json`;
const rollbackRelative = `${activationDirectory}/rollback.json`;
const receiptRelative = `${activationDirectory}/commit-receipt.json`;
const categories: readonly MajorApplianceAdoptionCategory[] = ["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"];
const blockedOfferingId = "appliances:dishwasher:tr:teka:dfi-46700-ttm";
const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

interface Binding {
  readonly categoryId: MajorApplianceAdoptionCategory;
  readonly releasePath: string;
  readonly manifestPath: string;
  readonly releaseVersion: string;
  readonly catalogArtifactSha256: string;
  readonly membershipDigest: string;
  readonly memberCount: number;
  readonly admittedOfferingIds: readonly string[];
  readonly activePointerPath: string;
  readonly activePointerSha256: string;
  readonly activeDecisionReleaseVersion: string;
  readonly activeDecisionArtifactPath: string;
  readonly activeDecisionArtifactSha256: string;
}

interface RollbackArtifact {
  readonly schemaVersion: "major-appliance-catalog-rollback/v1";
  readonly activationId: typeof activationId;
  readonly workUnitId: typeof MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT;
  readonly pointers: readonly { readonly categoryId: MajorApplianceAdoptionCategory; readonly path: string; readonly beforeSha256: string; readonly beforeRaw: string }[];
}

async function writeImmutable(relative: string, raw: string): Promise<void> {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  try {
    await writeFile(target, raw, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (await readFile(target, "utf8") !== raw) throw new Error(`IMMUTABLE_ARTIFACT_COLLISION:${relative}`);
  }
}

async function replacePointers(pointerRaws: ReadonlyMap<string, string>, rollbackRaws: ReadonlyMap<string, string>): Promise<void> {
  const staged = new Map<string, string>();
  for (const [relative, raw] of pointerRaws) {
    const target = path.join(root, relative);
    const stage = `${target}.${activationId}.staged`;
    try {
      await writeFile(stage, raw, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(stage, "utf8") !== raw) throw error;
    }
    staged.set(relative, stage);
  }
  const changed: string[] = [];
  try {
    for (const [relative, stage] of staged) {
      const current = await readFile(path.join(root, relative), "utf8");
      const expectedBefore = rollbackRaws.get(relative);
      if (expectedBefore === undefined || current !== expectedBefore) throw new Error(`POINTER_CHANGED_DURING_TRANSACTION:${relative}`);
      await rename(stage, path.join(root, relative));
      changed.push(relative);
    }
  } catch (error) {
    for (const relative of changed.reverse()) {
      const restoreStage = `${path.join(root, relative)}.${activationId}.rollback`;
      await writeFile(restoreStage, rollbackRaws.get(relative)!, "utf8");
      await rename(restoreStage, path.join(root, relative));
    }
    throw error;
  }
}

async function restoreBeforePointers(rollback: RollbackArtifact, expectedAfter: ReadonlyMap<string, string>): Promise<void> {
  const currentRaws = new Map<string, string>();
  const beforeRaws = new Map<string, string>();
  for (const pointer of rollback.pointers) {
    const current = await readFile(path.join(root, pointer.path), "utf8");
    if (sha256(current) !== expectedAfter.get(pointer.path)) throw new Error(`ROLLBACK_ACTIVE_POINTER_MISMATCH:${pointer.path}`);
    if (sha256(pointer.beforeRaw) !== pointer.beforeSha256) throw new Error(`ROLLBACK_ARTIFACT_INVALID:${pointer.path}`);
    currentRaws.set(pointer.path, current);
    beforeRaws.set(pointer.path, pointer.beforeRaw);
  }
  await replacePointers(beforeRaws, currentRaws);
}

async function rollback(): Promise<void> {
  const [activationRaw, rollbackRaw, receiptRaw] = await Promise.all([
    readFile(path.join(root, activationRelative), "utf8"),
    readFile(path.join(root, rollbackRelative), "utf8"),
    readFile(path.join(root, receiptRelative), "utf8"),
  ]);
  const activation = JSON.parse(activationRaw) as MajorApplianceCatalogActivationEvent;
  const rollbackArtifact = JSON.parse(rollbackRaw) as RollbackArtifact;
  const receipt = JSON.parse(receiptRaw) as { activationId?: string; activationArtifactSha256?: string; pointers?: readonly { path: string; afterSha256: string }[] };
  if (activation.activationId !== activationId || activation.rollbackArtifact.sha256 !== sha256(rollbackRaw) || receipt.activationId !== activationId || receipt.activationArtifactSha256 !== sha256(activationRaw)) throw new Error("ROLLBACK_BINDING_INVALID");
  await restoreBeforePointers(rollbackArtifact, new Map(receipt.pointers?.map((item) => [item.path, item.afterSha256])));
  console.log(`${activationId} rolled back to the four byte-identical prior pointers.`);
}

async function activate(): Promise<void> {
  const batchPath = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT, "batch-manifest.json");
  const packagePath = path.join(root, MAJOR_APPLIANCE_ADOPTION_ROOT, "activation-approval-package.json");
  const [batchRaw, packageRaw] = await Promise.all([readFile(batchPath, "utf8"), readFile(packagePath, "utf8")]);
  const batch = JSON.parse(batchRaw) as { batchDigest?: string; admittedCount?: number; blockedEvidenceCount?: number; categories?: readonly Binding[] };
  const computedBatchDigest = `sha256:${sha256(JSON.stringify({ ...batch, batchDigest: undefined }))}`;
  if (batch.batchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST || computedBatchDigest !== APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST) throw new Error("APPROVED_BATCH_DIGEST_MISMATCH");
  if (sha256(packageRaw) !== APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256) throw new Error("APPROVED_PACKAGE_DIGEST_MISMATCH");
  const loaded = await loadMajorApplianceCatalogAdoptionCandidate(root);
  if (loaded.status !== "READY_FOR_PRODUCT_OWNER_APPROVAL") throw new Error(`CANDIDATE_PREFLIGHT_FAILED:${loaded.reason}`);
  if (batch.admittedCount !== 16 || batch.blockedEvidenceCount !== 1 || batch.categories?.length !== 4) throw new Error("APPROVED_BATCH_SCOPE_MISMATCH");
  const bindings = batch.categories;
  const admittedIds = bindings.flatMap((item) => item.admittedOfferingIds);
  if (new Set(admittedIds).size !== 16 || admittedIds.includes(blockedOfferingId) || Object.values(loaded.releases).some((release) => release.offerings.some((item) => item.offeringId === blockedOfferingId))) throw new Error("APPROVED_MEMBERSHIP_MISMATCH");

  const before = await Promise.all(bindings.map(async (binding) => {
    const raw = await readFile(path.join(root, binding.activePointerPath), "utf8");
    const decisionRaw = await readFile(path.join(root, binding.activeDecisionArtifactPath), "utf8");
    if (sha256(raw) !== binding.activePointerSha256 || sha256(decisionRaw) !== binding.activeDecisionArtifactSha256) throw new Error(`CURRENT_AUTHORITY_CHANGED:${binding.categoryId}`);
    return { binding, raw, pointer: JSON.parse(raw) as Record<string, unknown> };
  }));

  const approval = {
    schemaVersion: "major-appliance-product-owner-approval/v1",
    approvalId,
    recordedAt: activatedAt,
    approved: true,
    workUnitId: MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT,
    approvedCandidate: MAJOR_APPLIANCE_ADOPTION_RELEASE,
    approvedBatchDigest: APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST,
    approvedPackageSha256: APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256,
    currentUserApproval: { granted: true, statement: "PRODUCT OWNER APPROVAL GRANTED.", source: "CURRENT_USER_MESSAGE_IN_CODEX_THREAD" },
    scope: { admittedOfferingIds: admittedIds, blockedOfferingIds: [blockedOfferingId], categoryCount: 4, admittedCount: 16, pointerTransaction: "ALL_FOUR_OR_ROLLBACK" },
    boundaries: { decisionAuthority: "UNCHANGED_V0_1", recommendationAuthority: "UNCHANGED", questionOrder: "UNCHANGED", sufficiency: "UNCHANGED", commerceAuthority: "NONE", credentialsOrPayments: "NOT_ENABLED" },
  } as const;
  const approvalRaw = stable(approval);
  await writeImmutable(approvalRelative, approvalRaw);

  const rollbackArtifact: RollbackArtifact = {
    schemaVersion: "major-appliance-catalog-rollback/v1",
    activationId,
    workUnitId: MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT,
    pointers: before.map(({ binding, raw }) => ({ categoryId: binding.categoryId, path: binding.activePointerPath, beforeSha256: sha256(raw), beforeRaw: raw })),
  };
  const rollbackRaw = stable(rollbackArtifact);
  await writeImmutable(rollbackRelative, rollbackRaw);

  const activation: MajorApplianceCatalogActivationEvent = {
    schemaVersion: "major-appliance-catalog-activation/v1",
    activationId,
    workUnitId: MAJOR_APPLIANCE_ACTIVATION_WORK_UNIT,
    state: "ACTIVE_READ_ONLY_CATALOG_MEMBERSHIP",
    approvedCandidate: MAJOR_APPLIANCE_ADOPTION_RELEASE,
    approvedBatchDigest: APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST,
    approvedPackageSha256: APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256,
    approvalArtifact: { path: approvalRelative, sha256: sha256(approvalRaw) },
    rollbackArtifact: { path: rollbackRelative, sha256: sha256(rollbackRaw) },
    categories: before.map(({ binding }) => {
      const release = loaded.releases[binding.categoryId];
      return { categoryId: binding.categoryId, activePointerPath: binding.activePointerPath, beforePointerSha256: binding.activePointerSha256, decisionReleaseVersion: binding.activeDecisionReleaseVersion, decisionArtifactSha256: binding.activeDecisionArtifactSha256, releaseVersion: release.releaseVersion, releaseDigest: release.releaseDigest, catalogArtifactSha256: binding.catalogArtifactSha256, membershipDigest: binding.membershipDigest, memberCount: binding.memberCount, admittedOfferingIds: binding.admittedOfferingIds };
    }),
    review: [
      { check: "APPROVED_DIGESTS", status: "PASS", evidence: `${APPROVED_MAJOR_APPLIANCE_BATCH_DIGEST}; package sha256:${APPROVED_MAJOR_APPLIANCE_PACKAGE_SHA256}.` },
      { check: "EXACT_MEMBERSHIP", status: "PASS", evidence: "Exactly 16 admitted identities across four categories; Teka DFI 46700 TTM remains excluded." },
      { check: "EXISTING_RECORD_RETENTION", status: "PASS", evidence: "Candidate preflight proves byte-equivalent retention of all prior L0-L9 records." },
      { check: "DECISION_NEUTRALITY", status: "PASS", evidence: "v0.1 decision artifacts and policy bindings remain unchanged; additions activate as read-only catalog membership." },
      { check: "COMMERCE_BOUNDARY", status: "PASS", evidence: "Amazon ASIN, price and availability remain external L10 with no ranking, sufficiency, question, recommendation or authorization authority." },
      { check: "TRANSACTION", status: "PASS", evidence: "All four pointers are staged and committed together with compensating byte-exact rollback." },
    ],
  };
  const activationRaw = stable(activation);
  await writeImmutable(activationRelative, activationRaw);
  const activationSha = sha256(activationRaw);

  const afterRaws = new Map<string, string>();
  const beforeRaws = new Map<string, string>();
  for (const { binding, raw, pointer } of before) {
    const release = loaded.releases[binding.categoryId];
    const next = {
      ...pointer,
      richness: {
        releaseVersion: release.releaseVersion,
        releaseDigest: release.releaseDigest,
        catalogArtifactSha256: binding.catalogArtifactSha256,
        membershipDigest: binding.membershipDigest,
        activationManifest: activationRelative,
        activationManifestSha256: activationSha,
        lifecycle: "ACTIVE_READ_ONLY",
      },
    };
    afterRaws.set(binding.activePointerPath, stable(next));
    beforeRaws.set(binding.activePointerPath, raw);
  }

  await replacePointers(afterRaws, beforeRaws);
  try {
    resetAppliancesAuthorityCacheForTests();
    const [activeCatalogs, washing, dryer, dishwasher, refrigerator] = await Promise.all([
      Promise.all(categories.map((category) => loadActiveMajorApplianceCatalogCategory(root, category))),
      loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) }),
      loadActiveDryerAuthority(root),
      loadActiveBoundedAuthority(root, "DISHWASHER"),
      loadActiveRefrigeratorAuthority(root),
    ]);
    if (activeCatalogs.some((item) => item.status !== "READY")) throw new Error(`ACTIVE_CATALOG_LOAD_FAILED:${activeCatalogs.map((item) => item.status === "READY" ? "READY" : item.reason).join(",")}`);
    const activeCounts = activeCatalogs.map((item) => item.status === "READY" ? item.release.offerings.length : 0);
    if (JSON.stringify(activeCounts) !== JSON.stringify([29, 7, 7, 8])) throw new Error("ACTIVE_MEMBER_COUNT_MISMATCH");
    if (washing.status !== "READY" || washing.snapshot.releaseVersion !== "APPLIANCES-WM-TR-v0.1" || washing.snapshot.productIds.size !== 24) throw new Error("WASHING_MACHINE_DECISION_AUTHORITY_CHANGED");
    if (dryer.status !== "READY" || dryer.snapshot.releaseVersion !== "APPLIANCES-DRYER-TR-v0.1" || dryer.snapshot.pack.products.length !== 3) throw new Error("DRYER_DECISION_AUTHORITY_CHANGED");
    if (dishwasher.status !== "READY" || dishwasher.snapshot.releaseVersion !== "APPLIANCES-DISHWASHER-TR-v0.1" || dishwasher.snapshot.pack.products.length !== 4) throw new Error("DISHWASHER_DECISION_AUTHORITY_CHANGED");
    if (refrigerator.status !== "READY" || refrigerator.snapshot.releaseVersion !== "APPLIANCES-REFRIGERATOR-TR-v0.1" || refrigerator.snapshot.pack.products.length !== 4) throw new Error("REFRIGERATOR_DECISION_AUTHORITY_CHANGED");

    const receipt = {
      schemaVersion: "major-appliance-catalog-activation-receipt/v1",
      activationId,
      committedAt: activatedAt,
      state: "COMMITTED",
      activationArtifact: activationRelative,
      activationArtifactSha256: activationSha,
      approvalArtifact: approvalRelative,
      approvalArtifactSha256: sha256(approvalRaw),
      pointers: before.map(({ binding }) => ({ categoryId: binding.categoryId, path: binding.activePointerPath, beforeSha256: binding.activePointerSha256, afterSha256: sha256(afterRaws.get(binding.activePointerPath)!), activeReleaseVersion: loaded.releases[binding.categoryId].releaseVersion, activeReleaseDigest: loaded.releases[binding.categoryId].releaseDigest, memberCount: binding.memberCount })),
      decisionNeutrality: { decisionReleaseVersions: [washing.snapshot.releaseVersion, dryer.snapshot.releaseVersion, dishwasher.snapshot.releaseVersion, refrigerator.snapshot.releaseVersion], nativeDecisionProductCounts: [washing.snapshot.productIds.size, dryer.snapshot.pack.products.length, dishwasher.snapshot.pack.products.length, refrigerator.snapshot.pack.products.length], activeReadOnlyCatalogCounts: activeCounts, recommendationAuthorizationChanged: false },
    } as const;
    await writeImmutable(receiptRelative, stable(receipt));
    console.log(stable(receipt));
  } catch (error) {
    await restoreBeforePointers(rollbackArtifact, new Map([...afterRaws].map(([relative, raw]) => [relative, sha256(raw)])));
    resetAppliancesAuthorityCacheForTests();
    throw error;
  }
}

void (process.argv.includes("--rollback") ? rollback() : activate());
