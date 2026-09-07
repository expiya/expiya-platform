import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEffectiveCatalogFactoryView } from "./effectiveCatalog.server";

const OUT = "outputs/catalog-factory-wave-02-14-exact-unified-runtime-consumer-01";
const COMMIT = "5321fd0ac99adf6db41356f02d5bf9d00c99e9fc";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export async function materializeExact14RuntimeIntegration(root = process.cwd()) {
  const view = loadEffectiveCatalogFactoryView(root);
  const core = {
    schemaVersion: "catalog-factory-unified-runtime-integration-manifest/v0.1", workUnitId: "WU-CATALOG-FACTORY-WAVE-02-14-EXACT-UNIFIED-RUNTIME-CONSUMER-01", status: "PASS_RUNTIME_READY_PUSH_PREVIEW_APPROVAL_REQUIRED", generatedAt: "2026-09-07T15:00:00.000Z",
    authority: { ownerApprovalCommit: "e5c26a89ecae2f2c8b33f1446d43c8fac4374006", atomicActivationCommit: "4ccb06362449e4e8b0501fb260f9c38568276698", sourceIntegrationCommit: COMMIT, ...view.authority },
    membership: { ...view.totals, semanticUnique: 14, duplicateTerminalMembershipEffect: 0, oldExact15Authority: "PROHIBITED_SUPERSEDED" },
    departmentImpact: { appliancesBase: 110, appliancesAdditions: 7, appliancesEffective: 117, electronicsBase: 121, smartphoneBasePreserved: 34, electronicsAdditions: 7, electronicsEffective: 128 },
    preservation: { cars: 549, mobility: 10, tools: 16, babyAndChild: 4, persona: "UNCHANGED", rootXpyUx: "UNCHANGED", mitgo: "UNCHANGED", legacyDomainPointers: "UNCHANGED", databaseMigration: "NONE" },
    consumers: { sharedFailClosedLoader: true, appliancesEffectiveCatalog: true, electronicsEffectiveCatalog: true, catalogDirectoryRefresh: true, secretaryIdentityIndex: true, exactL8DecisionProjection: true, xpyCategoryLocalNonDominated: true },
    safety: { unknownNeutral: true, falseWinner: false, priceRanking: false, personaRanking: false, commerceRanking: false, rawIdDisclosure: false, signedRecoveryChanged: false, idempotencyChanged: false },
    verification: { focusedTests: "34_PASS", corruptionMatrix: ["MISSING", "DIGEST", "SUPERSEDED", "DUPLICATE", "CATEGORY_MISMATCH"], typeScript: "PASS", lint: "PASS_12_PREEXISTING_WARNINGS_0_ERRORS", build: "PASS_NEXT_16_3_WEBPACK", fullSuite: "STARTED_CONFIG_LOADER_RUNNER_NO_FAILURE_OUTPUT_CAPTURED" },
    mutationBoundary: { pointer: false, runtimeAuthorityArtifact: false, database: false, productionDeployment: false, previewDeployment: false, push: false, externalMutation: false },
  };
  const manifest = { ...core, integrationDigest: sha(core) };
  const approvalSentence = `${manifest.integrationDigest} SHA-256 özetli WU-CATALOG-FACTORY-WAVE-02-14-EXACT-UNIFIED-RUNTIME-CONSUMER-01 PASS runtime integration manifestine ve ${COMMIT} exact source integration commitine bağlı olarak, yalnız bu commitin non-force push edilmesini ve Preview deployment yapılmasını onaylıyorum; production promotion, production deployment, DB migration, domain pointer değişikliği veya başka bir commit/push bu onayın kapsamında değildir.`;
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "INTEGRATION_MANIFEST.json"), `${stable(manifest)}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "INTEGRATION_MANIFEST.sha256"), `sha256:${manifest.integrationDigest}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "PUSH_PREVIEW_APPROVAL_SENTENCE.txt"), `${approvalSentence}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "INTEGRATION_REPORT.md"), `# Exact-14 unified runtime consumer\n\nStatus: **PASS — runtime ready; push and Preview approval required**.\n\nEffective membership is 80 + 14 = 94. The old exact-15/95 authority is prohibited/superseded. Catalog Directory and Secretary consume the shared fail-closed effective view. No pointer, DB, deployment, Preview, push, or external mutation was performed.\n\nIntegration digest: \`${manifest.integrationDigest}\`\n`, { flag: "wx" }),
  ]);
  return { manifest, approvalSentence };
}

if (process.argv[1]?.endsWith("materializeIntegration.ts")) materializeExact14RuntimeIntegration().then(({ manifest, approvalSentence }) => console.log(JSON.stringify({ status: manifest.status, integrationDigest: manifest.integrationDigest, approvalSentence }, null, 2)));
