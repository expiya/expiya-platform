import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CatalogDirectory } from "@/components/platform/CatalogDirectory";
import { ACTIVE_DEPARTMENT_REGISTRY, type DepartmentRegistryEntry } from "./departmentRegistry";
import { buildCatalogDirectory, loadActiveCatalogDirectory } from "./catalogDirectory.server";

describe("authoritative catalog directory", () => {
  it("projects the exact active pointer membership without stale or future records", async () => {
    const directory = await loadActiveCatalogDirectory();
    expect(Object.fromEntries(directory.map(department => [department.id, department.categories.reduce((sum, category) => sum + category.variants.length, 0)]))).toEqual({
      TOOLS: 16, CARS: 549, APPLIANCES: 110, ELECTRONICS: 93, BABY_AND_CHILD: 4, MOBILITY: 10,
    });
    expect(directory.find(department => department.id === "TOOLS")?.categories.find(category => category.id === "CORDLESS_DRILL")?.variants).toHaveLength(16);
    expect(directory.flatMap(department => department.categories).flatMap(category => category.variants).every(product => product.label.length > 2)).toBe(true);
  });

  it("automatically follows registry and catalog activation or removal", () => {
    const registry = [{ departmentId: "DEMO", publicLabelTr: "Deneme", canonicalPath: "/demo", status: "ACTIVE", capabilities: { ACTIVE: { status: "ACTIVE", publicLabelTr: "Aktif", destination: "/demo/active" }, OFF: { status: "NOT_READY", publicLabelTr: "Kapalı", destination: "/demo/off" } } }] satisfies readonly DepartmentRegistryEntry[];
    const active = new Map([["DEMO", [{ categoryId: "ACTIVE", identity: "one", label: "Marka Model" }, { categoryId: "OFF", identity: "future", label: "Gelecek Model" }]]]);
    expect(buildCatalogDirectory(registry, active)).toEqual([{ id: "DEMO", label: "Deneme", href: "/demo", categories: [{ id: "ACTIVE", label: "Aktif", href: "/demo/active", variants: [{ label: "Marka Model" }] }] }]);
    expect(buildCatalogDirectory([{ ...registry[0], status: "NOT_READY" }], active)).toEqual([]);
    expect(buildCatalogDirectory(registry, new Map([["DEMO", []]]))[0]?.categories[0]?.variants).toEqual([]);
  });

  it("uses closed native disclosures, safe links and consumer-only labels", async () => {
    const directory = await loadActiveCatalogDirectory();
    const html = renderToStaticMarkup(<CatalogDirectory directory={directory} />);
    expect(html.match(/<details/g)).toHaveLength(ACTIVE_DEPARTMENT_REGISTRY.length + 54);
    expect(html).not.toContain("<details open");
    expect(html).not.toMatch(/(?:sha256:|exactProductId|productId|authority|audit|[0-9a-f]{8}-[0-9a-f-]{27})/iu);
    expect(html).toContain('href="/cars#asama-1"');
    expect(html).toContain('href="/tools?entry=secretary&amp;category=CORDLESS_DRILL"');
  });
});
