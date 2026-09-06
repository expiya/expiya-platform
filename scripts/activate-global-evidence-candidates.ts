import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { finalizeRelease, sha256 as manualSha256, stableJson as manualJson, validateRelease, type GovernedManual, type GovernedManualRelease, type L9Knowledge } from "../features/appliances/manuals/governedManuals";
import { sha256 as compactSha256, stableJson as compactJson } from "../features/appliances/globalEvidence";

const ROOT = process.cwd();
const WORK_UNIT = "WU-XPY-GLOBAL-EVIDENCE-AUTHORIZED-ACTIVATION-02";
const REPAIR_WORK_UNIT = "WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01";
const REAUTHORIZATION_WORK_UNIT = "WU-XPY-GLOBAL-EVIDENCE-ACTIVATION-REAUTHORIZATION-01";
const AUTHORIZATION_PACKAGE_ID = "GLOBAL-EVIDENCE-AUTH-20260905-02";
const AUTHORIZATION_MANIFEST_SHA256 = "sha256:b415cc3cd7eadc728cd9587b18723a91295dc0d3c640081ba6700e97632c817e";
const AUTHORIZATION_DIR = `data/governance/global-evidence/activation-authorizations/${AUTHORIZATION_PACKAGE_ID}`;
const EVENT_ID = "GLOBAL-EVIDENCE-ACT-20260905-03";
const CARS_ID = "v1.0.0-catalog-v0.55.4-2026-09-05";
const APPLIANCES_ID = "APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1";
const APPLIANCES_MANUAL_ID = "APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.3";
const CARS_RELEASE_DIGEST = "sha256:316d2238c40b0330fe1f4d722c8121ab1e429cca93bc3fd9899a929c9a9f67ed";
const APPLIANCES_RELEASE_DIGEST = "sha256:d10f0773b7503d7125255ccf0f53b45257ff539a235b7328da351f34ebe637df";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const EQUIPMENT_ID = "v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04";
const PYTHON = process.env.CODEX_PYTHON_PATH ?? "/Users/serdarakgul/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const carsCandidateDir = `data/production/cars-global-evidence/release-candidates/${CARS_ID}`;
const appliancesCandidateDir = `data/production/appliances/global-evidence/release-candidates/${APPLIANCES_ID}`;
const carsReleaseDir = `data/production/cars-global-evidence/releases/${CARS_ID}`;
const appliancesReleaseDir = `data/production/appliances/global-evidence/releases/${APPLIANCES_ID}`;
const manualParentDir = "data/production/appliances/manuals/releases/APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2";
const manualReleaseDir = `data/production/appliances/manuals/releases/${APPLIANCES_MANUAL_ID}`;
const eventDir = `data/governance/global-evidence/activation-events/${EVENT_ID}`;

const targetPaths = {
  carsGlobalPointer: "data/production/cars-global-evidence/active.json",
  carsGlobalModule: "data/production/cars-global-evidence/activeCarsGlobalEvidence.generated.ts",
  equipmentPointer: "data/production/equipment-evidence/active.json",
  equipmentModule: "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts",
  appliancesGlobalPointer: "data/production/appliances/global-evidence/active.json",
  appliancesGlobalModule: "data/production/appliances/global-evidence/activeGlobalEvidence.generated.ts",
  appliancesManualPointer: "data/production/appliances/manuals/active.json",
} as const;

// Governed artifact schemas are independently validated before their dynamic JSON is consumed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;
const abs = (relative: string) => path.join(ROOT, relative);
const sha = (value: string | Uint8Array) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const pretty = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const canonical = (value: unknown): unknown => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]))
    : value;
const canonicalPretty = (value: unknown) => pretty(canonical(value));
const loadRaw = (relative: string) => readFile(abs(relative));
const loadText = (relative: string) => readFile(abs(relative), "utf8");
const loadJson = async (relative: string) => JSON.parse(await loadText(relative)) as Json;
const exists = async (relative: string) => stat(abs(relative)).then(() => true, () => false);
function ensure(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

async function verifyAuthorizationPackage(): Promise<{ authorization: Json; preflight: Json }> {
  const manifestRaw = await loadRaw(`${AUTHORIZATION_DIR}/manifest.json`);
  ensure(sha(manifestRaw) === AUTHORIZATION_MANIFEST_SHA256, "AUTHORIZATION_MANIFEST_HASH_MISMATCH");
  const manifest = JSON.parse(manifestRaw.toString("utf8")) as Json;
  ensure(manifest.authorizationPackageId === AUTHORIZATION_PACKAGE_ID, "AUTHORIZATION_PACKAGE_ID_MISMATCH");
  for (const file of manifest.files as Json[]) {
    ensure(sha(await loadRaw(`${AUTHORIZATION_DIR}/${file.path}`)) === file.sha256, `AUTHORIZATION_FILE_HASH_MISMATCH:${file.path}`);
  }
  ensure(sha(await loadRaw(manifest.verificationScript.path)) === manifest.verificationScript.sha256, "AUTHORIZATION_VERIFIER_HASH_MISMATCH");
  const authorization = await loadJson(`${AUTHORIZATION_DIR}/authorization.json`);
  const preflight = await loadJson(`${AUTHORIZATION_DIR}/preflight.json`);
  ensure(authorization.authorizationPackageId === AUTHORIZATION_PACKAGE_ID && authorization.status === "READY_FOR_APPROVAL", "AUTHORIZATION_NOT_READY");
  ensure(authorization.activationPerformed === false && preflight.activationPerformed === false, "AUTHORIZATION_ALREADY_PERFORMED");
  ensure(authorization.candidates.cars.releaseDigest === CARS_RELEASE_DIGEST, "AUTHORIZED_CARS_DIGEST_MISMATCH");
  ensure(authorization.candidates.appliances.releaseDigest === APPLIANCES_RELEASE_DIGEST, "AUTHORIZED_APPLIANCES_DIGEST_MISMATCH");
  const authorizedTargets = (authorization.dependentPointerWriteSet as Json[]).map((entry) => entry.path);
  ensure(authorizedTargets.length === 7 && JSON.stringify(authorizedTargets) === JSON.stringify(Object.values(targetPaths)), "AUTHORIZED_WRITE_SET_MISMATCH");
  ensure(!authorizedTargets.includes("data/production/appliances/media/active.json"), "MEDIA_POINTER_WRITE_AUTHORIZED_UNEXPECTEDLY");
  execFileSync(process.execPath, [manifest.verificationScript.path], { cwd: ROOT, stdio: "pipe" });
  return { authorization, preflight };
}

async function verifyCandidateDigests(): Promise<{ carsManifest: Json; appliancesManifest: Json; carsCandidate: Json; appliancesCandidate: Json }> {
  const ledger = await loadJson("docs/audits/WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01.execution-ledger.json");
  ensure(ledger.verdict === "READY_FOR_APPROVAL" && ledger.activationPerformed === false, "REPAIR_LEDGER_NOT_READY");
  ensure(ledger.candidates?.cars?.candidateId === CARS_ID && ledger.candidates.cars.releaseDigest === CARS_RELEASE_DIGEST, "CARS_LEDGER_APPROVAL_MISMATCH");
  ensure(ledger.candidates?.appliances?.candidateId === APPLIANCES_ID && ledger.candidates.appliances.releaseDigest === APPLIANCES_RELEASE_DIGEST, "APPLIANCES_LEDGER_APPROVAL_MISMATCH");

  const [carsManifestRaw, appliancesManifestRaw, carsCandidateRaw, appliancesCandidateRaw] = await Promise.all([
    loadText(`${carsCandidateDir}/manifest.json`), loadText(`${appliancesCandidateDir}/manifest.json`),
    loadText(`${carsCandidateDir}/candidate.json`), loadText(`${appliancesCandidateDir}/candidate.json`),
  ]);
  const carsManifest = JSON.parse(carsManifestRaw) as Json;
  const appliancesManifest = JSON.parse(appliancesManifestRaw) as Json;
  const carsCandidate = JSON.parse(carsCandidateRaw) as Json;
  const appliancesCandidate = JSON.parse(appliancesCandidateRaw) as Json;
  ensure(sha(carsManifestRaw) === ledger.candidates.cars.manifestFileSha256, "CARS_MANIFEST_BYTES_MISMATCH");
  ensure(sha(appliancesManifestRaw) === ledger.candidates.appliances.manifestFileSha256, "APPLIANCES_MANIFEST_BYTES_MISMATCH");
  ensure(sha(carsCandidateRaw) === ledger.candidates.cars.candidateFileSha256, "CARS_CANDIDATE_BYTES_MISMATCH");
  ensure(`sha256:${compactSha256(compactJson(appliancesCandidate))}` === ledger.candidates.appliances.candidatePayloadSha256, "APPLIANCES_CANDIDATE_PAYLOAD_MISMATCH");
  ensure(carsManifest.releaseDigest === CARS_RELEASE_DIGEST && carsManifest.releaseVersion === CARS_ID, "CARS_RELEASE_DIGEST_MISMATCH");
  ensure(appliancesManifest.releaseDigest === APPLIANCES_RELEASE_DIGEST && appliancesManifest.candidateId === APPLIANCES_ID, "APPLIANCES_RELEASE_DIGEST_MISMATCH");
  ensure(carsManifest.releaseDigest === sha(canonicalPretty({ releaseVersion: CARS_ID, files: carsManifest.files })), "CARS_COMPOSITE_RECOMPUTE_FAILED");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/verify-active-equipment-evidence.ts", "--release", EQUIPMENT_ID], { cwd: ROOT, stdio: "pipe" });

  const research = await Promise.all([
    loadText("data/research/appliances-global-evidence-01/research-ledger.json"),
    loadText("data/research/appliances-global-evidence-01/source-registry.json"),
    loadText("data/research/appliances-global-evidence-01/unresolved-ledger.json"),
    loadText("data/research/appliances-global-evidence-01/manual-exclusions.json"),
    loadText("data/research/appliances-global-evidence-01/admitted-manuals.json"),
  ]);
  const [coverage, dryRun, completion] = await Promise.all([
    loadText(`${appliancesCandidateDir}/coverage-report.json`),
    loadText(`${appliancesCandidateDir}/decision-neutrality-dry-run.json`),
    loadText(`${appliancesCandidateDir}/completion-report.md`),
  ]);
  const appliancesComposite = {
    candidate: appliancesCandidateRaw.trim(), coverage: coverage.trim(), ledger: research[0].trim(), sourceRegistry: research[1].trim(),
    unresolved: research[2].trim(), dryRun: dryRun.trim(), completionReport: completion.trim(), manualExclusions: research[3].trim(),
    admittedManuals: research[4].trim(), manualByteBindings: appliancesManifest.manualByteBindings,
    pointerHashesBefore: appliancesManifest.activePointerHashesBefore, pointerHashesAfter: appliancesManifest.activePointerHashesAfter,
  };
  ensure(`sha256:${compactSha256(compactJson(appliancesComposite))}` === APPLIANCES_RELEASE_DIGEST, "APPLIANCES_COMPOSITE_RECOMPUTE_FAILED");
  return { carsManifest, appliancesManifest, carsCandidate, appliancesCandidate };
}

async function verifyPreActivationPointers(preflight: Json, carsManifest: Json): Promise<Record<string, string>> {
  const expected = preflight.currentActivePointerHashes as Record<string, string>;
  const hashes: Record<string, string> = {};
  for (const [relative, digest] of Object.entries(expected)) {
    hashes[relative] = sha(await loadRaw(relative));
    ensure(hashes[relative] === digest, `PRE_ACTIVATION_POINTER_MISMATCH:${relative}`);
  }
  ensure(Object.keys(hashes).length === 36, "PRE_ACTIVATION_POINTER_COUNT_NOT_36");
  ensure(carsManifest.metrics.exactVerifiedCatalogFields.after === 11154, "CARS_EXACT_FACT_COUNT_MISMATCH");
  return hashes;
}

async function verifyCatalogIdentity(appliancesCandidate: Json): Promise<void> {
  const catalog = await loadJson("data/production/catalog/releases/v0.55.4/catalog.json");
  const carsLedger = await loadJson(`${carsCandidateDir}/research-ledger.json`);
  const carsIds = catalog.records.map((row: Json) => row.variant.id).sort();
  const ledgerIds = carsLedger.rows.map((row: Json) => row.exactVariantId).sort();
  ensure(carsIds.length === 549 && new Set(carsIds).size === 549 && JSON.stringify(carsIds) === JSON.stringify(ledgerIds), "CARS_IDENTITY_MEMBERSHIP_MISMATCH");
  ensure(appliancesCandidate.members.length === 97 && new Set(appliancesCandidate.members.map((row: Json) => row.productId)).size === 97, "APPLIANCES_IDENTITY_MEMBERSHIP_MISMATCH");
  ensure(new Set(appliancesCandidate.members.map((row: Json) => row.categoryId)).size === 24, "APPLIANCES_CATEGORY_COUNT_MISMATCH");
  const coverage = await loadJson(`${appliancesCandidateDir}/coverage-report.json`);
  ensure(coverage.after.exactVerified === 1253 && coverage.before.exactVerified === 1253, "APPLIANCES_EXACT_FACT_COUNT_MISMATCH");
  ensure(appliancesCandidate.assertions.length === 60 && appliancesCandidate.dailyLifeInterpretations.length === 60, "APPLIANCES_L6_COUNT_MISMATCH");
  ensure(appliancesCandidate.assertions.every((row: Json) => row.scope === "FAMILY_SCOPED" && row.decisionUse === "EXPLANATION_ONLY"), "APPLIANCES_FAMILY_AUTHORITY_LEAK");
  ensure(appliancesCandidate.dailyLifeInterpretations.every((row: Json) => row.decisionUse === "EXPLANATION_ONLY"), "APPLIANCES_L6_AUTHORITY_LEAK");
  ensure(appliancesCandidate.l9AdvisorKnowledge.length === 7 && appliancesCandidate.l9AdvisorKnowledge.every((row: Json) => row.advisorReadOnly && row.decisionAuthority === "NONE" && row.candidateEffect === "NONE"), "APPLIANCES_L9_AUTHORITY_LEAK");
  ensure(appliancesCandidate.conflicts.some((row: Json) => row.productId === "LG_GC_B569NLLM_TR" && row.disposition === "UNKNOWN_EXCLUDED"), "LG_CONFLICT_NOT_EXCLUDED");
}

const normalized = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9]/gu, "");
const resolveSection = (page: string, preferred: string, fallbacks: readonly string[]) => {
  for (const value of [preferred, preferred.split(" - ")[0], ...fallbacks]) if (value && normalized(page).includes(normalized(value))) return value;
  throw new Error(`MATERIALIZED_MANUAL_LOCATOR_NOT_FOUND:${preferred}`);
};
const extractPdf = (relative: string) => execFileSync(PYTHON, ["-c", "import pdfplumber,sys\nwith pdfplumber.open(sys.argv[1]) as p:\n print('\\f'.join((x.extract_text(x_tolerance=2,y_tolerance=3) or '') for x in p.pages),end='')", abs(relative)], { encoding: "utf8", maxBuffer: 80 * 1024 * 1024 });

async function materializeManualRelease(appliancesCandidate: Json, activatedAt: string): Promise<{ release: GovernedManualRelease; manifestSha256: string }> {
  if (await exists(`${manualReleaseDir}/release.json`)) {
    const releaseRaw = await loadText(`${manualReleaseDir}/release.json`);
    const manifestRaw = await loadText(`${manualReleaseDir}/manifest.json`);
    const coverageRaw = await loadText(`${manualReleaseDir}/coverage.json`);
    const release = JSON.parse(releaseRaw) as GovernedManualRelease;
    const manifest = JSON.parse(manifestRaw) as Json;
    const coverage = JSON.parse(coverageRaw) as Json;
    const manifestSha256 = manualSha256(manifestRaw);
    ensure(release.releaseId === APPLIANCES_MANUAL_ID && release.manuals.length === 17 && release.l9AdvisorKnowledge.length === 16, "EXISTING_MANUAL_RELEASE_CONFLICT");
    ensure(manifest.releaseId === APPLIANCES_MANUAL_ID && manifest.releaseArtifactSha256 === manualSha256(releaseRaw) && manifest.coverageArtifactSha256 === manualSha256(coverageRaw), "EXISTING_MANUAL_MANIFEST_CONFLICT");
    ensure(manifest.sourceCandidate?.candidateId === APPLIANCES_ID && manifest.sourceCandidate?.releaseDigest === APPLIANCES_RELEASE_DIGEST, "EXISTING_MANUAL_SOURCE_CANDIDATE_CONFLICT");
    ensure(coverage.sourceCandidateId === APPLIANCES_ID && coverage.sourceCandidateDigest === APPLIANCES_RELEASE_DIGEST && coverage.after?.manualCount === 17 && coverage.after?.l9EntryCount === 16, "EXISTING_MANUAL_COVERAGE_CONFLICT");
    const byteMap = new Map<string, Uint8Array>();
    const textMap = new Map<string, string>();
    for (const manual of release.manuals) {
      byteMap.set(manual.immutableBytesPath, new Uint8Array(await loadRaw(`${manualReleaseDir}/${manual.immutableBytesPath}`)));
      textMap.set(manual.immutableTextPath, await loadText(`${manualReleaseDir}/${manual.immutableTextPath}`));
    }
    ensure(validateRelease(release, byteMap, textMap).length === 0, "EXISTING_MANUAL_RELEASE_INVALID");
    return { release, manifestSha256 };
  }
  const parent = JSON.parse(await loadText(`${manualParentDir}/release.json`)) as GovernedManualRelease;
  const temporary = await mkdtemp(path.join(os.tmpdir(), "xpy-global-manual-"));
  const staged = path.join(temporary, APPLIANCES_MANUAL_ID);
  await mkdir(path.join(staged, "bytes"), { recursive: true });
  await mkdir(path.join(staged, "text"), { recursive: true });
  for (const manual of parent.manuals) {
    await cp(abs(`${manualParentDir}/${manual.immutableBytesPath}`), path.join(staged, manual.immutableBytesPath));
    await cp(abs(`${manualParentDir}/${manual.immutableTextPath}`), path.join(staged, manual.immutableTextPath));
  }

  const manuals: GovernedManual[] = [...parent.manuals];
  const textByArtifact = new Map<string, string>();
  for (const candidate of appliancesCandidate.manualCandidates as Json[]) {
    const member = parent.members.find((row) => row.productId === candidate.productId);
    ensure(member, `MANUAL_MEMBER_NOT_FOUND:${candidate.productId}`);
    const sourceRelative = candidate.immutableBytesPath as string;
    const bytes = await loadRaw(sourceRelative);
    ensure(sha(bytes) === candidate.artifactSha256 && bytes.length === candidate.byteLength, `MANUAL_SOURCE_BYTES_MISMATCH:${candidate.productId}`);
    const text = extractPdf(sourceRelative);
    const pages = text.split("\f");
    ensure(pages.length === candidate.pageCount, `MANUAL_PAGE_COUNT_MISMATCH:${candidate.productId}`);
    const key = String(candidate.artifactSha256).slice(7, 23);
    const bytesPath = `bytes/${key}.pdf`;
    const textPath = `text/${key}.txt`;
    const identitySection = resolveSection(pages[candidate.identityLocator.page - 1], candidate.identityLocator.section, [candidate.exactProductCode]);
    await writeFile(path.join(staged, bytesPath), bytes);
    await writeFile(path.join(staged, textPath), text, "utf8");
    textByArtifact.set(candidate.artifactSha256, text);
    manuals.push({
      manualId: `APPL-MANUAL-${key.toUpperCase()}`, sourceId: `GLOBAL-EVIDENCE-${key.toUpperCase()}`, sourceUrl: candidate.sourceUrl,
      retrievedAt: candidate.retrievedAt, contentType: "application/pdf", byteLength: bytes.length, artifactSha256: candidate.artifactSha256,
      textArtifactSha256: manualSha256(text), categoryId: member.categoryId, productId: member.productId, exactProductCode: candidate.exactProductCode,
      identityLocator: { page: candidate.identityLocator.page, section: identitySection }, pageCount: pages.length, language: candidate.language,
      immutableBytesPath: bytesPath, immutableTextPath: textPath,
    });
  }

  const knowledge: L9Knowledge[] = [...parent.l9AdvisorKnowledge];
  for (const entry of appliancesCandidate.l9AdvisorKnowledge as Json[]) {
    const manual = manuals.find((row) => row.productId === entry.productId && row.artifactSha256 === entry.manualArtifactSha256);
    ensure(manual, `L9_MANUAL_BINDING_MISSING:${entry.knowledgeId}`);
    const text = textByArtifact.get(manual.artifactSha256) ?? await readFile(path.join(staged, manual.immutableTextPath), "utf8");
    const pages = text.split("\f");
    const section = resolveSection(pages[entry.locator.page - 1], entry.locator.section, [entry.exactProductCode]);
    const member = parent.members.find((row) => row.productId === entry.productId)!;
    const kind = entry.locator.kind === "PROGRAM_BEHAVIOR" ? "USAGE" : entry.locator.kind;
    knowledge.push({ knowledgeId: entry.knowledgeId, manualId: manual.manualId, categoryId: manual.categoryId, productId: manual.productId,
      statement: entry.statement, locator: { page: entry.locator.page, section }, knowledgeKind: kind,
      decisionAuthority: "NONE", candidateEffect: "NONE", professionalInstallationRequired: kind === "INSTALLATION",
      publicSourceDisclosure: `${member.brand === "UNKNOWN" ? entry.exactProductCode : `${member.brand} ${member.model}`} üretici kullanım kılavuzu`,
    });
  }
  manuals.sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.productId.localeCompare(b.productId));
  knowledge.sort((a, b) => a.productId.localeCompare(b.productId) || a.knowledgeId.localeCompare(b.knowledgeId));
  const release = finalizeRelease({ schemaVersion: "appliances-governed-manual-release/v1", releaseId: APPLIANCES_MANUAL_ID, generatedAt: activatedAt,
    lifecycle: "FROZEN_READ_ONLY", authority: "L9_ADVISOR_ONLY", parentPolicy: "IMMUTABLE_NO_OVERWRITE", inventoryDigest: parent.inventoryDigest,
    members: parent.members, manuals, l9AdvisorKnowledge: knowledge, blockers: parent.blockers,
    boundaries: parent.boundaries });
  const byteMap = new Map<string, Uint8Array>();
  const textMap = new Map<string, string>();
  for (const manual of release.manuals) {
    byteMap.set(manual.immutableBytesPath, new Uint8Array(await readFile(path.join(staged, manual.immutableBytesPath))));
    textMap.set(manual.immutableTextPath, await readFile(path.join(staged, manual.immutableTextPath), "utf8"));
  }
  ensure(validateRelease(release, byteMap, textMap).length === 0, "MATERIALIZED_MANUAL_RELEASE_INVALID");
  ensure(release.manuals.length === 17 && release.l9AdvisorKnowledge.length === 16, "MATERIALIZED_MANUAL_COUNTS_INVALID");
  const releaseRaw = manualJson(release);
  const coverageRaw = manualJson({ schemaVersion: "appliances-manual-coverage/v3", releaseId: APPLIANCES_MANUAL_ID,
    before: { releaseId: parent.releaseId, manualCount: 14, l9EntryCount: 9, absentUnits: 213 },
    after: { members: 97, categories: 24, manualCount: 17, l9EntryCount: 16, absentUnits: 207 },
    authority: "L9_ADVISOR_ONLY_NO_P_Y_EFFECT", sourceCandidateId: APPLIANCES_ID, sourceCandidateDigest: APPLIANCES_RELEASE_DIGEST });
  const manifest = { schemaVersion: "appliances-governed-manual-manifest/v2", releaseId: APPLIANCES_MANUAL_ID, lifecycle: "FROZEN_READ_ONLY",
    parentReleaseId: parent.releaseId, parentReleaseDigest: parent.releaseDigest, releaseArtifactSha256: manualSha256(releaseRaw),
    coverageArtifactSha256: manualSha256(coverageRaw), manualArtifacts: manuals.map((row) => ({ manualId: row.manualId, artifactSha256: row.artifactSha256, textArtifactSha256: row.textArtifactSha256 })),
    boundaries: release.boundaries, sourceCandidate: { candidateId: APPLIANCES_ID, releaseDigest: APPLIANCES_RELEASE_DIGEST, workUnitId: WORK_UNIT } };
  const manifestRaw = manualJson(manifest);
  await writeFile(path.join(staged, "release.json"), releaseRaw);
  await writeFile(path.join(staged, "coverage.json"), coverageRaw);
  await writeFile(path.join(staged, "manifest.json"), manifestRaw);
  await mkdir(path.dirname(abs(manualReleaseDir)), { recursive: true });
  await rename(staged, abs(manualReleaseDir));
  await rm(temporary, { recursive: true, force: true });
  return { release, manifestSha256: manualSha256(manifestRaw) };
}

async function materializeApprovedCandidates(): Promise<void> {
  for (const [source, destination] of [[carsCandidateDir, carsReleaseDir], [appliancesCandidateDir, appliancesReleaseDir]] as const) {
    if (!(await exists(destination))) await cp(abs(source), abs(destination), { recursive: true, errorOnExist: true });
    const [sourceManifest, destinationManifest] = await Promise.all([loadRaw(`${source}/manifest.json`), loadRaw(`${destination}/manifest.json`)]);
    ensure(Buffer.from(sourceManifest).equals(destinationManifest), `MATERIALIZED_CANDIDATE_MANIFEST_MISMATCH:${destination}`);
  }
}

async function stageTargets(input: { activatedAt: string; eventId: string; carsManifest: Json; appliancesManifest: Json; manualRelease: GovernedManualRelease; manualManifestSha256: string }): Promise<{ stage: string; targetBytes: Record<string, Buffer> }> {
  const equipmentManifest = await loadJson(`data/production/equipment-evidence/releases/${EQUIPMENT_ID}/manifest.json`);
  ensure(equipmentManifest.payloadSha256 === "sha256:a251a2cdd92d4af1b62ca71bf3cb608f0ae47bce1faf7fe3503922a04ab1b533", "EQUIPMENT_PAYLOAD_APPROVAL_MISMATCH");
  const values: Record<keyof typeof targetPaths, string> = {
    carsGlobalPointer: pretty({ schemaVersion: "xpy-cars-global-evidence-active/v1", state: "ACTIVE_READ_ONLY", releaseId: CARS_ID,
      releaseDigest: CARS_RELEASE_DIGEST, candidateFileSha256: input.carsManifest.files["candidate.json"], manifestSha256: sha(await loadRaw(`${carsReleaseDir}/manifest.json`)),
      compatibleCatalogRelease: "v0.55.4", compatibleCatalogFingerprint: CATALOG_FINGERPRINT, activatedAt: input.activatedAt, activationEventId: input.eventId,
      authority: { familyEvidence: "EXPLANATION_ONLY", exactDailyLife: "EXPLANATION_ONLY", l9: "ADVISOR_READ_ONLY", pYEffect: "NONE" } }),
    carsGlobalModule: `// Generated by ${WORK_UNIT}. Do not edit manually.\nexport { default as activeCarsGlobalEvidence } from "./releases/${CARS_ID}/candidate.json";\nexport { default as activeCarsGlobalEvidenceManifest } from "./releases/${CARS_ID}/manifest.json";\nexport { default as activeCarsGlobalManualIndex } from "./releases/${CARS_ID}/manual-index.json";\nexport { default as activeCarsGlobalDailyLifeApplications } from "./releases/${CARS_ID}/daily-life-exact-applications.json";\nexport const activeCarsGlobalEvidenceRelease = "${CARS_ID}";\nexport const activeCarsGlobalEvidenceDigest = "${CARS_RELEASE_DIGEST}";\n`,
    equipmentPointer: pretty({ state: "ACTIVE", activeEquipmentEvidenceRelease: EQUIPMENT_ID, compatibleCatalogRelease: equipmentManifest.compatibleCatalogRelease,
      compatibleCatalogFingerprint: equipmentManifest.compatibleCatalogFingerprint, payloadSha256: equipmentManifest.payloadSha256, schemaVersion: equipmentManifest.schemaVersion,
      activatedAt: input.activatedAt, activationReference: input.eventId, previousActiveRelease: "v1.5.5-catalog-v0.55.4-2026-08-20", rollbackRelease: "v1.5.5-catalog-v0.55.4-2026-08-20" }),
    equipmentModule: `// Generated. Do not edit.\nexport { default as activeEquipmentEvidencePayload } from "./releases/${EQUIPMENT_ID}/equipment-evidence.json";\nexport { default as activeEquipmentEvidenceManifest } from "./releases/${EQUIPMENT_ID}/manifest.json";\nexport const activeEquipmentEvidenceRelease = "${EQUIPMENT_ID}";\n`,
    appliancesGlobalPointer: pretty({ schemaVersion: "xpy-appliances-global-evidence-active/v1", state: "ACTIVE_READ_ONLY", releaseId: APPLIANCES_ID,
      releaseDigest: APPLIANCES_RELEASE_DIGEST, candidatePayloadSha256: input.appliancesManifest.candidateSha256, manifestSha256: sha(await loadRaw(`${appliancesReleaseDir}/manifest.json`)),
      memberCount: 97, categoryCount: 24, activatedAt: input.activatedAt, activationEventId: input.eventId,
      authority: { familyEvidence: "EXPLANATION_ONLY", l6: "EXPLANATION_ONLY", l9: "ADVISOR_READ_ONLY", pYEffect: "NONE" } }),
    appliancesGlobalModule: `// Generated by ${WORK_UNIT}. Do not edit manually.\nexport { default as activeAppliancesGlobalEvidence } from "./releases/${APPLIANCES_ID}/candidate.json";\nexport { default as activeAppliancesGlobalEvidenceManifest } from "./releases/${APPLIANCES_ID}/manifest.json";\nexport const activeAppliancesGlobalEvidenceRelease = "${APPLIANCES_ID}";\nexport const activeAppliancesGlobalEvidenceDigest = "${APPLIANCES_RELEASE_DIGEST}";\n`,
    appliancesManualPointer: manualJson({ schemaVersion: "appliances-governed-manual-active/v1", releaseId: APPLIANCES_MANUAL_ID,
      releaseDigest: input.manualRelease.releaseDigest, manifestSha256: input.manualManifestSha256, activatedAt: input.activatedAt,
      authority: "L9_ADVISOR_ONLY", next: `activation:${input.eventId};rollback:APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2` }),
  };
  const stage = await mkdtemp(path.join(os.tmpdir(), "xpy-global-activation-"));
  const targetBytes: Record<string, Buffer> = {};
  for (const [key, relative] of Object.entries(targetPaths)) {
    const bytes = Buffer.from(values[key as keyof typeof targetPaths]);
    const stagedPath = path.join(stage, key);
    await writeFile(stagedPath, bytes);
    targetBytes[relative] = bytes;
  }
  return { stage, targetBytes };
}

async function applyTransaction(targetBytes: Record<string, Buffer>, stage: string, before: Record<string, Buffer | null>): Promise<void> {
  const installed: string[] = [];
  try {
    for (const [relative] of Object.entries(targetBytes)) {
      await mkdir(path.dirname(abs(relative)), { recursive: true });
      await rename(path.join(stage, Object.entries(targetPaths).find(([, value]) => value === relative)![0]), abs(relative));
      installed.push(relative);
    }
  } catch (error) {
    for (const relative of installed.reverse()) {
      const bytes = before[relative];
      if (bytes) await writeFile(abs(relative), bytes); else await rm(abs(relative), { force: true });
    }
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

async function restorePreimages(before: Record<string, Buffer | null>): Promise<void> {
  for (const [relative, bytes] of Object.entries(before)) {
    if (bytes) {
      await mkdir(path.dirname(abs(relative)), { recursive: true });
      await writeFile(abs(relative), bytes);
    } else {
      await rm(abs(relative), { force: true });
    }
  }
}

async function runPostActivationGates(baselinePointerHashes: Record<string, string>, manualRelease: GovernedManualRelease): Promise<string[]> {
  const authorizedChanged = new Set<string>([targetPaths.equipmentPointer, targetPaths.appliancesManualPointer]);
  for (const [relative, digest] of Object.entries(baselinePointerHashes)) {
    if (!authorizedChanged.has(relative)) ensure(sha(await loadRaw(relative)) === digest, `UNAUTHORIZED_POINTER_CHANGE:${relative}`);
  }
  const carsPointer = await loadJson(targetPaths.carsGlobalPointer);
  const appliancesPointer = await loadJson(targetPaths.appliancesGlobalPointer);
  const manualPointer = await loadJson(targetPaths.appliancesManualPointer);
  ensure(carsPointer.releaseId === CARS_ID && carsPointer.releaseDigest === CARS_RELEASE_DIGEST, "CARS_ACTIVE_BINDING_INVALID");
  ensure(appliancesPointer.releaseId === APPLIANCES_ID && appliancesPointer.releaseDigest === APPLIANCES_RELEASE_DIGEST, "APPLIANCES_ACTIVE_BINDING_INVALID");
  ensure(manualPointer.releaseId === APPLIANCES_MANUAL_ID && manualPointer.releaseDigest === manualRelease.releaseDigest, "APPLIANCES_MANUAL_ACTIVE_BINDING_INVALID");
  ensure(manualRelease.manuals.length === 17 && manualRelease.l9AdvisorKnowledge.length === 16, "APPLIANCES_MANUAL_POST_COUNTS_INVALID");
  ensure(manualRelease.l9AdvisorKnowledge.every((row) => row.decisionAuthority === "NONE" && row.candidateEffect === "NONE"), "APPLIANCES_MANUAL_POST_AUTHORITY_LEAK");
  ensure(carsPointer.authority.familyEvidence === "EXPLANATION_ONLY" && carsPointer.authority.exactDailyLife === "EXPLANATION_ONLY" && carsPointer.authority.l9 === "ADVISOR_READ_ONLY" && carsPointer.authority.pYEffect === "NONE", "CARS_POST_AUTHORITY_INVALID");
  ensure(appliancesPointer.authority.familyEvidence === "EXPLANATION_ONLY" && appliancesPointer.authority.l6 === "EXPLANATION_ONLY" && appliancesPointer.authority.l9 === "ADVISOR_READ_ONLY" && appliancesPointer.authority.pYEffect === "NONE", "APPLIANCES_POST_AUTHORITY_INVALID");
  const checks: string[] = [];
  execFileSync(process.execPath, ["--import", "tsx", "scripts/verify-active-equipment-evidence.ts"], { cwd: ROOT, stdio: "pipe" });
  checks.push("active-equipment-evidence:PASS");
  execFileSync("npx", ["tsc", "-p", "tsconfig.global-evidence-activation.json", "--noEmit", "--pretty", "false"], { cwd: ROOT, stdio: "pipe" });
  checks.push("typescript-scoped:PASS");
  execFileSync("npx", ["eslint", "scripts/activate-global-evidence-candidates.ts", "scripts/verify-active-equipment-evidence.ts"], { cwd: ROOT, stdio: "pipe" });
  checks.push("eslint-scoped:PASS");
  execFileSync("npx", ["vitest", "run", "features/appliances/manuals/governedManuals.test.ts", "features/appliances/stageTwo/handoff.test.ts", "features/xpy/catalog/revision.test.ts", "features/vehicle-data/equipmentEvidenceLayer.test.ts"], { cwd: ROOT, stdio: "pipe" });
  checks.push("focused-tests-governed-manual-stale-handoff-catalog-equipment:PASS");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/dry-run-xpy-catalog-revision.ts", "--domain", "cars", "--release", "0.55.4"], { cwd: ROOT, stdio: "pipe" });
  checks.push("cars-revision-dry-run:PASS");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/dry-run-xpy-catalog-revision.ts", "--domain", "appliances", "--all-active"], { cwd: ROOT, stdio: "pipe" });
  checks.push("appliances-revision-dry-run:PASS");
  execFileSync("git", ["diff", "--check", "--", ...Object.values(targetPaths), "scripts/activate-global-evidence-candidates.ts"], { cwd: ROOT, stdio: "pipe" });
  checks.push("focused-diff-check:PASS");
  return checks;
}

async function main(): Promise<void> {
  const priorResult = await exists(`${eventDir}/activation-result.json`) ? await loadJson(`${eventDir}/activation-result.json`) : undefined;
  if (priorResult?.status === "ACTIVATED_AND_POST_VALIDATED") { console.log(pretty(priorResult)); return; }
  ensure(!(await exists(`${eventDir}/activation-failure-result.json`)), "AUTHORIZATION_SPENT_BY_FAILED_ACTIVATION_REQUIRES_SUPERSEDING_PACKAGE");
  const { authorization, preflight } = await verifyAuthorizationPackage();
  const { carsManifest, appliancesManifest, appliancesCandidate } = await verifyCandidateDigests();
  const baselinePointerHashes = await verifyPreActivationPointers(preflight, carsManifest);
  await verifyCatalogIdentity(appliancesCandidate);
  const activatedAt = new Date().toISOString();
  await materializeApprovedCandidates();
  const manual = await materializeManualRelease(appliancesCandidate, activatedAt);

  // Recompute the complete authorization-bound state after materialization and immediately
  // before checkpointing/staging the governed pointer transaction.
  const immediate = await verifyAuthorizationPackage();
  const immediateCandidates = await verifyCandidateDigests();
  const immediatePointerHashes = await verifyPreActivationPointers(immediate.preflight, immediateCandidates.carsManifest);
  ensure(JSON.stringify(immediatePointerHashes) === JSON.stringify(baselinePointerHashes), "PRE_WRITE_POINTER_STATE_CHANGED");
  await verifyCatalogIdentity(immediateCandidates.appliancesCandidate);

  const before: Record<string, Buffer | null> = {};
  for (const relative of Object.values(targetPaths)) before[relative] = await exists(relative) ? Buffer.from(await loadRaw(relative)) : null;
  for (const { path: relative, preimage } of authorization.dependentPointerWriteSet as Json[]) {
    const actual = before[relative] ? sha(before[relative]!) : "ABSENT";
    ensure(actual === preimage, `IMMEDIATE_TARGET_PREIMAGE_MISMATCH:${relative}`);
  }
  await mkdir(abs(`${eventDir}/rollback`), { recursive: true });
  for (const [relative, bytes] of Object.entries(before)) if (bytes) {
    const checkpointPath = abs(`${eventDir}/rollback/${relative}`);
    await mkdir(path.dirname(checkpointPath), { recursive: true });
    await writeFile(checkpointPath, bytes, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  }
  const beforeTargetHashes = Object.fromEntries(Object.entries(before).map(([relative, bytes]) => [relative, bytes ? sha(bytes) : "ABSENT"]));
  await writeFile(abs(`${eventDir}/rollback/preimages.json`), pretty({ schemaVersion: "xpy-global-evidence-rollback-checkpoint/v1", targets: beforeTargetHashes,
    presentBytesRoot: `${eventDir}/rollback`, absentTargets: Object.entries(beforeTargetHashes).filter(([, digest]) => digest === "ABSENT").map(([relative]) => relative), mediaPointerIncluded: false }), { flag: "wx" });
  const authorizationStatement = authorization.approvalStatement as string;
  const userApprovalReceipt = `I approve authorization package ${AUTHORIZATION_PACKAGE_ID} whose manifest SHA-256 is ${AUTHORIZATION_MANIFEST_SHA256}.`;
  const event = { schemaVersion: "xpy-global-evidence-activation-event/v2", activationEventId: EVENT_ID, workUnitId: WORK_UNIT, repairedCandidateWorkUnitId: REPAIR_WORK_UNIT,
    reauthorizationWorkUnitId: REAUTHORIZATION_WORK_UNIT, authorizationPackage: { authorizationPackageId: AUTHORIZATION_PACKAGE_ID, manifestSha256: AUTHORIZATION_MANIFEST_SHA256 },
    priorPrewriteFailedAttempt: "GLOBAL-EVIDENCE-ACT-20260905-02", activatedAt, actor: { authority: "EXPLICIT_USER_APPROVAL", source: "CURRENT_CODEX_THREAD" }, authorizationStatementSha256: sha(authorizationStatement),
    userApprovalReceiptSha256: sha(`${userApprovalReceipt}\n`),
    approvedCandidates: { cars: { candidateId: CARS_ID, releaseDigest: CARS_RELEASE_DIGEST }, appliances: { candidateId: APPLIANCES_ID, releaseDigest: APPLIANCES_RELEASE_DIGEST } },
    catalog: { carsMembers: 549, carsExactFacts: 11154, appliancesMembers: 97, appliancesCategories: 24, appliancesExactFacts: 1253, fingerprint: CATALOG_FINGERPRINT },
    beforePointerHashes: baselinePointerHashes, beforeTargetHashes, transaction: "STAGE_VALIDATE_RENAME_WITH_EXACT_PREIMAGE_ROLLBACK", appendOnly: true };
  await writeFile(abs(`${eventDir}/activation-event.json`), pretty(event), { flag: "wx" });
  await writeFile(abs(`${eventDir}/owner-authorization-statement.txt`), `${authorizationStatement}\n`, { flag: "wx" });
  await writeFile(abs(`${eventDir}/user-approval-receipt.txt`), `${userApprovalReceipt}\n`, { flag: "wx" });
  const staged = await stageTargets({ activatedAt, eventId: EVENT_ID, carsManifest, appliancesManifest, manualRelease: manual.release, manualManifestSha256: manual.manifestSha256 });

  try {
    await applyTransaction(staged.targetBytes, staged.stage, before);
    const postValidation = await runPostActivationGates(baselinePointerHashes, manual.release);
    const afterTargetHashes = Object.fromEntries(await Promise.all(Object.values(targetPaths).map(async (relative) => [relative, sha(await loadRaw(relative))])));
    const result = { schemaVersion: "xpy-global-evidence-activation-result/v1", status: "ACTIVATED_AND_POST_VALIDATED", workUnitId: WORK_UNIT,
      activationEventId: EVENT_ID, activatedAt, active: { cars: { releaseId: CARS_ID, releaseDigest: CARS_RELEASE_DIGEST, equipmentReleaseId: EQUIPMENT_ID },
        appliances: { releaseId: APPLIANCES_ID, releaseDigest: APPLIANCES_RELEASE_DIGEST, manualReleaseId: APPLIANCES_MANUAL_ID, manualReleaseDigest: manual.release.releaseDigest } },
      metrics: { cars: { members: 549, exactFacts: 11154, equipmentAssertions: 126, equipmentCoveredVariants: 10, verifiedEquipmentVariants: 8, l9Variants: 3, exactL6Applications: 20 },
        appliances: { members: 97, categories: 24, exactFacts: 1253, familyAssertions: 60, l6Interpretations: 60, manuals: 17, l9Records: 16, absentUnits: 207 } },
      authority: { familyScoped: "EXPLANATION_ONLY", l9: "ADVISOR_READ_ONLY", pYEffect: "NONE", lgConflict: "UNKNOWN_EXCLUDED" },
      beforePointerHashes: baselinePointerHashes, beforeTargetHashes, afterTargetHashes,
      postValidation, mediaPointerSha256: sha(await loadRaw("data/production/appliances/media/active.json")),
      rollback: { ready: true, exactPreimagesPath: `${eventDir}/rollback`, checkpointPath: `${eventDir}/rollback/preimages.json`, predecessorEquipmentRelease: "v1.5.5-catalog-v0.55.4-2026-08-20", predecessorManualRelease: "APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2" },
      prohibitedActions: { deployment: false, databaseMigration: false, databaseWrite: false, productPolicyChange: false, externalProductionService: false, newResearch: false } };
    await writeFile(abs(`${eventDir}/activation-result.json`), pretty(result), { flag: "wx" });
    console.log(pretty(result));
  } catch (error) {
    await restorePreimages(before);
    const verifiedRestoration = Object.fromEntries(await Promise.all(Object.entries(before).map(async ([relative, bytes]) => {
      const actual = await exists(relative) ? sha(await loadRaw(relative)) : "ABSENT";
      const expected = bytes ? sha(bytes) : "ABSENT";
      ensure(actual === expected, `ROLLBACK_RESTORATION_FAILED:${relative}`);
      return [relative, actual];
    })));
    const rollbackResult = { schemaVersion: "xpy-global-evidence-rollback-result/v1", status: "ROLLED_BACK", activationEventId: EVENT_ID,
      reason: error instanceof Error ? error.message : String(error), restoredAt: new Date().toISOString(), restorationVerified: true, restoredHashes: verifiedRestoration };
    await writeFile(abs(`${eventDir}/rollback-result.json`), pretty(rollbackResult), { flag: "wx" }).catch(() => undefined);
    throw error;
  }
}

void main().catch((error: unknown) => {
  console.error(JSON.stringify({ status: "FAILED_CLOSED", workUnitId: WORK_UNIT, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
