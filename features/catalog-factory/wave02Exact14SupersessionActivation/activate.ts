import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const PREFLIGHT_ROOT = "outputs/catalog-factory-wave-02-14-exact-supersession-activation-preflight-01";
const REVIEW_ROOT = "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01";
const PRODUCTION_ROOT = "data/production/catalog-factory";
const RELEASE_ID = "CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01";
const ACTIVATION_ID = "WU-CATALOG-FACTORY-WAVE-02-14-EXACT-SUPERSESSION-ACTIVATION-01";
const SUPERSESSION_ID = "CATALOG-FACTORY-EXACT15-TO-EXACT14-SUPERSESSION-EFFECTIVE-01";
const ACTIVATED_AT = "2026-09-07T14:00:00.000Z";
const EXPECTED = {
  authorization: "2552e4c6b47cb5e610eabf761b496210bf65ecb50bd02ae9343e2110279b2e54 SHA-256 preflight özeti, 06f7782250e6bd3f675be640a831180dfdab0612a30f82e88e26229be744458e SHA-256 exact-14 immutable release özeti ve f8d7aad75c5eb0610e6a782ffa0a70b67a55e2ec08d12fe71972bb3d738a799a SHA-256 mevcut exact-15/95 pointer özetiyle bağlı WU-CATALOG-FACTORY-WAVE-02-14-EXACT-SUPERSESSION-ACTIVATION-PREFLIGHT-01 PASS paketine dayanarak, Catalog Factory yerel authority pointer'ının tek atomik compare-and-swap ile 80+14=94 üyelikli supersession release'ine geçirilmesini ve eski exact-15/95 overlay authority'sinin yalnız başarılı geçişten sonra prohibited/superseded olmasını onaylıyorum; bu onay push, runtime integration, preview, production deployment, domain pointer değişikliği veya DB migration yetkisi vermez.",
  preflightDigest: "2552e4c6b47cb5e610eabf761b496210bf65ecb50bd02ae9343e2110279b2e54",
  releaseDigest: "06f7782250e6bd3f675be640a831180dfdab0612a30f82e88e26229be744458e",
  oldPointerSha256: "f8d7aad75c5eb0610e6a782ffa0a70b67a55e2ec08d12fe71972bb3d738a799a",
  candidateDigest: "7f5ee7b49e029ee80b6a7b2bfae008dfb41b8c1f78f4aaadf77f0c5bffed04d8",
  packageDigest: "79e74a7b64b61ffd4a9a05bb6392743b2e81b103a668388142ac08751ffbe860",
};

const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha256 = (value: string | Buffer | unknown) => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex");
const json = async (base: string, file: string) => JSON.parse(await readFile(path.join(base, file), "utf8"));

async function immutableWrite(file: string, bytes: Buffer) {
  try {
    const existing = await readFile(file);
    if (!existing.equals(bytes)) throw new Error(`IMMUTABLE_ARTIFACT_CONFLICT:${file}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: "wx" });
  }
}

export async function activateWave02Exact14Supersession(base = process.cwd(), options: { dryRun?: boolean } = {}) {
  const preflight = await json(base, `${PREFLIGHT_ROOT}/PREFLIGHT.json`);
  const review = await json(base, `${REVIEW_ROOT}/OWNER_REVIEW_PACKAGE.json`);
  const releaseBytes = await readFile(path.join(base, PREFLIGHT_ROOT, "IMMUTABLE_RELEASE_CANDIDATE.json"));
  const release = JSON.parse(releaseBytes.toString());
  const rollbackBytes = await readFile(path.join(base, PREFLIGHT_ROOT, "ROLLBACK_POINTER_SNAPSHOT.json"));
  const authorization = (await readFile(path.join(base, PREFLIGHT_ROOT, "ACTIVATION_AUTHORIZATION_SENTENCE.txt"), "utf8")).trimEnd();
  if (authorization !== EXPECTED.authorization) throw new Error("ACTIVATION_AUTHORIZATION_MISMATCH");
  if (preflight.status !== "PASS_NOT_ACTIVATED" || preflight.preflightDigest !== EXPECTED.preflightDigest) throw new Error("PREFLIGHT_NOT_BOUND_PASS");
  if (preflight.proposed.releaseDigest !== EXPECTED.releaseDigest || release.releaseDigest !== EXPECTED.releaseDigest) throw new Error("RELEASE_DIGEST_MISMATCH");
  if (review.candidateDigest !== EXPECTED.candidateDigest || review.packageDigest !== EXPECTED.packageDigest) throw new Error("OWNER_APPROVAL_CHAIN_MISMATCH");
  if (review.totals.baselineActive !== 80 || review.totals.proposedAdditions !== 14 || review.totals.proposedAfter !== 94) throw new Error("MEMBERSHIP_TOTAL_MISMATCH");
  if (review.duplicateTerminal.membershipEffect !== 0 || review.duplicateTerminal.canonicalExistingExactProductId !== "LG_GC_B569NLLM_TR") throw new Error("DUPLICATE_TERMINAL_MISMATCH");

  const pointerPath = path.join(base, PRODUCTION_ROOT, "active.json");
  const oldPointerBytes = await readFile(pointerPath);
  const oldPointer = JSON.parse(oldPointerBytes.toString());
  const currentIsExpectedOld = sha256(oldPointerBytes) === EXPECTED.oldPointerSha256;
  const currentIsActivatedRelease = oldPointer.activeReleaseId === RELEASE_ID;
  if (!currentIsExpectedOld && !currentIsActivatedRelease) throw new Error("CAS_OLD_POINTER_MISMATCH");
  if (currentIsExpectedOld && (oldPointer.totals.active !== 95 || oldPointer.overlayDigest !== preflight.current.overlayDigest || oldPointer.activationDigest !== preflight.current.activationDigest)) throw new Error("OLD_AUTHORITY_CHAIN_MISMATCH");

  const categories = review.categories.map((category: Record<string, unknown>) => ({
    categoryId: category.categoryId,
    lifecycle: "ACTIVE_MEMBERSHIP_OVERLAY",
    before: category.baselineActive,
    additions: category.proposedAdditions,
    exactProductIds: (category.proposedMembership as { exactProductIds: string[] }).exactProductIds,
    after: (category.proposedMembership as { after: number }).after,
    activeMembershipDigest: (category.proposedMembership as { digest: string }).digest,
  }));
  const overlayCore = { schemaVersion: "catalog-factory-active-membership-overlay/v0.2", releaseId: RELEASE_ID, lifecycle: "ACTIVE_WHEN_SELECTED_BY_POINTER", authority: { preflightDigest: EXPECTED.preflightDigest, immutableReleaseDigest: EXPECTED.releaseDigest, candidateDigest: EXPECTED.candidateDigest, packageDigest: EXPECTED.packageDigest }, totals: { before: 80, additions: 14, active: 94 }, categories, duplicateTerminal: review.duplicateTerminal, boundaries: { runtimeIntegration: false, runtimeEffect: 0, databaseMigration: "NONE", domainPointerMutation: false, preview: false, productionDeployment: false, push: false } };
  const overlay = { ...overlayCore, overlayDigest: sha256(overlayCore) };
  const manifestCore = { schemaVersion: "catalog-factory-active-release-manifest/v0.2", releaseId: RELEASE_ID, activatedAt: ACTIVATED_AT, releaseCandidateDigest: EXPECTED.releaseDigest, overlayDigest: overlay.overlayDigest, preflightDigest: EXPECTED.preflightDigest, ownerApprovalEventDigest: preflight.authority.approvalEventDigest, counts: overlay.totals, runtimeConsumption: "ZERO_UNIFIED_CONSUMER_NOT_ACTIVE", databaseMigration: "NONE", domainPointerMutation: false, preview: false, productionDeployment: false, push: false };
  const manifest = { ...manifestCore, manifestDigest: sha256(manifestCore) };
  const supersessionCore = { schemaVersion: "catalog-factory-effective-supersession-event/v0.1", supersessionId: SUPERSESSION_ID, status: "EFFECTIVE_AFTER_SUCCESSFUL_CAS", effectiveAt: ACTIVATED_AT, previous: { releaseId: "CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01", pointerSha256: EXPECTED.oldPointerSha256, overlayDigest: preflight.current.overlayDigest, activationDigest: preflight.current.activationDigest, authorityDisposition: "PROHIBITED_SUPERSEDED" }, replacement: { releaseId: RELEASE_ID, releaseDigest: EXPECTED.releaseDigest, overlayDigest: overlay.overlayDigest, totals: overlay.totals }, immutableHistoryPolicy: "OLD_ARTIFACTS_RETAINED_BYTE_IDENTICAL", runtimeEffect: 0 };
  const supersession = { ...supersessionCore, supersessionDigest: sha256(supersessionCore) };
  const activationCore = { schemaVersion: "catalog-factory-exact14-supersession-activation-event/v0.2", activationId: ACTIVATION_ID, status: "ACTIVATED_LOCAL_ATOMIC_POINTER", activatedAt: ACTIVATED_AT, authorizationSentence: authorization, preflightDigest: EXPECTED.preflightDigest, releaseDigest: EXPECTED.releaseDigest, expectedOldPointerSha256: EXPECTED.oldPointerSha256, overlayDigest: overlay.overlayDigest, manifestDigest: manifest.manifestDigest, supersessionDigest: supersession.supersessionDigest, compareAndSwap: { checked: true, result: "MATCH", commitPoint: `${PRODUCTION_ROOT}/active.json` }, totals: overlay.totals, runtimeEffect: 0, databaseMigration: "NONE", domainPointerMutation: false, preview: false, productionDeployment: false, push: false };
  const activation = { ...activationCore, activationDigest: sha256(activationCore) };
  const pointer = { schemaVersion: "catalog-factory-overlay-active-pointer/v0.2", state: "ACTIVE", activeReleaseId: RELEASE_ID, manifestFile: `${PRODUCTION_ROOT}/releases/${RELEASE_ID}/manifest.json`, manifestDigest: manifest.manifestDigest, overlayFile: `${PRODUCTION_ROOT}/releases/${RELEASE_ID}/catalog-overlay.json`, overlayDigest: overlay.overlayDigest, activationEventFile: `${PRODUCTION_ROOT}/governance/activation-events/${ACTIVATION_ID}/activation.json`, activationDigest: activation.activationDigest, supersessionEventFile: `${PRODUCTION_ROOT}/governance/supersession-events/${SUPERSESSION_ID}/supersession.json`, supersessionDigest: supersession.supersessionDigest, previousPointerSha256: EXPECTED.oldPointerSha256, oldExact15RuntimeAuthority: "PROHIBITED_SUPERSEDED", runtimeConsumption: "ZERO_UNIFIED_CONSUMER_NOT_ACTIVE", totals: overlay.totals };
  const result = { releaseId: RELEASE_ID, pointer, manifest, overlay, activation, supersession, dryRun: options.dryRun === true };
  if (options.dryRun) return result;

  const pointerBytes = Buffer.from(`${stable(pointer)}\n`);
  if (currentIsActivatedRelease) {
    if (!oldPointerBytes.equals(pointerBytes)) throw new Error("ACTIVATED_POINTER_CONFLICT");
    return result;
  }

  const releaseDir = path.join(base, PRODUCTION_ROOT, "releases", RELEASE_ID);
  const eventDir = path.join(base, PRODUCTION_ROOT, "governance", "activation-events", ACTIVATION_ID);
  const supersessionDir = path.join(base, PRODUCTION_ROOT, "governance", "supersession-events", SUPERSESSION_ID);
  await Promise.all([
    immutableWrite(path.join(releaseDir, "release-candidate.json"), releaseBytes),
    immutableWrite(path.join(releaseDir, "catalog-overlay.json"), Buffer.from(`${stable(overlay)}\n`)),
    immutableWrite(path.join(releaseDir, "manifest.json"), Buffer.from(`${stable(manifest)}\n`)),
    immutableWrite(path.join(releaseDir, "rollback-pointer-snapshot.json"), rollbackBytes),
    immutableWrite(path.join(eventDir, "activation.json"), Buffer.from(`${stable(activation)}\n`)),
    immutableWrite(path.join(eventDir, "authorization-sentence.txt"), Buffer.from(`${authorization}\n`)),
    immutableWrite(path.join(supersessionDir, "supersession.json"), Buffer.from(`${stable(supersession)}\n`)),
  ]);
  if (sha256(await readFile(pointerPath)) !== EXPECTED.oldPointerSha256) throw new Error("CAS_OLD_POINTER_CHANGED_BEFORE_COMMIT");
  const temporary = `${pointerPath}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, pointerBytes, { flag: "wx" });
    await rename(temporary, pointerPath);
  } finally {
    await rm(temporary, { force: true });
  }
  if (!(await readFile(pointerPath)).equals(pointerBytes)) throw new Error("POST_CAS_POINTER_BYTE_MISMATCH");
  return result;
}

if (process.argv[1]?.endsWith("activate.ts")) activateWave02Exact14Supersession().then(result => console.log(JSON.stringify({ status: result.activation.status, activationDigest: result.activation.activationDigest, supersessionDigest: result.supersession.supersessionDigest, overlayDigest: result.overlay.overlayDigest, totals: result.overlay.totals, runtimeEffect: result.activation.runtimeEffect }, null, 2)));
