import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { APPLIANCES_CATEGORY_IDS, APPLIANCES_CATEGORY_REGISTRY, APPLIANCES_PORTFOLIO_DIGEST, INACTIVE_APPLIANCES_CATEGORY_IDS, parseAppliancesCategoryRoute } from "./categoryRegistry";
import { enterAppliancesDepartment } from "./entry.server";
import { resolveInactiveAdvisorOrComparison, resolveInactiveAuthoritySlot, resolveInactiveCategoryShell, loadInactiveCategoryData } from "./inactiveFoundation";
import { validateAppliancesPortfolioAuthority } from "./portfolioAuthority.server";
import { resolveDepartmentCapability } from "../platform/departmentRegistry";
import { resolveXpyDomainPack } from "../xpy/domainPacks";

describe("inactive appliance category foundation", () => {
  it("is exactly sourced from the frozen portfolio and validates its canonical digest", async () => {
    const raw = await readFile("data/governance/appliances/new-category-portfolio/releases/APPLIANCES-NEW-CATEGORY-PORTFOLIO-TR-v0.1/portfolio.json", "utf8");
    const document = JSON.parse(raw) as { payload: unknown };
    expect(`sha256:${createHash("sha256").update(JSON.stringify(document.payload)).digest("hex")}`).toBe(APPLIANCES_PORTFOLIO_DIGEST);
    expect(await validateAppliancesPortfolioAuthority(process.cwd())).toEqual({ status: "VALID" });
    expect(INACTIVE_APPLIANCES_CATEGORY_IDS).toEqual([]);
    expect(APPLIANCES_CATEGORY_IDS).toHaveLength(24);
  });

  it.each(INACTIVE_APPLIANCES_CATEGORY_IDS)("recognizes %s but exposes no active authority or data", async categoryId => {
    const registration = APPLIANCES_CATEGORY_REGISTRY.find(item => item.categoryId === categoryId)!;
    expect(registration.publicLabelTr).not.toContain(categoryId);
    expect(parseAppliancesCategoryRoute(categoryId)).toMatchObject({ status: "NOT_READY", category: { categoryId, status: "NOT_READY" } });
    expect(resolveDepartmentCapability("APPLIANCES", categoryId)).toEqual({ status: "NOT_READY" });
    expect(resolveXpyDomainPack("APPLIANCES", categoryId)).toEqual({ status: "NOT_READY", categoryId, pack: null, authority: [] });
    expect(resolveInactiveAuthoritySlot(categoryId)).toMatchObject({ status: "NOT_READY", domainPack: null, catalog: null, decisionAuthority: null });
    for (const kind of ["CATALOG", "TECHNICAL", "MANUAL", "MEDIA", "PRICE", "OFFER"] as const) expect(loadInactiveCategoryData(categoryId, kind)).toEqual({ status: "NOT_READY", items: [], authority: "NONE" });
    expect(resolveInactiveAdvisorOrComparison(categoryId, "SALES_ADVISOR").status).toBe("INACCESSIBLE");
    expect(resolveInactiveAdvisorOrComparison(categoryId, "PAID_COMPARISON").status).toBe("INACCESSIBLE");
    expect(resolveInactiveCategoryShell(categoryId).stages).toEqual({ x: "SHELL_ONLY", p: "INACCESSIBLE", y: "INACCESSIBLE", decisionReady: false });
    expect((await enterAppliancesDepartment({ repository: {} as never, productType: categoryId })).status).toBe("NOT_READY");
  });

  it("rejects unknown route categories distinctly", () => expect(parseAppliancesCategoryRoute("OTHER_APPLIANCES")).toEqual({ status: "UNSUPPORTED" }));
});
