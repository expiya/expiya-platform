import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_CATEGORY_PACKAGE_DIGEST, ALL_CATEGORY_RELEASE, OWNER_AUTHORIZATION, buildAllCategoryCatalog, verifyAllCategoryApprovalPackage } from "./allCategoryCatalogActivation";
import type { ElectronicsRuntimeCatalog } from "./runtimeAuthority.server";

const root = process.cwd();
describe("Electronics all-category governed activation", () => {
  it("verifies OAM-02 and every governed child digest", async () => { const result = await verifyAllCategoryApprovalPackage(root); expect(result.approval.packageDigest).toBe(ALL_CATEGORY_PACKAGE_DIGEST); expect(Object.keys(result.approval.artifactDigests)).toHaveLength(6); expect(OWNER_AUTHORIZATION).toContain("Amazon Türkiye commerce coverage remains disabled and incomplete"); });
  it("retains 68 byte-equivalent members, admits exactly 25 and preserves Headphones at 18", async () => { const pointer = JSON.parse(await readFile(path.join(root, "data/production/electronics/runtime/releases", ALL_CATEGORY_RELEASE, "rollback-active-pointer.json"), "utf8")); const base = JSON.parse(await readFile(path.join(root, pointer.catalogFile), "utf8")) as ElectronicsRuntimeCatalog; const candidate = JSON.parse(await readFile(path.join(root, "data/research/electronics/all-category-expansion-02/candidate-catalog.json"), "utf8")); const { catalog, additions } = buildAllCategoryCatalog(base, candidate); expect(catalog.products).toHaveLength(93); expect(additions).toHaveLength(25); expect(catalog.products.filter(row => row.categoryId === "HEADPHONES")).toHaveLength(18); expect(new Set(catalog.products.map(row => row.exactProductId))).toHaveProperty("size", 93); expect(additions.every(row => row.commerceEffect === "NONE" && row.personaEffect === "NONE")).toBe(true); });
});
