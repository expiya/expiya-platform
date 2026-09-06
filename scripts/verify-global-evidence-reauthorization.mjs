import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageId = "GLOBAL-EVIDENCE-AUTH-20260905-02";
const packageDir = `data/governance/global-evidence/activation-authorizations/${packageId}`;
const carsDir = "data/production/cars-global-evidence/release-candidates/v1.0.0-catalog-v0.55.4-2026-09-05";
const appliancesDir = "data/production/appliances/global-evidence/release-candidates/APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1";
const mediaV1Path = "data/production/appliances/media/releases/APPLIANCES-GOVERNED-MEDIA-TR-v0.1/release.json";
const mediaV2Dir = "data/production/appliances/media/releases/APPLIANCES-GOVERNED-MEDIA-TR-v0.2";

const absolute = (relative) => path.join(root, relative);
const bytes = (relative) => readFileSync(absolute(relative));
const text = (relative) => readFileSync(absolute(relative), "utf8");
const json = (relative) => JSON.parse(text(relative));
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value) => Array.isArray(value)
  ? `[${value.map(stable).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`
    : JSON.stringify(value);
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
const canonicalPretty = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const ensure = (condition, code) => {
  if (!condition) throw new Error(code);
};

const authorization = json(`${packageDir}/authorization.json`);
const preflight = json(`${packageDir}/preflight.json`);
ensure(authorization.authorizationPackageId === packageId && authorization.status === "READY_FOR_APPROVAL", "AUTHORIZATION_NOT_READY");
ensure(authorization.activationPerformed === false && preflight.activationPerformed === false, "ACTIVATION_MUST_REMAIN_FALSE");
ensure(authorization.dependentPointerWriteSet.length === 7, "DEPENDENT_WRITE_SET_NOT_SEVEN");
ensure(!authorization.dependentPointerWriteSet.some(({ path: target }) => target === "data/production/appliances/media/active.json"), "MEDIA_POINTER_IN_WRITE_SET");

const currentPointerHashes = {};
for (const [relative, expected] of Object.entries(preflight.currentActivePointerHashes)) {
  const actual = sha(bytes(relative));
  currentPointerHashes[relative] = actual;
  ensure(actual === expected, `CURRENT_POINTER_MISMATCH:${relative}`);
}
ensure(Object.keys(currentPointerHashes).length === 36, "CURRENT_POINTER_COUNT_NOT_36");

const carsManifestRaw = text(`${carsDir}/manifest.json`);
const carsManifest = JSON.parse(carsManifestRaw);
const carsCandidateRaw = text(`${carsDir}/candidate.json`);
ensure(sha(carsCandidateRaw) === authorization.candidates.cars.candidateFileSha256, "CARS_CANDIDATE_BYTES_CHANGED");
ensure(sha(carsManifestRaw) === authorization.candidates.cars.manifestFileSha256, "CARS_MANIFEST_BYTES_CHANGED");
ensure(carsManifest.releaseDigest === authorization.candidates.cars.releaseDigest, "CARS_RELEASE_DIGEST_CHANGED");
ensure(carsManifest.releaseDigest === sha(canonicalPretty({ releaseVersion: carsManifest.releaseVersion, files: carsManifest.files })), "CARS_RELEASE_DIGEST_RECOMPUTE_FAILED");

const appliancesManifestRaw = text(`${appliancesDir}/manifest.json`);
const appliancesManifest = JSON.parse(appliancesManifestRaw);
const appliancesCandidateRaw = text(`${appliancesDir}/candidate.json`);
const appliancesCandidate = JSON.parse(appliancesCandidateRaw);
ensure(sha(appliancesCandidateRaw) === authorization.candidates.appliances.candidateFileSha256, "APPLIANCES_CANDIDATE_FILE_BYTES_CHANGED");
ensure(sha(stable(appliancesCandidate)) === authorization.candidates.appliances.candidatePayloadSha256, "APPLIANCES_CANDIDATE_PAYLOAD_CHANGED");
ensure(sha(appliancesManifestRaw) === authorization.candidates.appliances.manifestFileSha256, "APPLIANCES_MANIFEST_BYTES_CHANGED");
const research = [
  "data/research/appliances-global-evidence-01/research-ledger.json",
  "data/research/appliances-global-evidence-01/source-registry.json",
  "data/research/appliances-global-evidence-01/unresolved-ledger.json",
  "data/research/appliances-global-evidence-01/manual-exclusions.json",
  "data/research/appliances-global-evidence-01/admitted-manuals.json",
].map(text);
const appliancesComposite = {
  candidate: appliancesCandidateRaw.trim(),
  coverage: text(`${appliancesDir}/coverage-report.json`).trim(),
  ledger: research[0].trim(),
  sourceRegistry: research[1].trim(),
  unresolved: research[2].trim(),
  dryRun: text(`${appliancesDir}/decision-neutrality-dry-run.json`).trim(),
  completionReport: text(`${appliancesDir}/completion-report.md`).trim(),
  manualExclusions: research[3].trim(),
  admittedManuals: research[4].trim(),
  manualByteBindings: appliancesManifest.manualByteBindings,
  pointerHashesBefore: appliancesManifest.activePointerHashesBefore,
  pointerHashesAfter: appliancesManifest.activePointerHashesAfter,
};
ensure(sha(stable(appliancesComposite)) === authorization.candidates.appliances.releaseDigest, "APPLIANCES_RELEASE_DIGEST_RECOMPUTE_FAILED");

const mediaV1 = json(mediaV1Path);
const mediaV2Raw = text(`${mediaV2Dir}/release.json`);
const mediaV2 = JSON.parse(mediaV2Raw);
const mediaManifestRaw = text(`${mediaV2Dir}/manifest.json`);
const mediaManifest = JSON.parse(mediaManifestRaw);
const mediaCoverageRaw = text(`${mediaV2Dir}/coverage.json`);
const mediaCoverage = JSON.parse(mediaCoverageRaw);
const mediaPointer = json("data/production/appliances/media/active.json");
const { releaseDigest: mediaReleaseDigest, ...mediaPayload } = mediaV2;
ensure(sha(stable(mediaPayload)) === `sha256:${mediaReleaseDigest}`, "MEDIA_RELEASE_DIGEST_RECOMPUTE_FAILED");
ensure(`sha256:${mediaReleaseDigest}` === authorization.acceptedConcurrentChange.releaseDigest, "MEDIA_AUTHORIZATION_DIGEST_MISMATCH");
ensure(sha(mediaV2Raw) === authorization.acceptedConcurrentChange.releaseFileSha256, "MEDIA_RELEASE_FILE_CHANGED");
ensure(sha(mediaManifestRaw) === authorization.acceptedConcurrentChange.manifestFileSha256, "MEDIA_MANIFEST_FILE_CHANGED");
ensure(sha(mediaCoverageRaw) === authorization.acceptedConcurrentChange.coverageFileSha256, "MEDIA_COVERAGE_FILE_CHANGED");
ensure(mediaManifest.files.find(({ name }) => name === "release.json")?.sha256 === sha(mediaV2Raw).slice(7), "MEDIA_RELEASE_MANIFEST_MISMATCH");
ensure(mediaManifest.files.find(({ name }) => name === "coverage.json")?.sha256 === sha(mediaCoverageRaw).slice(7), "MEDIA_COVERAGE_MANIFEST_MISMATCH");
const fallbackAsset = "public/appliances/representative/owned-category-catalog.svg";
ensure(sha(bytes(fallbackAsset)) === authorization.acceptedConcurrentChange.ownedFallbackAssetSha256, "MEDIA_FALLBACK_ASSET_CHANGED");
ensure(mediaManifest.ownedAssets[0]?.sha256 === sha(bytes(fallbackAsset)).slice(7), "MEDIA_FALLBACK_MANIFEST_MISMATCH");
ensure(mediaPointer.releaseDigest === mediaReleaseDigest && mediaPointer.releaseFile === `releases/${mediaV2.releaseId}/release.json`, "MEDIA_POINTER_BINDING_INVALID");

const ids = (rows) => rows.map(({ exactProductId }) => exactProductId).sort();
const candidateIds = appliancesCandidate.members.map(({ productId }) => productId).sort();
const identityCore = (rows) => rows.map(({ exactProductId, categoryId, brand, model, parentRelease, parentArtifactSha256, canonicalProductPage }) => ({
  exactProductId, categoryId, brand, model, parentRelease, parentArtifactSha256, canonicalProductPage,
})).sort((a, b) => a.exactProductId.localeCompare(b.exactProductId));
ensure(JSON.stringify(ids(mediaV1.members)) === JSON.stringify(ids(mediaV2.members)), "MEDIA_PRODUCT_MEMBERSHIP_CHANGED");
ensure(JSON.stringify(candidateIds) === JSON.stringify(ids(mediaV2.members)), "MEDIA_CANDIDATE_MEMBERSHIP_MISMATCH");
ensure(JSON.stringify(identityCore(mediaV1.members)) === JSON.stringify(identityCore(mediaV2.members)), "MEDIA_NON_PRESENTATION_FIELDS_CHANGED");
ensure(mediaV2.members.length === 97 && new Set(mediaV2.members.map(({ categoryId }) => categoryId)).size === 24, "MEDIA_COVERAGE_DIMENSIONS_INVALID");
ensure(mediaV2.policy.mediaAffectsDecision === false && mediaV2.policy.unprovenNotPublished === true, "MEDIA_DECISION_BOUNDARY_INVALID");
ensure(mediaV2.members.every((member) => member.disposition === "OWNED_REPRESENTATIVE"
  && member.governance?.rightsBasis === "OWNED_OR_COMMISSIONED"
  && member.governance?.identity?.scope === "CATEGORY_REPRESENTATIVE"
  && member.governance?.requiredDisclosure
  && member.localAsset?.byteSha256 === mediaManifest.ownedAssets[0].sha256
  && member.remoteAssetUrl === null
  && member.blocker === null), "MEDIA_FAIL_CLOSED_FALLBACK_INVALID");
ensure(mediaCoverage.after.ownedRepresentative === 97
  && mediaCoverage.after.discoveredRightsUnproven === 0
  && mediaCoverage.after.identityUnproven === 0
  && mediaCoverage.after.unavailable === 0, "MEDIA_COVERAGE_NOT_COMPLETE");

const originalBaseline = appliancesManifest.activePointerHashesBefore;
const mismatches = Object.entries(originalBaseline).filter(([relative, expected]) => currentPointerHashes[relative] !== expected);
ensure(mismatches.length === 1 && mismatches[0][0] === "data/production/appliances/media/active.json", "PRIOR_MISMATCH_SET_CHANGED");
ensure(mismatches[0][1] === authorization.acceptedConcurrentChange.predecessorPointerSha256
  && currentPointerHashes[mismatches[0][0]] === authorization.acceptedConcurrentChange.currentPointerSha256, "MEDIA_RECONCILIATION_HASH_MISMATCH");
ensure(preflight.currentPreflight.unreconciledMismatchCount === 0 && preflight.currentPreflight.reconciledConcurrentChangeCount === 1, "PREFLIGHT_RECONCILIATION_INVALID");

for (const { path: target, preimage } of authorization.dependentPointerWriteSet) {
  const actual = existsSync(absolute(target)) ? sha(bytes(target)) : "ABSENT";
  ensure(actual === preimage, `ACTIVATION_TARGET_PREIMAGE_CHANGED:${target}`);
}

const result = {
  authorizationPackageId: packageId,
  status: "PASS_READY_FOR_APPROVAL",
  activationPerformed: false,
  checks: {
    currentPointers: 36,
    priorMismatchCount: 1,
    reconciledMismatchCount: 1,
    unreconciledMismatchCount: 0,
    candidateDigests: "PASS",
    candidateBytesUnchanged: true,
    mediaReleaseDigest: "PASS",
    mediaMembershipAndIdentity: "PASS",
    mediaCoverage: { products: 97, categories: 24, failClosedFallbacks: 97 },
    presentationOnly: true,
    dependentWriteSet: 7,
    activationTargetPreimages: "PASS",
  },
};
console.log(JSON.stringify(result, null, 2));
