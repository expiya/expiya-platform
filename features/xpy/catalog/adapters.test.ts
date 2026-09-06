import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { auditActiveXpyCatalogAuthorities, validateActiveArtifactEnvelope } from "./adapters.server";
import { buildXpyCatalogCoverageReport } from "./coverageReport.server";
import { buildCarsExactVariantGapInventory } from "./carsGapInventory.server";
import { assertXpyCatalogRegistration, XPY_CATALOG_REGISTRATIONS } from "./registrations";

const root = path.resolve(process.cwd());

describe("active XPY Catalog adapters", () => {
  it("projects Cars and all six active Appliances categories through the shared layer vocabulary", async () => {
    const audits = await auditActiveXpyCatalogAuthorities(root);
    expect(audits.map((item) => item.categoryId)).toEqual(["NEW_CAR", "WASHING_MACHINE", "DRYER", "REFRIGERATOR", "DISHWASHER", "VACUUM", "ROBOT_VACUUM"]);
    expect(audits.every((item) => item.authorityStatus === "READY")).toBe(true);
    expect(audits.find((item) => item.categoryId === "NEW_CAR")).toMatchObject({ productCount: 549, manualCoveredProductCount: 4, personaCoveredProductCount: 545, dailyLifeMappingCount: 137 });
    expect(audits.find((item) => item.categoryId === "WASHING_MACHINE")).toMatchObject({ productCount: 29, evidenceBearingProductCount: 29 });
    expect(audits.filter((item) => item.departmentId === "APPLIANCES").every((item) => item.activeRelease.includes("active read-only richness"))).toBe(true);
    expect(audits.find((item) => item.categoryId === "DRYER")?.layers.map(({ layer, status }) => [layer, status])).toEqual([
      ["L0", "COMPLETE"], ["L1", "COMPLETE"], ["L2", "COMPLETE"], ["L3", "COMPLETE"], ["L4", "COMPLETE"], ["L5", "COMPLETE"],
      ["L6", "COMPLETE"], ["L7", "ABSENT"], ["L8", "COMPLETE"], ["L9", "PARTIAL"], ["L10", "PARTIAL"],
    ]);
    expect(audits.every((item) => item.layers.length === 11)).toBe(true);
  });

  it("fails closed for pointer/digest, market, identity, and dangling evidence defects", () => {
    const failures = validateActiveArtifactEnvelope({
      pointerRelease: "v2", artifactRelease: "v1", pointerDigest: "0".repeat(64), artifactRaw: "{}", market: "US", expectedMarket: "TR",
      offeringIds: ["same", "same"], evidenceOfferingIds: ["missing"],
    });
    expect(failures).toEqual(["RELEASE_VERSION_MISMATCH", "DIGEST_MISMATCH", "CROSS_MARKET_LEAKAGE", "IDENTITY_COLLISION", "DANGLING_EVIDENCE"]);
  });

  it("binds all seven active category registrations to XPY Runtime and their Domain Packs", () => {
    expect(XPY_CATALOG_REGISTRATIONS).toHaveLength(7);
    XPY_CATALOG_REGISTRATIONS.forEach(assertXpyCatalogRegistration);
  });

  it("builds the machine-readable gap report with a sequenced enrichment plan", async () => {
    const persisted = JSON.parse(await readFile(path.join(root, "data/governance/xpy-catalog/v0.1/coverage-report.json"), "utf8")) as { generatedAt: string };
    const report = await buildXpyCatalogCoverageReport(root, persisted.generatedAt);
    expect(report.audits).toHaveLength(7);
    expect(report.enrichmentPlan).toHaveLength(11);
    expect(report.nextWorkUnit.workUnitId).toBe("WU-XPY-APPL-NEW-CATEGORY-PORTFOLIO-AUTHORITY-01");
    expect(report.productVsService.fixtureOnlyNotice).toContain("not a production");
    expect(report.generatedAt).toBe(persisted.generatedAt);
    expect(report.audits.filter((item) => item.departmentId === "APPLIANCES").every((item) => item.activeRelease.includes("active read-only richness"))).toBe(true);
  });

  it("generates one non-defaulted gap record for every active Cars exact variant", async () => {
    const persisted = JSON.parse(await readFile(path.join(root, "data/governance/xpy-catalog/v0.1/cars-exact-variant-gap-inventory.json"), "utf8")) as { generatedAt: string };
    const inventory = await buildCarsExactVariantGapInventory(root, persisted.generatedAt);
    expect(inventory.referenceClassification).toBe("ARCHITECTURE_AND_RICHNESS_REFERENCE_NOT_CONTENT_COMPLETE");
    expect(inventory.variants).toHaveLength(549);
    expect(inventory.summary).toMatchObject({ contentCompleteVariantCount: 0, variantsWithVerifiedEquipment: 8, variantsWithReviewedAssociationOnly: 2, variantsWithNonEmptyPersonaTraits: 545, variantsWithExactTrManualAssertions: 4, reviewedExactEquipmentDailyLifeApplications: 20, variantsWithReviewedExactEquipmentDailyLifeApplications: 5, positiveExactEquipmentDailyLifeApplications: 19, negativeExactEquipmentDailyLifeApplications: 1, advisorReadyVariants: 0, comparisonReadyVariants: 0 });
    expect(inventory.firstBatch.exactVariantIds).toHaveLength(8);
    expect(inventory.dailyLifeBatch).toMatchObject({ status: "PARTIAL", exactApplications: 20, exactManualSupportedApplications: 15, activePointerChanged: false });
    expect(inventory.nextBoundedWorkUnit.workUnitId).toBe("WU-XPY-APPL-REFRIGERATOR-CATALOG-RICHNESS-01");
    expect(new Set(inventory.variants.map((item) => item.exactVariantId)).size).toBe(549);
    expect(inventory).toEqual(persisted);
  });
});
