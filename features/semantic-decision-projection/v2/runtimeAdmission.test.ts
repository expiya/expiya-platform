import { describe, expect, it } from "vitest";
import { requireActiveCategoryPMateriality } from "./runtimeAdmission.server";

describe("active category P-materiality runtime admission", () => {
  it("admits an exact-covered P category and exposes the governed question", async () => {
    const admitted = await requireActiveCategoryPMateriality("SMARTPHONE");
    expect(admitted).toMatchObject({ readiness: "P_READY", questionAdmission: "ASKABLE" });
    expect(admitted.exactOfferingIds.length).toBeGreaterThan(0);
  });

  it("keeps an evidence-gap category information-only with its question suppressed", async () => {
    const admitted = await requireActiveCategoryPMateriality("HEADPHONES");
    expect(admitted).toMatchObject({ readiness: "INFORMATION_ONLY", questionAdmission: "SUPPRESSED" });
  });

  it("fails closed outside the active manifest", async () => {
    await expect(requireActiveCategoryPMateriality("NOT_ACTIVE")).rejects.toThrow("P_MATERIALITY_CATEGORY_NOT_ACTIVE");
  });
});
