import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const carsDir = path.join(root, "data/production/cars-global-evidence/release-candidates/v1.0.0-catalog-v0.55.4-2026-09-05");
const appliancesDir = path.join(root, "data/production/appliances/global-evidence/release-candidates/APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1");
const researchDir = path.join(root, "data/research/appliances-global-evidence-01");
const sha = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const prettyJson = (value) => `${JSON.stringify(canonical(value), null, 2)}\n`;
const load = async (base, name) => JSON.parse(await readFile(path.join(base, name), "utf8"));

function evidenceFields(value, rows = []) {
  if (!value || typeof value !== "object") return rows;
  if (Object.hasOwn(value, "value") && Array.isArray(value.provenance)) rows.push(value);
  for (const child of Object.values(value)) evidenceFields(child, rows);
  return rows;
}

const normalize = (value) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0131/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
const overlaps = (left, right) => left.page === right.page && (normalize(left.section).includes(normalize(right.section)) || normalize(right.section).includes(normalize(left.section)));

async function verifyCars() {
  const [catalog, ledger, equipmentBefore, equipmentAfter, dailyLife, manuals, dryRun, checksums, manifest] = await Promise.all([
    load(path.join(root, "data/production/catalog/releases/v0.55.4"), "catalog.json"), load(carsDir, "research-ledger.json"),
    load(path.join(root, "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20"), "equipment-evidence.json"),
    load(path.join(root, "data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04"), "equipment-evidence.json"),
    load(carsDir, "daily-life-exact-applications.json"), load(carsDir, "manual-index.json"), load(carsDir, "dry-run-validation.json"), load(carsDir, "checksums.json"), load(carsDir, "manifest.json"),
  ]);
  const catalogIds = catalog.records.map((record) => record.variant.id).sort();
  const ledgerIds = ledger.rows.map((row) => row.exactVariantId).sort();
  const equipmentIds = (release) => new Set([...release.verifiedAssertions, ...release.reviewedAssociations].map((entry) => entry.exactVariantId));
  const fileDigestsValid = (await Promise.all(Object.entries(checksums.files).map(async ([name, expected]) => sha(await readFile(path.join(carsDir, name))) === expected))).every(Boolean);
  const pointerHashesValid = (await Promise.all(Object.entries(dryRun.activePointerHashesAfter).map(async ([name, expected]) => sha(await readFile(path.join(root, name))) === expected))).every(Boolean);
  const expectedLocators = new Map([
    ["OM-TR-OWNER-99CA516FD63C60027D22", { physicalPdfPage: 118, sectionHeading: "Adaptif Hız Sabitleme Sistemi (AHSS)" }],
    ["OM-TR-OWNER-6EEAE89B6D0F883D6DE1", { physicalPdfPage: 134, sectionHeading: "Kör Nokta Destek Sistemi" }],
  ]);
  const locatorChecks = [...expectedLocators].every(([decisionId, expected]) => {
    const artifact = manuals.artifacts.find((item) => item.reviewedDecisionIds.includes(decisionId));
    const locator = artifact?.locators[artifact.reviewedDecisionIds.indexOf(decisionId)];
    const projection = dailyLife.applications.find((item) => item.manualEvidence?.decisionId === decisionId)?.manualEvidence;
    return locator?.physicalPdfPage === expected.physicalPdfPage && locator?.sectionHeading === expected.sectionHeading && projection?.physicalPdfPage === expected.physicalPdfPage && projection?.sectionHeading === expected.sectionHeading;
  });
  const checks = {
    membership: catalogIds.length === 549 && new Set(catalogIds).size === 549 && JSON.stringify(catalogIds) === JSON.stringify(ledgerIds),
    exactTechnicalFields: catalog.records.flatMap((record) => evidenceFields(record.variant)).length === 11154,
    equipmentAssertions: equipmentBefore.verifiedAssertions.length === 112 && equipmentAfter.verifiedAssertions.length === 126,
    equipmentCoveredVariants: equipmentIds(equipmentBefore).size === 6 && equipmentIds(equipmentAfter).size === 10,
    dailyLife: dailyLife.applications.length === 20 && new Set(dailyLife.applications.map((item) => item.exactVariantId)).size === 5,
    manualBytes: manuals.artifacts.length === 3 && (await Promise.all(manuals.artifacts.map(async (item) => sha(await readFile(path.join(carsDir, item.relativePath))) === item.actualSha256))).every(Boolean),
    allTenLocatorsPresent: manuals.artifacts.reduce((sum, item) => sum + item.locators.length, 0) === 10,
    repairedLocatorsProjected: locatorChecks,
    authorityIsolation: dailyLife.applications.every((item) => item.decisionUse === "NONE" && item.directCandidateEffect === "NONE"),
    fileDigests: fileDigestsValid,
    releaseDigest: manifest.releaseDigest === sha(prettyJson({ releaseVersion: manifest.releaseVersion, files: manifest.files })),
    activePointers: pointerHashesValid && JSON.stringify(dryRun.activePointerHashesBefore) === JSON.stringify(dryRun.activePointerHashesAfter),
  };
  return { status: Object.values(checks).every(Boolean) ? "PASS" : "FAIL", checks };
}

async function appliancesInventory() {
  const rows = [];
  const base = path.join(root, "data/production/appliances");
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let pointer;
    try { pointer = JSON.parse(await readFile(path.join(base, entry.name, "active.json"), "utf8")); } catch { continue; }
    if (!pointer.releaseVersion?.startsWith("APPLIANCES-")) continue;
    const releaseDir = path.join(base, entry.name, "releases", pointer.releaseVersion);
    let artifact;
    try { artifact = JSON.parse(await readFile(path.join(releaseDir, "domain-pack.json"), "utf8")); } catch { artifact = JSON.parse(await readFile(path.join(releaseDir, "catalog.json"), "utf8")); }
    for (const product of artifact.products) {
      const washingMachine = entry.name === "washing-machines";
      const exact = washingMachine
        ? artifact.technicalFacts.filter((item) => item.productId === product.productId && item.factStatus === "VERIFIED").length + artifact.capabilityFacts.filter((item) => item.productId === product.productId && ["PRESENT", "ABSENT"].includes(item.status)).length
        : [...Object.values(product.technicalFacts ?? {}), ...Object.values(product.capabilities ?? {})].filter((value) => value !== null).length;
      const absent = washingMachine ? 0 : [...Object.values(product.technicalFacts ?? {}), ...Object.values(product.capabilities ?? {})].filter((value) => value === null).length;
      rows.push({ productId: product.productId, exact, absent });
    }
  }
  return rows;
}

async function verifyAppliances() {
  const [candidate, coverage, unresolved, admitted, activeManualRelease, manifest, dryRun, rows] = await Promise.all([
    load(appliancesDir, "candidate.json"), load(appliancesDir, "coverage-report.json"), load(researchDir, "unresolved-ledger.json"), load(researchDir, "admitted-manuals.json"),
    load(path.join(root, "data/production/appliances/manuals/releases/APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v0.2"), "release.json"), load(appliancesDir, "manifest.json"), load(appliancesDir, "decision-neutrality-dry-run.json"), appliancesInventory(),
  ]);
  const activeManualKeys = new Set(activeManualRelease.manuals.map((item) => `${item.productId}|${item.artifactSha256}`));
  const activeManualProducts = new Set(activeManualRelease.manuals.map((item) => item.productId));
  const newManuals = admitted.filter((item) => !activeManualKeys.has(`${item.productId}|${item.artifactSha256}`));
  const newL9 = admitted.flatMap((manual) => manual.knowledgeLocators.map((locator) => ({ productId: manual.productId, locator }))).filter((entry) => !activeManualRelease.l9AdvisorKnowledge.some((active) => active.productId === entry.productId && overlaps(active.locator, entry.locator)));
  const manualProducts = new Set([...activeManualRelease.manuals.map((item) => item.productId), ...newManuals.map((item) => item.productId)]);
  const activeL9Products = new Set(activeManualRelease.l9AdvisorKnowledge.map((item) => item.productId));
  const l9Products = new Set([...activeL9Products, ...newL9.map((item) => item.productId)]);
  const beforeAbsent = rows.reduce((sum, row) => sum + row.absent, 0) + rows.filter((row) => !activeManualProducts.has(row.productId)).length + rows.filter((row) => !activeL9Products.has(row.productId)).length;
  const afterAbsent = rows.reduce((sum, row) => sum + row.absent, 0) + rows.filter((row) => !manualProducts.has(row.productId)).length + rows.filter((row) => !l9Products.has(row.productId)).length;
  const admittedIds = new Set(admitted.map((item) => item.productId));
  const checks = {
    membership: rows.length === 97 && new Set(rows.map((row) => row.productId)).size === 97,
    exactAssertions: rows.reduce((sum, row) => sum + row.exact, 0) === 1253,
    familyAndL6: candidate.assertions.length === 60 && candidate.dailyLifeInterpretations.length === 60 && candidate.assertions.every((item) => item.scope === "FAMILY_SCOPED" && item.decisionUse === "EXPLANATION_ONLY"),
    uniqueManuals: activeManualRelease.manuals.length === 14 && newManuals.length === 3 && coverage.after.manuals === 17,
    nonDuplicateL9: activeManualRelease.l9AdvisorKnowledge.length === 9 && newL9.length === 7 && candidate.l9AdvisorKnowledge.length === 7 && coverage.after.l9Entries === 16,
    absentUnits: beforeAbsent === 213 && afterAbsent === 207 && coverage.after.absent === 207,
    unresolvedExcludesManuals: unresolved.rows.every((row) => !admittedIds.has(row.productId)),
    lgUnknownExcluded: candidate.conflicts.some((item) => item.productId === "LG_GC_B569NLLM_TR" && item.disposition === "UNKNOWN_EXCLUDED"),
    authorityIsolation: candidate.l9AdvisorKnowledge.every((item) => item.advisorReadOnly && item.decisionAuthority === "NONE" && item.candidateEffect === "NONE"),
    manualBytes: (await Promise.all(manifest.manualByteBindings.map(async (item) => sha(await readFile(path.join(root, item.path))) === item.sha256))).every(Boolean),
    activePointers: JSON.stringify(dryRun.activePointerHashesBefore) === JSON.stringify(dryRun.activePointerHashesAfter) && (await Promise.all(Object.entries(dryRun.activePointerHashesAfter).map(async ([name, expected]) => sha(await readFile(path.join(root, name))) === expected))).every(Boolean),
  };
  return { status: Object.values(checks).every(Boolean) ? "PASS" : "FAIL", recomputed: { members: rows.length, exactAssertions: rows.reduce((sum, row) => sum + row.exact, 0), familyAssertions: candidate.assertions.length, manuals: { before: activeManualRelease.manuals.length, after: activeManualRelease.manuals.length + newManuals.length }, l9: { before: activeManualRelease.l9AdvisorKnowledge.length, after: activeManualRelease.l9AdvisorKnowledge.length + newL9.length }, absent: { before: beforeAbsent, after: afterAbsent } }, checks };
}

const result = { workUnitId: "WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01", cars: await verifyCars(), appliances: await verifyAppliances() };
result.status = result.cars.status === "PASS" && result.appliances.status === "PASS" ? "PASS" : "FAIL";
console.log(JSON.stringify(result, null, 2));
if (result.status !== "PASS") process.exitCode = 1;
