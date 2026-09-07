import { describe, expect, it } from "vitest";
import { loadActiveSecretaryProductIdentityIndex } from "./secretaryProductIdentityIndex.server";
import { classifySecretaryMessage } from "./upperSecretary";
import { loadActiveCatalogDirectory } from "./catalogDirectory.server";

describe("exact-105 Catalog Directory and Secretary consumers", () => {
  it("refreshes directory category membership from the shared effective view", async () => {
    const directory = await loadActiveCatalogDirectory();
    const appliances = directory.find(row => row.id === "APPLIANCES")!;
    const electronics = directory.find(row => row.id === "ELECTRONICS")!;
    expect(appliances.categories.find(row => row.id === "DRYER")?.variants.some(row => row.label === "Bosch WQB245A0TR")).toBe(true);
    expect(electronics.categories.find(row => row.id === "MONITOR")?.variants.some(row => row.label === "ASUS PG27AQDM")).toBe(true);
    expect(electronics.categories.find(row => row.id === "GAME_CONSOLE")?.variants.some(row => row.label === "Sony PS5 CFI-2000 Disc")).toBe(true);
  });

  it("routes unique exact aliases, clarifies brands, and leaks no raw product IDs", () => {
    const index = loadActiveSecretaryProductIdentityIndex();
    expect(index.status).toBe("ACTIVE");
    expect(classifySecretaryMessage("PG27AQDM arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=MONITOR") });
    expect(classifySecretaryMessage("Siemens ürünleri", { productIdentityIndex: index })).toMatchObject({ kind: "CLARIFY_DESTINATION" });
    expect(classifySecretaryMessage("Tapo C225 V1 arıyorum", { productIdentityIndex: index })).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: expect.stringContaining("category=HOME_SECURITY_CAMERA") });
    expect(index.entries.some(entry => entry.phrase.includes("electronics:") || entry.phrase.includes("appliances:"))).toBe(false);
  });
});
