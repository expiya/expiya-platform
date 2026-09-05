import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { ELECTRONICS_CATEGORY_IDS } from "./architectureBaseline";
import { ELECTRONICS_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";
import ElectronicsStageTwoPage from "@/app/electronics/stage/2/page";
import ElectronicsStageThreePage from "@/app/electronics/stage/3/page";
import ElectronicsConversation from "@/app/electronics/analysis/ElectronicsConversation";
describe("Electronics public presentation", () => {
  it("offers every category through disclosed symbolic fallbacks", () => { expect(ELECTRONICS_LANDING_PACK.categories).toHaveLength(24); expect(ELECTRONICS_LANDING_PACK.categories.map(row => row.id)).toEqual(ELECTRONICS_CATEGORY_IDS); expect(ELECTRONICS_LANDING_PACK.categories.every(row => row.availability === "AVAILABLE" && row.visual?.kind === "CATEGORY_SYMBOL_FALLBACK" && row.href === `/electronics/analysis?category=${row.id}`)).toBe(true); });
  it("renders responsive public Turkish landing without the duplicate category directory", () => { const html = renderToStaticMarkup(<DepartmentLanding pack={ELECTRONICS_LANDING_PACK} compactPlatformInfo/>); expect(html).toContain("overflow-x-clip"); expect(html).toContain("Doğru elektronik ürünü"); expect(html).not.toContain("Desteklenen alanlar"); expect(html).not.toContain('id="kategoriler"'); expect(html).not.toContain("Temsilî kategori simgesi"); expect(html).toContain("Expiya nedir?"); });
  it("keeps all category access inside the Stage 1 conversation", () => { const html = renderToStaticMarkup(<ElectronicsConversation categoryId="LAPTOP" categoryLabel="Dizüstü bilgisayar" embedded/>); expect(html).toContain("Hangi elektronik ürünü birlikte seçelim?"); expect(html).toContain('aria-label="Elektronik kategorileri"'); expect(html).toContain('aria-current="page"'); expect(html).toContain("Akıllı ev merkezi"); expect((html.match(/href="\/electronics\?category=/gu) ?? [])).toHaveLength(24); });
  it("keeps Stage 2 and 3 guarded without sales actions", () => { const stage2 = renderToStaticMarkup(<ElectronicsStageTwoPage/>), stage3 = renderToStaticMarkup(<ElectronicsStageThreePage/>); expect(stage2).toContain("yalnız AŞAMA 1’den doğrulanmış"); expect(stage3).toContain("Satış ve işlem adımları aktif değil"); expect(`${stage2}${stage3}`).not.toMatch(/Ödeme yap|Sipariş ver|Teklif al/u); });
  it("keeps root conversation-first without a card-directory section", () => { const source = readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8"); expect(source).toContain("ROOT_DEPARTMENTS"); expect(source).toContain("department.href"); expect(source).toContain("<UpperSecretary />"); expect(source).not.toContain('id="departmanlar"'); expect(source).not.toContain("min-h-[24rem]"); });
  it("keeps Appliances landing compact and embeds Stage 1 after the department entry", () => { const source = readFileSync(path.join(process.cwd(), "app/appliances/page.tsx"), "utf8"); expect(source).toContain("compactPlatformInfo"); expect(source).toContain("stageOne={<AppliancesConversation"); });
});
