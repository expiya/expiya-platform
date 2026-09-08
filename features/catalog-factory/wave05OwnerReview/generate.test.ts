import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateWave05OwnerReview, stableWave05, WAVE05_SOURCES, type Wave05Source } from "./generate";

const temporary: string[] = [];
async function outputCopy() { const out = await mkdtemp(path.join(os.tmpdir(), "wave05-owner-review-")); temporary.push(out); await cp("outputs/catalog-factory-active-coverage-wave-05-owner-review-01/snapshots", path.join(out, "snapshots"), { recursive: true }); return out; }
afterEach(async () => { await Promise.all(temporary.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });

describe("Wave-05 candidate-only owner-review generator", () => {
  it("is deterministic and preserves separate 108/813 authority planes", async () => {
    const first = await generateWave05OwnerReview({ output: await outputCopy() }); const second = await generateWave05OwnerReview({ output: await outputCopy() });
    expect(first.manifest.packageDigest).toBe(second.manifest.packageDigest);
    expect(first.packet.authority).toMatchObject({ deployedProductionSourceCommit: "7d4cce89094b53a1f0b536b40ede19ca6377cf74", catalogFactory: { active: 108 }, allCatalog: { exactOfferings: 813 } });
    expect(first.packet.selection.categories).toEqual(["SMART_HOME_HUB", "E_READER", "FITNESS_TRACKER"]);
    expect(first.packet.reconciliation).toEqual({ observations: 3, candidates: 3, duplicates: 0, conflicted: 0, unknown: 0, silentDrop: 0 });
    expect(first.packet.boundaries).toMatchObject({ pReadiness: false, yReadiness: false, activation: false, pointer: false, runtime: false, database: false, production: false, preview: false, deployment: false, push: false });
  });
  it("serializes reordered objects identically", () => expect(stableWave05({ z: 1, a: { y: 2, b: 3 } })).toBe(stableWave05({ a: { b: 3, y: 2 }, z: 1 })));
  it("fails closed on a tampered snapshot", async () => { const out = await outputCopy(); const file = path.join(out, "snapshots", WAVE05_SOURCES[0]!.snapshotFile); await writeFile(file, "tampered"); await expect(generateWave05OwnerReview({ output: out })).rejects.toThrow("EXACT_TOKEN_MISSING"); });
  it("fails closed on prior URL reuse", async () => { const out = await outputCopy(); const reused = { ...WAVE05_SOURCES[0]!, url: "https://www.tp-link.com/tr/home-networking/cloud-camera/tapo-c225/v1/" } as Wave05Source; await expect(generateWave05OwnerReview({ output: out, sources: [reused, ...WAVE05_SOURCES.slice(1)] })).rejects.toThrow("PREVIOUS_OR_DUPLICATE_URL"); });
  it("fails closed on duplicate identity", async () => { const out = await outputCopy(); const duplicate = { ...WAVE05_SOURCES[0]!, exactProductId: "electronics:smart-home-hub:tp-link:tapo-h100-eu-v1" } as Wave05Source; await expect(generateWave05OwnerReview({ output: out, sources: [duplicate, ...WAVE05_SOURCES.slice(1)] })).rejects.toThrow("DUPLICATE_IDENTITY"); });
  it("binds manifest digests to serialized artifacts", async () => { const out = await outputCopy(); const result = await generateWave05OwnerReview({ output: out }); const bytes = await readFile(path.join(out, "CANDIDATE_PACKET.json")); expect(result.manifest.artifactDigests["CANDIDATE_PACKET.json"]).toBe((await import("node:crypto")).createHash("sha256").update(bytes).digest("hex")); });
});
