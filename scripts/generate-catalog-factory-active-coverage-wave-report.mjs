import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const waveDir = path.join(root, "outputs/catalog-factory-active-coverage-wave-01");
const sha256 = value => createHash("sha256").update(value).digest("hex");
const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
};
const canonicalJson = value => JSON.stringify(canonicalize(value), null, 2);
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), "utf8"));

const definitions = [
  { id: "TELEVISION", department: "ELECTRONICS", target: [20, 6, 5], file: "outputs/catalog-factory-active-coverage-wave-01/categories/television/owner-review.json" },
  { id: "LAPTOP", department: "ELECTRONICS", target: [25, 7, 6], file: "outputs/catalog-factory-active-coverage-wave-01/categories/laptop/owner-review.json" },
  { id: "ROBOT_VACUUM", department: "APPLIANCES", target: [18, 6, 5], file: "outputs/catalog-factory-active-coverage-wave-01/categories/robot-vacuum/owner-review.json" },
  { id: "SPLIT_AIR_CONDITIONER", department: "APPLIANCES", target: [18, 6, 5], file: "outputs/catalog-factory-active-coverage-wave-01/categories/split-air-conditioner/owner-review.json" },
  { id: "STROLLER", department: "BABY_AND_CHILD", target: [15, 5, 5], file: "outputs/catalog-factory-stroller-wave-01/owner-review-packet.json" },
];

function normalize(definition, packet) {
  const actual = packet.coverage?.actual ?? packet.coverage ?? packet.category?.counts;
  const exact = actual.exactProducts ?? actual.exact ?? actual.exactCount;
  const brands = actual.brands ?? actual.brandCount;
  const segments = actual.segments ?? actual.segmentCount;
  const membershipHash = packet.membershipHash ?? packet.category?.membershipHash;
  const categoryDigest = packet.categoryDigest ?? packet.category?.categoryDigest ?? packet.packageDigest;
  if (!membershipHash || !categoryDigest || !Number.isInteger(exact) || !Number.isInteger(brands) || !Number.isInteger(segments)) {
    throw new Error(`CATEGORY_PACKET_SHAPE_INVALID:${definition.id}`);
  }
  const [targetExact, targetBrands, targetSegments] = definition.target;
  return {
    categoryId: definition.id,
    departmentId: definition.department,
    lifecycle: "OWNER_REVIEW_CANDIDATE_NOT_ACTIVE",
    sourcePacket: definition.file,
    target: { exact: targetExact, brands: targetBrands, segments: targetSegments },
    actual: { exact, brands, segments },
    gates: {
      exact: exact >= targetExact,
      brands: brands >= targetBrands,
      segments: segments >= targetSegments,
      ownerApproval: "PENDING",
    },
    membershipHash,
    categoryDigest,
  };
}

async function main() {
  const categories = [];
  for (const definition of definitions) categories.push(normalize(definition, await readJson(definition.file)));
  const reportBase = {
    schemaVersion: "catalog-factory-active-coverage-wave-report/v0.1",
    workUnitId: "WU-CATALOG-FACTORY-ACTIVE-COVERAGE-WAVE-01",
    generatedAt: "2026-09-07T00:00:00.000Z",
    status: categories.every(row => row.gates.exact && row.gates.brands && row.gates.segments) ? "OWNER_REVIEW_CANDIDATES_READY_NOT_ACTIVE" : "TERMINAL_COVERAGE_GAPS_RECORDED",
    lineage: {
      productionSource: "f1ce8e61f76345aa10a1422bb511d2d9998dd954",
      authorityAncestor: "39f0ba1d38bec866466c9ab47466d37c61fad11b",
      correctedAuditCommit: "e0928d0b04fc168a1edb96612980677355c20f1d",
      correctedLedgerDigest: "4fc7ccce5b7837b59b719c1e1b364b3458503b59978ec99399c5d6b21a380df8",
      preservedActiveCounts: { electronics: 93, appliances: 113, babyAndChild: 4, mobility: 10, tools: 16 },
    },
    smartphoneDependency: {
      lifecycle: "SEPARATE_WORK_UNIT_IN_PROGRESS",
      treatment: "STATUS_ONLY_DO_NOT_RESEARCH_MODIFY_OR_ACTIVATE",
      activeV12ExactCount: 6,
      pendingDigestBoundPackageExactCount: 33,
      activeCountImpactFromThisWave: 0,
    },
    categories,
    rollup: {
      categoryCount: categories.length,
      candidateExactCount: categories.reduce((sum, row) => sum + row.actual.exact, 0),
      targetPassingCategoryCount: categories.filter(row => row.gates.exact && row.gates.brands && row.gates.segments).length,
      membershipLash: sha256(categories.map(row => `${row.categoryId}:${row.membershipHash}`).sort().join("\n")),
    },
    authorityBoundary: {
      primaryTechnicalEvidence: "MANUFACTURER_TR_OFFICIAL_SUPPORT_MANUAL_WITH_GLOBAL_APPLICABILITY_BRIDGE",
      retailerRole: "TR_DISCOVERY_AND_VOLATILE_COMMERCE_ONLY",
      affiliateRole: "OPTIONAL_COMMERCE_DISCOVERY_ONLY_NOT_TECHNICAL_AUTHORITY",
      personaWithoutEvidence: "NEUTRAL_UNKNOWN",
      noSilentDrops: true,
    },
    activationBoundary: {
      ownerApprovalRequired: true,
      activePointerWrite: false,
      runtimeMutation: false,
      databaseMutation: false,
      deployment: false,
    },
  };
  const report = { ...reportBase, waveDigest: sha256(canonicalJson(reportBase)) };
  await mkdir(waveDir, { recursive: true });
  await writeFile(path.join(waveDir, "WAVE_REPORT.json"), `${canonicalJson(report)}\n`);
  await writeFile(path.join(waveDir, "WAVE_REPORT.sha256"), `sha256:${sha256(`${canonicalJson(report)}\n`)}\n`);
  const rows = categories.map(row => `| ${row.categoryId} | ${row.actual.exact}/${row.target.exact} | ${row.actual.brands}/${row.target.brands} | ${row.actual.segments}/${row.target.segments} | ${row.membershipHash} |`).join("\n");
  const markdown = `# Catalog Factory active coverage wave 01\n\nStatus: **${report.status}**. All packages are candidate-only and require owner approval.\n\n| Category | Exact | Brands | Segments | Membership hash |\n|---|---:|---:|---:|---|\n${rows}\n\nSmartphone remains a status-only dependency: six exact products are active in Electronics v1.2 and the separate 33-product package has zero active impact in this wave.\n\nNo active pointer, runtime, database or deployment mutation is authorized or performed.\n`;
  await writeFile(path.join(waveDir, "WAVE_REPORT.md"), markdown);
  console.log(JSON.stringify({ status: report.status, waveDigest: report.waveDigest, membershipLash: report.rollup.membershipLash }, null, 2));
}

await main();
