import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const PREFLIGHT_ROOT = "outputs/catalog-factory-wave-02-15-exact-activation-preflight-01";
const REVIEW_ROOT = "outputs/catalog-factory-wave-02-15-exact-owner-review-01";
const PRODUCTION_ROOT = "data/production/catalog-factory";
const RELEASE_ID = "CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01";
const ACTIVATED_AT = "2026-09-07T08:00:00.000Z";
const EXPECTED = {
  authorization: "a922dc01c12af01b74e81caaebab8bc298b260a47e11ce3bc3949588fedf06cf SHA-256 özetli WU-CATALOG-FACTORY-WAVE-02-15-EXACT-ACTIVATION-PREFLIGHT-01 PASS preflight paketine, 189dc0f6eba7d275581ee23621c1092431e7e96f426261a1776b849b8eeecad4 immutable release özetine ve 1630648472aa5ebc4ab6433d17c77dc134fb834a9707b6eb5891d03f27d94e18 beklenen canlı authority özetine bağlı olarak, tam 15 exact ürünün mevcut 80 üyelik korunarak toplam 95 üyeliğe çıkarılması için yalnız tek atomik compare-and-swap aktivasyonunu onaylıyorum; bu onay deployment, DB migration, bağımsız production değişikliği veya push yetkisi vermez.",
  preflightDigest: "a922dc01c12af01b74e81caaebab8bc298b260a47e11ce3bc3949588fedf06cf",
  releaseDigest: "189dc0f6eba7d275581ee23621c1092431e7e96f426261a1776b849b8eeecad4",
  authorityDigest: "1630648472aa5ebc4ab6433d17c77dc134fb834a9707b6eb5891d03f27d94e18",
};
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha256 = (value: string | Buffer | unknown) => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex");
const readJson = async (base: string, file: string) => JSON.parse(await readFile(path.join(base, file), "utf8"));
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");

async function immutableWrite(file: string, bytes: Buffer) {
  try {
    const existing = await readFile(file);
    if (!existing.equals(bytes)) throw new Error(`IMMUTABLE_RELEASE_CONFLICT:${file}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes, { flag: "wx" });
  }
}

export async function activateWave02Exact15(base = process.cwd(), options: { dryRun?: boolean } = {}) {
  const preflight = await readJson(base, `${PREFLIGHT_ROOT}/PREFLIGHT.json`);
  const releaseCandidateBytes = await readFile(path.join(base, PREFLIGHT_ROOT, "IMMUTABLE_RELEASE_CANDIDATE.json"));
  const releaseCandidate = JSON.parse(releaseCandidateBytes.toString());
  const authorization = (await readFile(path.join(base, PREFLIGHT_ROOT, "ACTIVATION_AUTHORIZATION_SENTENCE.txt"), "utf8")).trimEnd();
  if (authorization !== EXPECTED.authorization) throw new Error("ACTIVATION_AUTHORIZATION_MISMATCH");
  if (preflight.status !== "PASS_NOT_ACTIVATED" || preflight.preflightDigest !== EXPECTED.preflightDigest) throw new Error("PREFLIGHT_NOT_BOUND_PASS");
  if (releaseCandidate.releaseDigest !== EXPECTED.releaseDigest || preflight.currentAuthorityDigest !== EXPECTED.authorityDigest) throw new Error("RELEASE_OR_AUTHORITY_DIGEST_MISMATCH");

  const rollback = await readJson(base, `${PREFLIGHT_ROOT}/ROLLBACK_POINTER_SNAPSHOT.json`);
  const currentRows = await Promise.all((rollback.pointerSnapshots as Array<{ file: string; sha256: string; byteLength: number }>).map(async snapshot => {
    const bytes = await readFile(path.join(base, snapshot.file));
    if (sha256(bytes) !== snapshot.sha256 || bytes.length !== snapshot.byteLength) throw new Error(`CAS_AUTHORITY_CHANGED:${snapshot.file}`);
    return { file: snapshot.file, byteLength: bytes.length, sha256: sha256(bytes) };
  }));
  if (sha256(currentRows) !== EXPECTED.authorityDigest) throw new Error("CAS_AUTHORITY_DIGEST_CHANGED");

  const categories = [];
  for (const summary of preflight.categories as Array<{ categoryId: string; proof: { before: number; additions: number; after: number; currentMembershipDigest: string; proposedMembershipDigest: string } }>) {
    const review = await readJson(base, `${REVIEW_ROOT}/categories/${slug(summary.categoryId)}/owner-review-category.json`);
    categories.push({
      categoryId: summary.categoryId,
      lifecycle: "ACTIVE_MEMBERSHIP_OVERLAY",
      before: summary.proof.before,
      additions: review.proposedAdditions,
      exactProductIds: review.membershipProposal.exactProductIds,
      after: summary.proof.after,
      currentMembershipDigest: summary.proof.currentMembershipDigest,
      activeMembershipDigest: summary.proof.proposedMembershipDigest,
      registry: { categoryCreation: false, membershipOverlay: true },
      secretary: { aliases: review.proposedAdditions.flatMap((row: { secretary: { aliases: string[] } }) => row.secretary.aliases), binding: "ACTIVE_EXACT_IDENTITY_OVERLAY" },
    });
  }
  const overlayCore = { schemaVersion: "catalog-factory-active-membership-overlay/v0.1", releaseId: RELEASE_ID, lifecycle: "ACTIVE_WHEN_SELECTED_BY_POINTER", authority: { preflightDigest: EXPECTED.preflightDigest, immutableReleaseDigest: EXPECTED.releaseDigest, currentAuthorityDigest: EXPECTED.authorityDigest, authorizationSentenceSha256: sha256(`${authorization}\n`) }, totals: { before: 80, additions: 15, active: 95 }, categories, boundaries: { databaseMigration: "NONE", deployment: false, push: false, newCategories: 0 } };
  const overlay = { ...overlayCore, overlayDigest: sha256(overlayCore) };
  const manifestCore = { schemaVersion: "catalog-factory-active-release-manifest/v0.1", releaseId: RELEASE_ID, activatedAt: ACTIVATED_AT, releaseCandidateDigest: EXPECTED.releaseDigest, overlayDigest: overlay.overlayDigest, preflightDigest: EXPECTED.preflightDigest, expectedAuthorityDigest: EXPECTED.authorityDigest, counts: overlay.totals, consumers: { registry: "ACTIVE", runtime: "ACTIVE_VIA_CATALOG_FACTORY_POINTER", secretary: "ACTIVE_EXACT_IDENTITY_OVERLAY", catalogDirectory: "EXISTING_CATEGORIES_ONLY" }, databaseMigration: "NONE", deployment: false, push: false };
  const manifest = { ...manifestCore, manifestDigest: sha256(manifestCore) };
  const activationCore = { schemaVersion: "catalog-factory-atomic-activation-event/v0.1", activationId: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-ACTIVATION-01", status: "ACTIVATED_LOCAL_ATOMIC_POINTER", activatedAt: ACTIVATED_AT, authorizationSentence: authorization, preflightDigest: EXPECTED.preflightDigest, releaseDigest: EXPECTED.releaseDigest, expectedAuthorityDigest: EXPECTED.authorityDigest, overlayDigest: overlay.overlayDigest, manifestDigest: manifest.manifestDigest, compareAndSwap: { checked: true, result: "MATCH", commitPoint: `${PRODUCTION_ROOT}/active.json` }, totals: overlay.totals, rollback: { snapshotDigest: preflight.rollbackDigest, policy: "RESTORE_ABSENT_OVERLAY_POINTER; UNDERLYING_POINTERS_BYTE_IDENTICAL_AND_UNCHANGED" }, databaseMigration: "NONE", deployment: false, push: false };
  const activation = { ...activationCore, activationDigest: sha256(activationCore) };
  const pointer = { schemaVersion: "catalog-factory-overlay-active-pointer/v0.1", state: "ACTIVE", activeReleaseId: RELEASE_ID, manifestFile: `${PRODUCTION_ROOT}/releases/${RELEASE_ID}/manifest.json`, manifestDigest: manifest.manifestDigest, overlayFile: `${PRODUCTION_ROOT}/releases/${RELEASE_ID}/catalog-overlay.json`, overlayDigest: overlay.overlayDigest, activationEventFile: `${PRODUCTION_ROOT}/governance/activation-events/${activation.activationId}/activation.json`, activationDigest: activation.activationDigest, underlyingAuthorityDigest: EXPECTED.authorityDigest, totals: overlay.totals };
  const result = { releaseId: RELEASE_ID, pointer, manifest, overlay, activation, dryRun: options.dryRun === true };
  if (options.dryRun) return result;

  const releaseDirectory = path.join(base, PRODUCTION_ROOT, "releases", RELEASE_ID);
  const eventDirectory = path.join(base, PRODUCTION_ROOT, "governance", "activation-events", activation.activationId);
  await Promise.all([
    immutableWrite(path.join(releaseDirectory, "release-candidate.json"), releaseCandidateBytes),
    immutableWrite(path.join(releaseDirectory, "catalog-overlay.json"), Buffer.from(`${stable(overlay)}\n`)),
    immutableWrite(path.join(releaseDirectory, "manifest.json"), Buffer.from(`${stable(manifest)}\n`)),
    immutableWrite(path.join(releaseDirectory, "rollback-pointer-snapshot.json"), Buffer.from(`${stable(rollback)}\n`)),
    immutableWrite(path.join(eventDirectory, "activation.json"), Buffer.from(`${stable(activation)}\n`)),
    immutableWrite(path.join(eventDirectory, "authorization-sentence.txt"), Buffer.from(`${authorization}\n`)),
  ]);
  const pointerPath = path.join(base, PRODUCTION_ROOT, "active.json");
  const pointerBytes = Buffer.from(`${stable(pointer)}\n`);
  try {
    const existing = await readFile(pointerPath);
    if (!existing.equals(pointerBytes)) throw new Error("CAS_OVERLAY_POINTER_ALREADY_EXISTS_DIFFERENT");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    await mkdir(path.dirname(pointerPath), { recursive: true });
    const temporary = `${pointerPath}.tmp-${process.pid}`;
    try {
      await writeFile(temporary, pointerBytes, { flag: "wx" });
      await rename(temporary, pointerPath);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  if (!(await readFile(pointerPath)).equals(pointerBytes)) throw new Error("POST_CAS_POINTER_BYTE_MISMATCH");
  return result;
}

if (process.argv[1]?.endsWith("activate.ts")) activateWave02Exact15().then(result => console.log(JSON.stringify({ status: result.activation.status, activationDigest: result.activation.activationDigest, overlayDigest: result.overlay.overlayDigest, totals: result.overlay.totals, deployment: result.activation.deployment, databaseMigration: result.activation.databaseMigration, push: result.activation.push }, null, 2)));
