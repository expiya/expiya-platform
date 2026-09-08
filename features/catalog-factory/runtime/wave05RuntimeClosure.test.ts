import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadActiveCatalogDirectory } from "@/features/platform/catalogDirectory.server";
import { loadActiveSecretaryProductIdentityIndex } from "@/features/platform/secretaryProductIdentityIndex.server";
import { loadEffectiveCatalogFactoryView, projectExact14CategoryDecision } from "./effectiveCatalog.server";

const WAVE05 = Object.freeze([
  ["SMART_HOME_HUB", "electronics:smart-home-hub:tp-link:tapo-h110-eu-v1"],
  ["E_READER", "electronics:e-reader:kobo:n605"],
  ["FITNESS_TRACKER", "electronics:fitness-tracker:xiaomi:m2333b1"],
] as const);

describe("Wave-05 111 unified consumer closure", () => {
  it("binds Directory, Secretary, domain information and XPY to one fail-closed authority", async () => {
    const view = loadEffectiveCatalogFactoryView();
    const directory = await loadActiveCatalogDirectory();
    const secretary = loadActiveSecretaryProductIdentityIndex();
    expect(view.authority.pointerSha256).toBe("268a9528b4fb40247730f6482ccdb9a82e2ec898a7506c559421a86191bc095e");
    for (const [categoryId, exactProductId] of WAVE05) {
      const product = view.byCategory.get(categoryId)?.find(row => row.exactProductId === exactProductId);
      expect(product).toMatchObject({ readiness: { INFORMATION_READY: true, P_READY: false, Y_READY: false } });
      expect(directory.find(row => row.id === "ELECTRONICS")?.categories.find(row => row.id === categoryId)?.variants.some(row => row.label === `${product?.identity.brand} ${product?.identity.model}`)).toBe(true);
      expect(secretary.entries.some(entry => entry.choice.categoryId === categoryId && entry.phrase.includes(product!.identity.model.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, " ").trim()))).toBe(true);
      expect(projectExact14CategoryDecision(categoryId, {})).toMatchObject({ status: "DECISION_NOT_READY", candidates: [], winner: null, rankingSignals: [], activeQuestionEffects: [], unknownEffect: "NEUTRAL" });
    }
  });

  it("proves the separate all-catalog 813 mapping remains exact and excludes Wave-05 overlay IDs", () => {
    const inventory = JSON.parse(readFileSync("outputs/all-active-catalog-p-materiality-production-01/checkpoint-01-inventory/inventory-readiness.json", "utf8")) as { categories: { categoryId: string; exactOfferingIds: string[] }[] };
    const expected = new Map([
      ["SMART_HOME_HUB", ["electronics:smart-home-hub:signify:hue-bridge-8719514342620", "electronics:smart-home-hub:tp-link:tapo-h100-eu-v1", "electronics:smart-home-hub:tp-link:tapo-h200-eu-v1"]],
      ["E_READER", ["electronics:e-reader:kobo:n365", "electronics:e-reader:kobo:n367", "electronics:e-reader:kobo:n428"]],
      ["FITNESS_TRACKER", ["electronics:fitness-tracker:huawei:nor-b19-black", "electronics:fitness-tracker:xiaomi:m2435b1-black", "electronics:fitness-tracker:xiaomi:smart-band-10-black"]],
    ]);
    expect(inventory.categories.reduce((sum, row) => sum + row.exactOfferingIds.length, 0)).toBe(813);
    for (const [categoryId, exactProductId] of WAVE05) {
      expect(inventory.categories.find(row => row.categoryId === categoryId)?.exactOfferingIds).toEqual(expected.get(categoryId));
      expect(inventory.categories.some(row => row.exactOfferingIds.includes(exactProductId))).toBe(false);
    }
  });
});
