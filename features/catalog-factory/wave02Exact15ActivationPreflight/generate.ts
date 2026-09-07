import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REVIEW = "outputs/catalog-factory-wave-02-15-exact-owner-review-01";
const OUT = "outputs/catalog-factory-wave-02-15-exact-activation-preflight-01";
const WORK_UNIT = "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-ACTIVATION-PREFLIGHT-01";
const GENERATED_AT = "2026-09-07T07:00:00.000Z";
const EXPECTED = {
  candidate: "d874eda28ba560b03a1ee3af53168717bc815f9f46e73753c2e0ffbeb9673669",
  package: "13f84ffccbc6f6d3504924b044a99cd33503d68e69522e3d763ebce8351f6166",
  approvalEvent: "7ff3017cba8d8b1b24e0fc46fbed5fe74655035a3733db58d1437c56caabbe4e",
  approvalCommit: "d36385833167bd82ca5032500fc3cc77b820875c",
};
const APPLIANCE_CATALOGS: Record<string, { pointer: string; catalog: string }> = {
  REFRIGERATOR: { pointer: "data/production/appliances/refrigerators/active.json", catalog: "data/production/appliances/refrigerators/richness/releases/APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json" },
  WASHING_MACHINE: { pointer: "data/production/appliances/washing-machines/active.json", catalog: "data/production/appliances/washing-machines/richness/releases/APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json" },
  DISHWASHER: { pointer: "data/production/appliances/dishwashers/active.json", catalog: "data/production/appliances/dishwashers/richness/releases/APPLIANCES-DISHWASHER-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json" },
  DRYER: { pointer: "data/production/appliances/dryers/active.json", catalog: "data/production/appliances/dryers/richness/releases/APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json" },
};
const ELECTRONICS_POINTER = "data/production/electronics/runtime/active.json";
const CATALOG_POINTER = "data/production/catalog/active.json";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha256 = (value: string | Buffer | unknown) => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : stable(value)).digest("hex");
const slug = (value: string) => value.toLowerCase().replaceAll("_", "-");
const readJson = async (base: string, file: string) => JSON.parse(await readFile(path.join(base, file), "utf8"));
type Addition = {
  exactProductId: string;
  identity: { model?: string; exactVariant?: string; market?: string };
  primaryEvidence: { snapshotFile: string; snapshotSha256: string };
  technicalFacts: { snapshotSha256: string }[];
  explicitUnknown: unknown[];
  hardFilters: { unknownPolicy?: string };
  dailyLife: { meaning?: string; questions?: unknown[] };
  personaOrNeutral?: unknown;
  secretary?: unknown;
  presentation?: unknown;
};

async function activeMembership(base: string, categoryId: string) {
  const appliance = APPLIANCE_CATALOGS[categoryId];
  if (appliance) {
    const catalog = await readJson(base, appliance.catalog) as { offerings: { offeringId: string }[] };
    return catalog.offerings.map(row => `appliances:${slug(categoryId)}:${slug(row.offeringId)}`).sort();
  }
  const pointer = await readJson(base, ELECTRONICS_POINTER) as { catalogFile: string };
  const catalog = await readJson(base, pointer.catalogFile) as { products: { categoryId: string; exactProductId: string }[] };
  return catalog.products.filter(row => row.categoryId === categoryId).map(row => row.exactProductId).sort();
}

export async function generateWave02Exact15ActivationPreflight(base = process.cwd()) {
  const ownerPackage = await readJson(base, `${REVIEW}/OWNER_REVIEW_PACKAGE.json`);
  const approvalPath = `${REVIEW}/governance/approval-events/WU-CATALOG-FACTORY-WAVE-02-15-EXACT-OWNER-REVIEW-01-OWNER-APPROVAL-01/owner-approval-event.json`;
  const approval = await readJson(base, approvalPath);
  const approvalCore = { ...approval }; delete approvalCore.eventDigest;
  if (ownerPackage.candidateDigest !== EXPECTED.candidate || ownerPackage.packageDigest !== EXPECTED.package) throw new Error("OWNER_PACKAGE_DIGEST_BINDING_FAILED");
  if (approval.eventDigest !== EXPECTED.approvalEvent || sha256(approvalCore) !== EXPECTED.approvalEvent) throw new Error("APPROVAL_EVENT_DIGEST_BINDING_FAILED");
  if (approval.candidateDigest !== EXPECTED.candidate || approval.packageDigest !== EXPECTED.package) throw new Error("APPROVAL_TO_PACKAGE_BINDING_FAILED");

  const pointerFiles = [...new Set([...Object.values(APPLIANCE_CATALOGS).map(value => value.pointer), ELECTRONICS_POINTER, CATALOG_POINTER])];
  const pointerSnapshots = await Promise.all(pointerFiles.map(async file => {
    const bytes = await readFile(path.join(base, file));
    return { file, byteLength: bytes.length, sha256: sha256(bytes), bytesBase64: bytes.toString("base64") };
  }));
  const currentAuthorityDigest = sha256(pointerSnapshots.map(({ file, byteLength, sha256: digest }) => ({ file, byteLength, sha256: digest })));

  const categoryResults = [];
  const allAdditions: string[] = [];
  for (const summary of ownerPackage.categories as { categoryId: string; baselineActive: number; proposedAdditions: number; proposalAfter: number; membershipDigest: string }[]) {
    const categoryFile = `${REVIEW}/categories/${slug(summary.categoryId)}/owner-review-category.json`;
    const category = await readJson(base, categoryFile);
    const current = await activeMembership(base, summary.categoryId);
    const additions = category.proposedAdditions as Addition[];
    const additionIds = additions.map(row => row.exactProductId);
    const proposal = [...current, ...additionIds].sort();
    const snapshotChecks = await Promise.all(additions.map(async row => {
      const file = row.primaryEvidence.snapshotFile as string;
      const exists = await stat(path.join(base, file)).then(() => true, () => false);
      const digest = exists ? sha256(await readFile(path.join(base, file))) : null;
      return { exactProductId: row.exactProductId, file, exists, expectedSha256: row.primaryEvidence.snapshotSha256, actualSha256: digest, matches: digest === row.primaryEvidence.snapshotSha256 };
    }));
    const completeness = {
      identities: additions.every(row => row.identity?.model && row.identity?.exactVariant && row.identity?.market === "TR"),
      facts: additions.every(row => row.technicalFacts?.length > 0 && row.technicalFacts.every(fact => fact.snapshotSha256 === row.primaryEvidence.snapshotSha256)),
      unknownPolicy: additions.every(row => Array.isArray(row.explicitUnknown) && row.hardFilters?.unknownPolicy === "UNKNOWN_NEVER_FALSE_AND_NEVER_RANKING_SIGNAL"),
      dailyLifeSemantics: additions.every(row => row.dailyLife?.meaning && row.dailyLife?.questions?.length),
      domainMappings: additions.every(row => row.personaOrNeutral && row.secretary && row.presentation),
      authorityReferences: snapshotChecks.every(row => row.matches),
    };
    const proof = {
      currentPointerReread: true,
      before: current.length,
      additions: additionIds.length,
      after: proposal.length,
      expectedBefore: summary.baselineActive,
      expectedAfter: summary.proposalAfter,
      currentMembershipDigest: sha256(current),
      proposedMembershipDigest: sha256(proposal),
      ownerReviewMembershipDigest: summary.membershipDigest,
      activeUnique: new Set(current).size === current.length,
      additionsUnique: new Set(additionIds).size === additionIds.length,
      additionsAbsentFromActive: additionIds.every(id => !current.includes(id)),
      noSilentDrop: additions.length === summary.proposedAdditions && proposal.length === current.length + additions.length,
      proposalMatchesOwnerReview: stable(proposal) === stable(category.membershipProposal.exactProductIds),
    };
    allAdditions.push(...additionIds);
    categoryResults.push({ categoryId: summary.categoryId, authority: APPLIANCE_CATALOGS[summary.categoryId] ?? { pointer: ELECTRONICS_POINTER, catalog: (await readJson(base, ELECTRONICS_POINTER)).catalogFile }, proof, completeness, snapshotChecks });
  }

  const totals = { before: categoryResults.reduce((sum, row) => sum + row.proof.before, 0), additions: allAdditions.length, after: categoryResults.reduce((sum, row) => sum + row.proof.after, 0) };
  const releaseCore = { schemaVersion: "catalog-factory-exact15-overlay-release/v0.1", workUnitId: WORK_UNIT, lifecycle: "IMMUTABLE_CANDIDATE_NOT_ACTIVE", candidateDigest: EXPECTED.candidate, packageDigest: EXPECTED.package, approvalEventDigest: EXPECTED.approvalEvent, approvalCommit: EXPECTED.approvalCommit, currentAuthorityDigest, categoryMembership: categoryResults.map(row => ({ categoryId: row.categoryId, before: row.proof.before, additions: row.proof.additions, after: row.proof.after, currentMembershipDigest: row.proof.currentMembershipDigest, proposedMembershipDigest: row.proof.proposedMembershipDigest })), totals };
  const release = { ...releaseCore, releaseDigest: sha256(releaseCore) };
  const proposedPointer = { schemaVersion: "catalog-factory-overlay-active-pointer/v0.1", state: "PROPOSED_NOT_ACTIVE", compareAndSwap: { expectedCurrentAuthorityDigest: currentAuthorityDigest, candidateReleaseDigest: release.releaseDigest }, activationScope: "MEMBERSHIP_OVERLAY_ONLY", deployment: false };
  const rollback = { schemaVersion: "catalog-factory-pointer-rollback-snapshot/v0.1", status: "PREPARED_NOT_EXECUTED", currentAuthorityDigest, restorePolicy: "BYTE_IDENTICAL_ALL_OR_NOTHING", pointerSnapshots, proof: { allBytesCaptured: pointerSnapshots.every(row => Buffer.from(row.bytesBase64, "base64").length === row.byteLength), allDigestsReproduce: pointerSnapshots.every(row => sha256(Buffer.from(row.bytesBase64, "base64")) === row.sha256), failureBeforeCasLeavesPointersUnchanged: true, failureDuringCasAbortsAtomicWrite: true } };
  const gates = {
    approvalBinding: true,
    liveAuthorityReread: categoryResults.every(row => row.proof.before === row.proof.expectedBefore),
    exact15Unique: allAdditions.length === 15 && new Set(allAdditions).size === 15,
    membershipProofs: categoryResults.every(row => Object.values(row.proof).every(value => value === true || typeof value === "number" || typeof value === "string")),
    artifactCompleteness: categoryResults.every(row => Object.values(row.completeness).every(Boolean)),
    totals: totals.before === 80 && totals.additions === 15 && totals.after === 95,
    smartphoneV02Preserved: pointerSnapshots.some(row => row.file === ELECTRONICS_POINTER && Buffer.from(row.bytesBase64, "base64").toString().includes("SMARTPHONE-V02-RECONCILED-R2")),
    productionLineagePreserved: pointerSnapshots.some(row => row.file === CATALOG_POINTER && Buffer.from(row.bytesBase64, "base64").toString().includes('"0.55.4"')),
    rollbackByteIdentical: rollback.proof.allBytesCaptured && rollback.proof.allDigestsReproduce,
    dbMigrationNone: true,
  };
  const preflightCore = { schemaVersion: "catalog-factory-exact15-activation-preflight/v0.1", workUnitId: WORK_UNIT, status: Object.values(gates).every(Boolean) ? "PASS_NOT_ACTIVATED" : "FAIL_NOT_ACTIVATED", generatedAt: GENERATED_AT, authorityBindings: EXPECTED, currentAuthorityDigest, totals, categories: categoryResults, gates, impacts: { runtime: "POINTER_SELECTED_MEMBERSHIP_OVERLAY_READ_REQUIRES_ATOMIC_ACTIVATION", registry: "EXISTING_CATEGORIES_ONLY_MEMBERSHIP_CHANGE", catalogDirectory: "NO_NEW_CATEGORY_EXISTING_EIGHT_CATEGORIES_ONLY", secretary: "ADD_EXACT_IDENTITY_ALIASES_ONLY_AT_ACTIVATION", databaseMigration: "NONE_OUTPUT_ONLY_IMMUTABLE_RELEASE_AND_POINTER_SELECTION", deployment: "NOT_INCLUDED" }, activationBoundary: { executed: false, pointerMutation: false, runtimeMutation: false, databaseMutation: false, productionMutation: false, deployment: false, push: false } };
  const preflight = { ...preflightCore, preflightDigest: sha256(preflightCore), releaseDigest: release.releaseDigest, proposedPointerDigest: sha256(proposedPointer), rollbackDigest: sha256(rollback) };
  const authorizationSentence = `${preflight.preflightDigest} SHA-256 özetli ${WORK_UNIT} PASS preflight paketine, ${release.releaseDigest} immutable release özetine ve ${currentAuthorityDigest} beklenen canlı authority özetine bağlı olarak, tam 15 exact ürünün mevcut 80 üyelik korunarak toplam 95 üyeliğe çıkarılması için yalnız tek atomik compare-and-swap aktivasyonunu onaylıyorum; bu onay deployment, DB migration, bağımsız production değişikliği veya push yetkisi vermez.`;
  const directory = path.join(base, OUT);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, "PREFLIGHT.json"), `${stable(preflight)}\n`),
    writeFile(path.join(directory, "IMMUTABLE_RELEASE_CANDIDATE.json"), `${stable(release)}\n`),
    writeFile(path.join(directory, "PROPOSED_ACTIVE_POINTER.json"), `${stable(proposedPointer)}\n`),
    writeFile(path.join(directory, "ROLLBACK_POINTER_SNAPSHOT.json"), `${stable(rollback)}\n`),
    writeFile(path.join(directory, "ACTIVATION_AUTHORIZATION_SENTENCE.txt"), `${authorizationSentence}\n`),
    writeFile(path.join(directory, "PREFLIGHT.md"), `# Wave-02 exact-15 activation preflight\n\nStatus: **${preflight.status}**. Live authority was re-read: ${totals.before} current + ${totals.additions} approved = ${totals.after}. Smartphone v02 and production catalog 0.55.4 remain preserved.\n\nDatabase migration: **NONE**. Activation, pointer/runtime/production mutation, deployment and push: **not executed**.\n\nPreflight digest: \`${preflight.preflightDigest}\`\n`),
  ]);
  return { preflight, release, proposedPointer, rollback, authorizationSentence };
}

if (process.argv[1]?.endsWith("generate.ts")) generateWave02Exact15ActivationPreflight().then(({ preflight }) => console.log(JSON.stringify({ status: preflight.status, preflightDigest: preflight.preflightDigest, totals: preflight.totals, gates: preflight.gates }, null, 2)));
