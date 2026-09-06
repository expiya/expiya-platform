import { describe, expect, it } from "vitest";
import { loadActiveBoundedAuthority, type BoundedProductType } from "../bounded/authority.server";
import { planBoundedQuestion } from "../bounded/questionPlanner";

const categories: readonly BoundedProductType[] = ["ELECTRIC_STORAGE_WATER_HEATER", "INSTANTANEOUS_ELECTRIC_WATER_HEATER"];

describe("Batch E water-heating authority", () => {
  it.each(categories)("loads an exact multi-brand frozen set for %s", async categoryId => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), categoryId);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.snapshot.pack.products).toHaveLength(3);
    expect(new Set(loaded.snapshot.pack.products.map(product => product.brand)).size).toBe(3);
    expect(loaded.snapshot.pack.selectionPolicy).toEqual({ model: "HARD_COMPATIBILITY_THEN_EVIDENCE_BACKED_PARETO", scores: false, weights: false, implicitTieBreak: false });
    expect(loaded.snapshot.pack.products.every(product => product.claims.every(claim => !claim.outcomeGuarantee))).toBe(true);
  });

  it.each(categories)("fails closed until exact-model professional site verification for %s", categoryId => {
    const outcome = planBoundedQuestion({ type: categoryId, activeEvents: [], candidateCount: 3, unknownHardEvidence: [], askedQuestionKeys: [] });
    expect(outcome).toMatchObject({ kind: "CLARIFY" });
    expect(outcome?.message).toContain("yetkili servis");
  });

  it("keeps storage and instantaneous identities disjoint", async () => {
    const storage = await loadActiveBoundedAuthority(process.cwd(), "ELECTRIC_STORAGE_WATER_HEATER");
    const instant = await loadActiveBoundedAuthority(process.cwd(), "INSTANTANEOUS_ELECTRIC_WATER_HEATER");
    expect(storage.status).toBe("READY"); expect(instant.status).toBe("READY");
    if (storage.status !== "READY" || instant.status !== "READY") return;
    const instantIds = new Set(instant.snapshot.pack.products.map(product => product.productId));
    expect(storage.snapshot.pack.products.some(product => instantIds.has(product.productId))).toBe(false);
    expect(storage.snapshot.pack.scope.excludes).toContain("INSTANTANEOUS");
    expect(instant.snapshot.pack.scope.excludes).toContain("STORAGE");
  });
});
