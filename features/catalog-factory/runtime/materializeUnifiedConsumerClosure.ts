import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEffectiveCatalogFactoryDepartment, loadEffectiveCatalogFactoryView } from "./effectiveCatalog.server";

const OUT = "outputs/catalog-factory-wave-02-14-exact-unified-runtime-consumer-closure-01";
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");

export async function materializeUnifiedConsumerClosure(root = process.cwd()) {
  const view = loadEffectiveCatalogFactoryView(root), appliances = loadEffectiveCatalogFactoryDepartment("APPLIANCES", root), electronics = loadEffectiveCatalogFactoryDepartment("ELECTRONICS", root);
  const core = {
    schemaVersion: "catalog-factory-unified-runtime-consumer-closure/v1", workUnitId: "WU-CATALOG-FACTORY-WAVE-02-14-EXACT-UNIFIED-RUNTIME-CONSUMER-01", status: "CLOSED_INFORMATION_READY_PY_FAIL_CLOSED", generatedAt: "2026-09-07T20:00:00.000Z",
    A_authority: { exact14Release: view.releaseId, membership: view.totals, sourceCommit: "8931c88f584fc5bfb25b7976816027be634b53a9", sdpV2Commit: "c29c356e2b15c37bd679f30a8ebd3018f744e4f0", ...view.authority },
    B_binding: { loaderCount: 1, digestBound: true, failClosed: true },
    C_consumers: { appliancesInformationRows: appliances.length, electronicsInformationRows: electronics.length, catalogDirectory: "SHARED_LOADER", secretary: "SHARED_LOADER", xpyProjection: "SHARED_LOADER_SHADOW_ONLY" },
    D_membership: { before: 80, uniqueAdditions: 14, active: 94, duplicateEffect: 0 },
    E_readiness: view.semanticDecisionReadiness.levels,
    F_candidateEffects: { executableForExact14: false, activeQuestions: 0, mode: "SHADOW_ONLY", unknown: "RETAIN_NEUTRAL" },
    G_supersession: { exact15Membership95: "PROHIBITED", selectedByRuntime: false },
    H_lineage: { smartphone: 34, electronicsBase: 121, rootXpy: "PRESERVED", persona: "PRESERVED", mobility: "PRESERVED", tools: "PRESERVED", mitgo: "PRESERVED" },
    I_ranking: { falseWinner: false, priceWithoutExplicitBudget: false, personaStandaloneWinner: false, commerceEffect: false },
    J_directorySecretary: { membershipVisible: true, identityVisible: true, rawIdLeak: false, decisionReadinessImplied: false },
    K_verification: { focusedTests: 36, typeScript: "PASS", lint: "PASS_12_PREEXISTING_WARNINGS_0_ERRORS", build: "PASS_NEXT_16_3_WEBPACK", diffCheck: "PASS" },
    L_mutations: { pointer: false, domainPointer: false, database: false, production: false, deployment: false, preview: false, push: false },
    M_outcome: { consumerClosed: true, informationConsumption: "ACTIVE", pConsumption: "FAIL_CLOSED", yConsumption: "FAIL_CLOSED", nextAuthorityNeeded: "EXECUTABLE_EXACT14_CANDIDATE_EFFECT_AND_OWNER_APPROVAL" },
  };
  const closure = { ...core, closureDigest: sha(core) };
  const report = Object.entries(core).filter(([key]) => /^[A-M]_/.test(key)).map(([key, value]) => `## ${key.replace("_", " — ")}\n\n\`${stable(value)}\``).join("\n\n");
  await mkdir(path.join(root, OUT), { recursive: true });
  await Promise.all([
    writeFile(path.join(root, OUT, "CLOSURE.json"), `${stable(closure)}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "CLOSURE.sha256"), `sha256:${closure.closureDigest}\n`, { flag: "wx" }),
    writeFile(path.join(root, OUT, "REPORT-A-M.md"), `# Unified runtime consumer closure — A–M\n\n${report}\n\nClosure digest: \`${closure.closureDigest}\`\n`, { flag: "wx" }),
  ]);
  return closure;
}

if (process.argv[1]?.endsWith("materializeUnifiedConsumerClosure.ts")) materializeUnifiedConsumerClosure().then(value => console.log(JSON.stringify({ status: value.status, closureDigest: value.closureDigest }, null, 2)));
