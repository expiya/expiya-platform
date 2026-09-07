import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEffectiveCatalogFactoryDepartment, loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "./effectiveCatalog.server";

const temporary: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), "exact102-runtime-")); temporary.push(root); for (const folder of ["data/production/catalog-factory", "data/research/xpy-semantic-decision-projection-v2-foundation-01", "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01", "outputs/catalog-factory-wave-02-next-batch-8-exact14-owner-review-01"]) await cp(folder, path.join(root, folder), { recursive: true }); return root; }
// Test-only corruption helper intentionally accepts arbitrary parsed JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mutate(root: string, file: string, change: (value: any) => void) { const target = path.join(root, file), value = JSON.parse(await readFile(target, "utf8")); change(value); await writeFile(target, `${JSON.stringify(value)}\n`); }
afterEach(async () => { await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("exact-14 plus next-batch8 unified runtime catalog", () => {
  it("loads the complete receipt- and pointer-bound 80+22 authority once", () => {
    const view = loadEffectiveCatalogFactoryView();
    expect(view.totals).toEqual({ before: 80, additions: 22, active: 102 });
    expect(view.products).toHaveLength(22);
    expect(loadEffectiveCatalogFactoryDepartment("APPLIANCES")).toHaveLength(13);
    expect(loadEffectiveCatalogFactoryDepartment("ELECTRONICS")).toHaveLength(9);
    expect(view.authority).toMatchObject({ pointerSha256: "494f01bd0221f9323a450b6105a10086f127e625aed52c96f07e30e6e6967108", receiptDigest: "2ef6ad38bef474ad3e90538bf6c0330576ef7e8852cc9ca6f096533f893e3688", priorActive: 94, admittedNextBatch: 8 });
    expect(view.products.every(row => row.readiness.INFORMATION_READY && !row.readiness.P_READY && !row.readiness.Y_READY && row.decisionProjection.mode === "SHADOW_ONLY" && row.decisionProjection.unknownPolicy === "NEUTRAL" && row.decisionProjection.hiddenRankingSignals.length === 0)).toBe(true);
    expect(view.products.every(row => row.technicalFacts.length > 0 && row.dailyLife.questions.length > 0 && row.hardFilters.materialDiscriminators.length > 0)).toBe(true);
    expect(view.semanticDecisionReadiness.levels).toMatchObject({ INFORMATION_READY: { ready: true }, P_READY: { ready: false }, Y_READY: { ready: false } });
    expect(view.semanticDecisionReadiness.declarativeCapabilityRecordsAcceptedAsExecutableEvidence).toBe(false);
  });

  it("keeps P/Y shadow-only, suppresses unmaterialized questions, and never invents a winner", () => {
    const result = projectExact14CategoryDecision("MONITOR", { sizeInches: 27 });
    expect(result).toMatchObject({ status: "DECISION_NOT_READY", winner: null, unknownEffect: "NEUTRAL", rankingSignals: [], activeQuestionEffects: [], candidates: [] });
    expect(result.shadowCandidates).toHaveLength(5);
    expect(result.shadowCandidates.every(row => row.decisionProjection.P.knownPartitions === 0 && row.decisionProjection.P.candidateEffectByAnswer.length === 0)).toBe(true);
  });

  it.each([
    ["missing", async (root: string) => rm(path.join(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01/catalog-overlay.json"))],
    ["pointer digest", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.overlayDigest = "0".repeat(64); })],
    ["split brain", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.activeReleaseId = "CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01"; })],
    ["receipt mismatch", (root: string) => mutate(root, "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-NEXT-BATCH8-EXACT14-ATOMIC-ACTIVATION-01/receipt.json", value => { value.status = "FAILED"; })],
    ["duplicate", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01/catalog-overlay.json", value => { value.categories[1].additions[0] = value.categories[0].additions[0]; })],
    ["release mismatch", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01/release-candidate.json", value => { value.products[0].exactProductId = "mismatch"; })],
  ])("fails closed on %s corruption", async (_name, corrupt) => { const root = await fixture(); await corrupt(root); expect(() => loadEffectiveCatalogFactoryView(root)).toThrow(); });
});
