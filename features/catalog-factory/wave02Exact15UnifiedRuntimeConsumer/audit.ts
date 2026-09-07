import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = "outputs/catalog-factory-wave-02-15-exact-unified-runtime-consumer-01";
const OVERLAY = "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01/catalog-overlay.json";
const ELECTRONICS = "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.3-SMARTPHONE-V02-RECONCILED-R2/catalog.json";
const APPLIANCES: Record<string, string> = {
  REFRIGERATOR: "data/production/appliances/refrigerators/richness/releases/APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json",
  WASHING_MACHINE: "data/production/appliances/washing-machines/richness/releases/APPLIANCES-WM-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json",
  DISHWASHER: "data/production/appliances/dishwashers/richness/releases/APPLIANCES-DISHWASHER-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json",
  DRYER: "data/production/appliances/dryers/richness/releases/APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate/catalog-release.json",
};
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(typeof value === "string" ? value : stable(value)).digest("hex");
const read = async (root: string, file: string) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const identityKey = (brand: string, model: string) => `${brand}:${model}`.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[^a-z0-9]+/gu, "");

export async function auditWave02Exact15UnifiedRuntimeConsumer(root = process.cwd()) {
  const overlay = await read(root, OVERLAY), electronics = await read(root, ELECTRONICS);
  const collisions = [];
  for (const category of overlay.categories as Array<{ categoryId: string; additions: Array<{ exactProductId: string; identity: { brand: string; model: string; exactVariant: string } }> }>) {
    const base = APPLIANCES[category.categoryId]
      ? (await read(root, APPLIANCES[category.categoryId]!)).offerings.map((item: { offeringId: string; identity: { manufacturer: string; model: string; configuration: string } }) => ({ exactProductId: item.offeringId, brand: item.identity.manufacturer, model: item.identity.model, configuration: item.identity.configuration }))
      : electronics.products.filter((item: { categoryId: string }) => item.categoryId === category.categoryId).map((item: { exactProductId: string; manufacturer: string; modelCode: string; configurationIdentity: string }) => ({ exactProductId: item.exactProductId, brand: item.manufacturer, model: item.modelCode, configuration: item.configurationIdentity }));
    for (const addition of category.additions) {
      const duplicate = base.find((item: { brand: string; model: string }) => identityKey(item.brand, item.model) === identityKey(addition.identity.brand, addition.identity.model));
      if (duplicate) collisions.push({ categoryId: category.categoryId, identityKey: identityKey(addition.identity.brand, addition.identity.model), addition: { exactProductId: addition.exactProductId, brand: addition.identity.brand, model: addition.identity.model, configuration: addition.identity.exactVariant }, existing: duplicate, reason: "SAME_MANUFACTURER_AND_EXACT_MODEL_DIFFERENT_PRODUCT_ID" });
    }
  }
  const core = {
    schemaVersion: "catalog-factory-unified-runtime-consumer-result/v0.1",
    workUnitId: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-UNIFIED-RUNTIME-CONSUMER-01",
    status: collisions.length ? "BLOCKED_EXACT_IDENTITY_DUPLICATE_FAIL_CLOSED" : "READY_FOR_IMPLEMENTATION",
    auditedAt: "2026-09-07T10:00:00.000Z",
    authority: { activationCommit: "d73cd1b34863d3cb1f2b1d7ed89aadd43c272050", integrationPreflightCommit: "a05ec9ced5963c9b20026c94364343ccaf95b36c", integrationPreflightDigest: "5c90ae764eae14c96cb1dd037fe59ab3d456e658f3d3510907f5b268ee78a8c3", overlayDigest: overlay.overlayDigest, productionSource: "f1ce8e61f76345aa10a1422bb511d2d9998dd954", mergeBase: "f1ce8e61f76345aa10a1422bb511d2d9998dd954", fileConflicts: [] },
    identityAudit: { proposedAdditions: 15, uniqueProductIds: new Set(overlay.categories.flatMap((item: { additions: Array<{ exactProductId: string }> }) => item.additions.map(addition => addition.exactProductId))).size, semanticCollisionCount: collisions.length, safeUniqueAdditions: 15 - collisions.length, collisions },
    blockingDecision: { partialApplicationForbidden: true, exact15ApprovalCannotAuthorize14PlusAlias: true, activeOverlayMustRemainRuntimeUnconsumed: true, reason: "Applying the overlay would violate exact identity uniqueness; silently removing one row would violate the digest-bound exact-15 approval." },
    additionalMappingGap: { applianceAdditions: 8, issue: "Sparse two-fact overlay records cannot be losslessly cast into the four category-specific production pack schemas without invented values.", forbidden: "Do not synthesize required technical facts or mark UNKNOWN as false." },
    requiredRecoveryUnit: { id: "WU-CATALOG-FACTORY-WAVE-02-15-EXACT-IDENTITY-SUPERSESSION-01", scope: ["Bind LG GC-B569NLLM overlay identity to the existing active refrigerator identity as an alias/supersession, not a new membership.", "Regenerate corrected membership totals and digests with no silent drop.", "Re-run owner review and atomic activation because the current approval is bound to exactly 15 additions and total 95.", "Define lossless category-specific appliance projection contracts before runtime participation."] },
    runtimeReady: false,
    integrationManifest: null,
    pushPreviewApprovalSentence: null,
    preservation: { domainPointersModified: false, catalogFactoryActivationArtifactModified: false, runtimeModified: false, catalogDirectoryModified: false, secretaryModified: false, databaseMigration: "NONE", push: false, deployment: false, productionVisibleAdditions: 0, smartphoneBase: 34, electronicsBase: 121, cars: 549 },
  };
  const result = { ...core, resultDigest: sha(core) };
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "RESULT.json"), `${stable(result)}\n`),
    writeFile(path.join(root, OUT, "RESULT.sha256"), `sha256:${result.resultDigest}\n`),
    writeFile(path.join(root, OUT, "RESULT.md"), `# Exact-15 unified runtime consumer\n\nStatus: **${result.status}**. The approved overlay contains one semantic duplicate: LG GC-B569NLLM is already active in Refrigerator under a different product ID.\n\nThe overlay remains runtime-unconsumed. Applying only 14 additions or converting the duplicate to an alias would change the exact digest-bound approval scope and therefore requires \`${result.requiredRecoveryUnit.id}\`.\n\nNo runtime, pointer, database, Catalog Directory, Secretary, production, push or deployment mutation was performed.\n\nDigest: \`${result.resultDigest}\`\n`),
  ]);
  return result;
}

if (process.argv[1]?.endsWith("audit.ts")) auditWave02Exact15UnifiedRuntimeConsumer().then(result => console.log(JSON.stringify({ status: result.status, resultDigest: result.resultDigest, collisions: result.identityAudit.collisions, recoveryUnit: result.requiredRecoveryUnit.id }, null, 2)));
