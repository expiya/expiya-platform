import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEffectiveCatalogFactoryDepartment, loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "./effectiveCatalog.server";

const temporary: string[] = [];
async function fixture() { const root = await mkdtemp(path.join(os.tmpdir(), "exact14-runtime-")); temporary.push(root); for (const folder of ["data/production/catalog-factory", "outputs/catalog-factory-wave-02-14-exact-identity-supersession-owner-review-01"]) await cp(folder, path.join(root, folder), { recursive: true }); return root; }
// Test-only corruption helper intentionally accepts arbitrary parsed JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mutate(root: string, file: string, change: (value: any) => void) { const target = path.join(root, file), value = JSON.parse(await readFile(target, "utf8")); change(value); await writeFile(target, `${JSON.stringify(value)}\n`); }
afterEach(async () => { await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe("exact-14 unified runtime catalog", () => {
  it("loads the complete digest-bound 80+14 authority once", () => {
    const view = loadEffectiveCatalogFactoryView();
    expect(view.totals).toEqual({ before: 80, additions: 14, active: 94 });
    expect(view.products).toHaveLength(14);
    expect(loadEffectiveCatalogFactoryDepartment("APPLIANCES")).toHaveLength(7);
    expect(loadEffectiveCatalogFactoryDepartment("ELECTRONICS")).toHaveLength(7);
    expect(view.products.every(row => row.decisionProjection.unknownPolicy === "NEUTRAL" && row.decisionProjection.hiddenRankingSignals.length === 0)).toBe(true);
    expect(view.products.every(row => row.technicalFacts.length > 0 && row.dailyLife.questions.length > 0 && row.hardFilters.materialDiscriminators.length > 0)).toBe(true);
  });

  it("keeps UNKNOWN neutral and never invents a winner", () => {
    const tied = projectExact14CategoryDecision("MONITOR", {});
    expect(tied).toMatchObject({ status: "NON_DOMINATED_SET", winner: null, unknownEffect: "NEUTRAL", rankingSignals: [] });
    expect(tied.candidates).toHaveLength(3);
    expect(projectExact14CategoryDecision("MONITOR", { impossibleFact: "required" }).candidates).toHaveLength(3);
    expect(projectExact14CategoryDecision("MONITOR", { sizeInches: -1 })).toMatchObject({ status: "NO_VERIFIED_MATCH", winner: null });
  });

  it.each([
    ["missing", async (root: string) => rm(path.join(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01/catalog-overlay.json"))],
    ["pointer digest", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.overlayDigest = "0".repeat(64); })],
    ["superseded authority", (root: string) => mutate(root, "data/production/catalog-factory/active.json", value => { value.activeReleaseId = "CATALOG-FACTORY-WAVE-02-EXACT-15-ACTIVE-01"; })],
    ["duplicate", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01/catalog-overlay.json", value => { value.categories[1].additions[0] = value.categories[0].additions[0]; })],
    ["category mismatch", (root: string) => mutate(root, "data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE-02-EXACT-14-SUPERSESSION-01/release-candidate.json", value => { value.productBindings[0].categoryId = "MONITOR"; })],
  ])("fails closed on %s corruption", async (_name, corrupt) => { const root = await fixture(); await corrupt(root); expect(() => loadEffectiveCatalogFactoryView(root)).toThrow(); });
});
