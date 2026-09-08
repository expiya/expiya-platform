import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEffectiveCatalogFactoryDepartment, loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "./effectiveCatalog.server";

const temporary: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), "exact105-runtime-")); temporary.push(root); for (const folder of ["data/production/catalog-factory", "data/research/xpy-semantic-decision-projection-v2-foundation-01"]) await cp(folder, path.join(root, folder), { recursive: true }); return root; }
// Test-only corruption helper intentionally accepts arbitrary parsed JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mutate(root: string, file: string, change: (value: any) => void) { const target = path.join(root, file), value = JSON.parse(await readFile(target, "utf8")); change(value); await writeFile(target, `${JSON.stringify(value)}\n`); }
afterEach(async () => { await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("Wave-04 exact108 unified runtime catalog", () => {
  it("loads the complete receipt- and pointer-bound 80+28 authority once", () => {
    const view = loadEffectiveCatalogFactoryView();
    expect(view.totals).toEqual({ before: 80, additions: 28, active: 108 });
    expect(view.products).toHaveLength(28);
    expect(loadEffectiveCatalogFactoryDepartment("APPLIANCES")).toHaveLength(16);
    expect(loadEffectiveCatalogFactoryDepartment("ELECTRONICS")).toHaveLength(12);
    expect(view.authority).toMatchObject({ pointerSha256: "c6d1a1ee821891e34d3e7c2bb05d7fe63a4375d0a43da543a964404b7eed4589", receiptDigest: "1671ac5b5550d1f98cbcf63f2d5e9867582576a9ead2e222f4bb56659d18b51b", priorActive: 105, admittedWave04: 3, allCatalogAuthority: 813 });
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

  it("exposes Wave-03 to XPY as information-only shadow candidates", () => {
    const result = projectExact14CategoryDecision("GAME_CONSOLE", { discDrive: true });
    expect(result).toMatchObject({ status: "DECISION_NOT_READY", winner: null, candidates: [], rankingSignals: [], activeQuestionEffects: [] });
    expect(result.shadowCandidates).toHaveLength(1);
    expect(result.shadowCandidates[0].exactProductId).toBe("electronics:game-console:sony:ps5-disc-1tb-cfi-2000");
  });

  it.each([
    ["missing", async (root: string) => rm(path.join(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE04-EXACT3-108-CANDIDATE-01/catalog-overlay.json"))],
    ["pointer digest", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.overlayDigest = "0".repeat(64); })],
    ["split brain", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.activeReleaseId = "CATALOG-FACTORY-NEXT-BATCH8-EXACT14-102-ACTIVE-01"; })],
    ["receipt mismatch", (root: string) => mutate(root, "data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-WAVE04-EXACT3-ATOMIC-ACTIVATION-01/receipt.json", value => { value.status = "FAILED"; })],
    ["duplicate", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE04-EXACT3-108-CANDIDATE-01/catalog-overlay.json", value => { value.categories[11].additions[0] = value.categories[0].additions[0]; })],
    ["release mismatch", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE04-EXACT3-108-CANDIDATE-01/release-candidate.json", value => { value.products[0].exactProductId = "mismatch"; })],
  ])("fails closed on %s corruption", async (_name, corrupt) => { const root = await fixture(); await corrupt(root); expect(() => loadEffectiveCatalogFactoryView(root)).toThrow(); });
});
