import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const stable = value => JSON.stringify(value, (_key, child) => child && typeof child === "object" && !Array.isArray(child) ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child);
const sha = value => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex");
const PREFLIGHT_ROOT = "outputs/catalog-factory-wave05-exact3-108-activation-readiness-01";
const PROD = "data/production/catalog-factory";
const POINTER = `${PROD}/active.json`;
const RELEASE_ID = "CATALOG-FACTORY-WAVE05-EXACT3-111-CANDIDATE-01";
const ACTIVATION_ID = "WU-CATALOG-FACTORY-WAVE05-EXACT3-ATOMIC-ACTIVATION-01";
const EXPECTED = Object.freeze({ preflight: "4b46a5d5673266610cf66fd0a98459bddc063c1324b95763fe63ab61084e5a7d", release: "31929641c5673990bb28180b238983f6935d4cb2532cd4863676e936ed3cc6f0", pointer: "c6d1a1ee821891e34d3e7c2bb05d7fe63a4375d0a43da543a964404b7eed4589", approval: "10c3649a344f7178609ac3ddb96d70a2f3db922f95ad84d4e3232db54e15922c" });
const authorization = (await readFile(`${PREFLIGHT_ROOT}/ACTIVATION_AUTHORIZATION_SENTENCE.txt`, "utf8")).trim();
const [preflight, release, overlay, oldPointerBytes] = await Promise.all([
  readFile(`${PREFLIGHT_ROOT}/PREFLIGHT.json`, "utf8").then(JSON.parse),
  readFile(`${PREFLIGHT_ROOT}/IMMUTABLE_RELEASE.json`, "utf8").then(JSON.parse),
  readFile(`${PREFLIGHT_ROOT}/PROPOSED_OVERLAY.json`, "utf8").then(JSON.parse),
  readFile(POINTER),
]);
if (preflight.status !== "PASS_PREPARED_NOT_AUTHORIZED_NOT_EXECUTED" || preflight.preflightDigest !== EXPECTED.preflight || release.releaseDigest !== EXPECTED.release || preflight.bindings.ownerApprovalEventDigest !== EXPECTED.approval || sha(oldPointerBytes) !== EXPECTED.pointer || overlay.totals.active !== 111 || overlay.totals.additions !== 31 || release.readiness.P_READY || release.readiness.Y_READY) throw new Error("CAS_PRECONDITION_MISMATCH");
const manifestCore = { schemaVersion: "catalog-factory-active-release-manifest/v0.6", releaseId: RELEASE_ID, activatedAt: "2026-09-08T16:00:00.000+03:00", preflightDigest: EXPECTED.preflight, preflightReleaseDigest: EXPECTED.release, releaseDigest: release.releaseDigest, overlayDigest: overlay.overlayDigest, ownerApprovalEventDigest: EXPECTED.approval, totals: overlay.totals, pReady: false, yReady: false, runtimeConsumption: "BLOCKED_PENDING_SEPARATE_LOADER_INTEGRATION", databaseMigration: "NONE", domainCatalogPointers: "UNCHANGED", preview: false, deployment: false, production: false, push: false };
const manifest = { ...manifestCore, manifestDigest: sha(manifestCore) };
const activationCore = { schemaVersion: "catalog-factory-wave05-atomic-activation-event/v1", activationId: ACTIVATION_ID, status: "ACTIVATED_LOCAL_ATOMIC_POINTER", activatedAt: "2026-09-08T16:00:00.000+03:00", authorizationSentence: authorization, preflightDigest: EXPECTED.preflight, preflightReleaseDigest: EXPECTED.release, ownerApprovalEventDigest: EXPECTED.approval, expectedOldPointerSha256: EXPECTED.pointer, releaseDigest: release.releaseDigest, overlayDigest: overlay.overlayDigest, manifestDigest: manifest.manifestDigest, compareAndSwap: { checked: true, result: "MATCH", commitPoint: POINTER }, numberPlanes: { allCatalog: { before: 813, after: 813, mutation: 0 }, catalogFactoryOverlay: { before: 108, after: 111, delta: 3 } }, runtimeIntegration: false, databaseMigration: "NONE", domainCatalogPointers: "UNCHANGED", preview: false, deployment: false, production: false, push: false };
const activation = { ...activationCore, activationDigest: sha(activationCore) };
const releaseDir = `${PROD}/releases/${RELEASE_ID}`;
const eventDir = `${PROD}/governance/activation-events/${ACTIVATION_ID}`;
await mkdir(releaseDir, { recursive: false });
await mkdir(eventDir, { recursive: false });
await Promise.all([
  writeFile(`${releaseDir}/release-candidate.json`, `${stable(release)}\n`, { flag: "wx" }),
  writeFile(`${releaseDir}/catalog-overlay.json`, `${stable(overlay)}\n`, { flag: "wx" }),
  writeFile(`${releaseDir}/manifest.json`, `${stable(manifest)}\n`, { flag: "wx" }),
  writeFile(`${eventDir}/activation.json`, `${stable(activation)}\n`, { flag: "wx" }),
  writeFile(`${eventDir}/authorization-sentence.txt`, `${authorization}\n`, { flag: "wx" }),
]);
const pointerCore = { schemaVersion: "catalog-factory-overlay-active-pointer/v0.6", state: "ACTIVE", activeReleaseId: RELEASE_ID, manifestFile: `${releaseDir}/manifest.json`, manifestDigest: manifest.manifestDigest, overlayFile: `${releaseDir}/catalog-overlay.json`, overlayDigest: overlay.overlayDigest, activationEventFile: `${eventDir}/activation.json`, activationDigest: activation.activationDigest, previousPointerSha256: EXPECTED.pointer, preflightDigest: EXPECTED.preflight, preflightReleaseDigest: EXPECTED.release, releaseDigest: release.releaseDigest, runtimeConsumption: "BLOCKED_PENDING_SEPARATE_LOADER_INTEGRATION", pReady: false, yReady: false, totals: { before: 108, additions: 3, active: 111 } };
const pointerBytes = Buffer.from(`${stable(pointerCore)}\n`);
const temporaryPointer = path.join(PROD, `.active.wave05.${process.pid}.tmp`);
if (sha(await readFile(POINTER)) !== EXPECTED.pointer) throw new Error("CAS_MISMATCH_ABORT_NO_POINTER_WRITE");
await writeFile(temporaryPointer, pointerBytes, { flag: "wx" });
await rename(temporaryPointer, POINTER);
const receiptCore = { schemaVersion: "catalog-factory-wave05-cas-receipt/v1", activationId: ACTIVATION_ID, status: "SUCCESS", committedAt: "2026-09-08T16:00:00.000+03:00", oldPointerSha256: EXPECTED.pointer, newPointerSha256: sha(pointerBytes), preflightDigest: EXPECTED.preflight, releaseDigest: release.releaseDigest, overlayDigest: overlay.overlayDigest, activationDigest: activation.activationDigest, numberPlanes: activation.numberPlanes, runtimeIntegration: false, databaseMigration: "NONE", domainCatalogPointers: "UNCHANGED", preview: false, deployment: false, production: false, push: false };
const receipt = { ...receiptCore, receiptDigest: sha(receiptCore) };
await writeFile(`${eventDir}/receipt.json`, `${stable(receipt)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: receipt.status, releaseId: RELEASE_ID, oldPointerSha256: EXPECTED.pointer, newPointerSha256: receipt.newPointerSha256, releaseDigest: release.releaseDigest, overlayDigest: overlay.overlayDigest, activationDigest: activation.activationDigest, receiptDigest: receipt.receiptDigest, numberPlanes: receipt.numberPlanes }, null, 2));
