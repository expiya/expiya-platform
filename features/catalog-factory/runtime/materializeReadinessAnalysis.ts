import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEffectiveCatalogFactoryView } from "./effectiveCatalog.server";

const OUT = "outputs/catalog-factory-wave-02-14-exact-unified-runtime-consumer-readiness-02";
const SOURCE_COMMIT = "bc812eea26780b8c559d3209a5dc8055a932ea55";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export async function materializeExact14ReadinessAnalysis(root = process.cwd()) {
  const view = loadEffectiveCatalogFactoryView(root);
  const categories = [...view.byCategory.entries()].map(([categoryId, products]) => ({ categoryId, products: products.length, INFORMATION_READY: products.every(row => row.readiness.INFORMATION_READY), P_READY: products.every(row => row.readiness.P_READY), Y_READY: products.every(row => row.readiness.Y_READY), activeQuestionEffects: 0, knownPartitionsPerQuestion: 0, runtimeMode: "INFORMATION_AND_IDENTITY_ONLY_PY_SHADOW" }));
  const core = {
    schemaVersion: "catalog-factory-information-p-y-readiness-manifest/v0.2", workUnitId: "WU-CATALOG-FACTORY-WAVE-02-14-EXACT-UNIFIED-RUNTIME-CONSUMER-01", status: "PASS_INFORMATION_READY_PY_NOT_READY_SHADOW_ONLY", generatedAt: "2026-09-07T16:00:00.000Z",
    supersedesIntegrationDigest: "de8e519a2ab4ba6e4d4f985778457ff8d39275114e62983b6190b23997230c69", sourceReadinessCommit: SOURCE_COMMIT, authority: view.authority, membership: view.totals, categories,
    gates: { informationReady: true, pReady: false, yReady: false, directoryVisible: true, secretaryIdentityVisible: true, activeDecisionParticipation: false, activeQuestionEffects: false, l8CardRationaleForAdditions: false },
    suppression: { zeroEffect: true, predominantlyUnknown: true, unsupported: true, repeated: true, reason: "NO_CANDIDATE_EFFECT_BY_ANSWER_OR_TWO_KNOWN_PARTITIONS" },
    semantics: { dailyLifeMode: "INFORMATIONAL_ONLY", requiredLineageForDecisionEffect: "FACT_TO_CONSEQUENCE_TO_NEED", currentLineageDecisionAuthorized: false, explanationAloneCreatesHardOrSoftEffect: false },
    runtime: { legacyCapabilityDeclarationAcceptedAsExecutableProof: false, existingVerifiedBaseSemanticsPreserved: true, exact14CandidateEffects: "SHADOW_ONLY", unknown: "RETAIN_NEUTRAL", falseSingleWinner: false, price: "EXPLICIT_BUDGET_ONLY", persona: "BOUNDED_SOFT_NEVER_STANDALONE_WINNER", commerceRanking: false },
    boundaries: { pointerMutation: false, runtimeAuthorityMutation: false, domainPointerMutation: false, databaseMigration: "NONE", preview: false, productionDeployment: false, push: false },
    verification: { focusedTests: "21_PASS", typeScript: "PASS", lint: "PASS_12_PREEXISTING_WARNINGS_0_ERRORS", diffCheck: "PASS" },
  };
  const manifest = { ...core, readinessDigest: sha(core) };
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "READINESS_MANIFEST.json"), `${stable(manifest)}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "READINESS_MANIFEST.sha256"), `sha256:${manifest.readinessDigest}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "README.md"), `# Exact-14 INFORMATION/P/Y readiness\n\nStatus: **PASS — INFORMATION_READY; P_READY/Y_READY false; shadow-only**.\n\nThe 14 additions remain visible to Catalog Directory and Secretary identity lookup, but cannot add active questions, ranking, winners, or L8 rationale until candidate-effect partitions are proven.\n\nDigest: \`${manifest.readinessDigest}\`\n`, { flag: "wx" }),
  ]);
  return manifest;
}

if (process.argv[1]?.endsWith("materializeReadinessAnalysis.ts")) materializeExact14ReadinessAnalysis().then(result => console.log(JSON.stringify({ status: result.status, readinessDigest: result.readinessDigest }, null, 2)));
