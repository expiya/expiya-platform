import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { defineDepartmentLandingPack, XPY_DEPARTMENT_LANDING_VERSION } from "./departmentLanding";
import { APPLIANCES_LANDING_PACK, CARS_LANDING_PACK, ELECTRONICS_LANDING_PACK } from "./departmentLandingPacks";
import { APPLIANCES_VISUAL_PACK } from "./visualPacks";

describe("XPY Department Landing System", () => {
  it("publishes Cars and the authoritative 24-category Appliances projection through the shared contract", () => {
    expect(CARS_LANDING_PACK.canonicalPath).toBe("/cars");
    expect(APPLIANCES_LANDING_PACK.categories).toHaveLength(24);
    expect(APPLIANCES_LANDING_PACK.categories.filter(category => category.availability === "AVAILABLE")).toHaveLength(24);
    expect(APPLIANCES_LANDING_PACK.categories.filter(category => category.availability === "UNAVAILABLE")).toHaveLength(0);
    expect(APPLIANCES_LANDING_PACK.categories.every((category) => category.href === `/appliances?category=${category.id}#asama-1`)).toBe(true);
    expect(APPLIANCES_LANDING_PACK.stages.map((stage) => stage.availability)).toEqual(["AVAILABLE", "REQUIRES_HANDOFF", "UNAVAILABLE"]);
    expect(APPLIANCES_LANDING_PACK.heroImage?.src).toBe("/appliances/appliances-landing-hero.png");
  });

  it("renders the Appliances hero without the duplicate supported-area directory", () => {
    const html = renderToStaticMarkup(<DepartmentLanding pack={APPLIANCES_LANDING_PACK} compactPlatformInfo/>);
    expect(html).toContain("appliances-landing-hero.png");
    expect(html).toContain("href=\"/appliances#asama-1\"");
    expect(html).toContain("object-[72%_center]");
    expect(html).not.toContain("Desteklenen alanlar");
    expect(html).not.toContain('id="kategoriler"');
    expect(html).not.toContain("Simgeler yalnız kategori yönlendirmesidir");
    expect(html).toContain('href="/expiya-nedir"');
    expect(html).not.toContain("XPY yolculuğu");
    expect(html).not.toContain("Experience. Powered by You.</h2>");
    expect(html).not.toContain("danışman desteği henüz yayınlanmadı");
    expect(html).not.toContain('href="/appliances/stage/2"');
    expect(html).not.toContain("Karara giden yolu görünür kılar.");
    expect(html).not.toContain("Karar ve güven");
    expect(html).toContain("Expiya ana sayfasına dön");
  });

  it("embeds Stage 1 on the landing and removes redundant start actions", () => {
    const html = renderToStaticMarkup(<DepartmentLanding pack={APPLIANCES_LANDING_PACK} stageOne={<fieldset data-test-stage-one><legend>Hangi ürünü birlikte seçelim?</legend><button type="button">Çamaşır makinesi</button></fieldset>}/>);
    expect(html).toContain('id="asama-1"');
    expect(html).toContain("Hangi ürünü birlikte seçelim?");
    expect(html).toContain("Çamaşır makinesi");
    expect(html).not.toContain("Görüşmeye başla");
    expect(html).not.toContain("Karar yolculuğunu başlat");
  });

  it.each([
    ["Cars", CARS_LANDING_PACK],
    ["Appliances", APPLIANCES_LANDING_PACK],
    ["Electronics", ELECTRONICS_LANDING_PACK],
  ])("keeps the %s Stage 1 listing while omitting the shared duplicate section", (_name, pack) => {
    const html = renderToStaticMarkup(<DepartmentLanding pack={pack} stageOne={<nav aria-label="AŞAMA 1 kategori listesi"><button type="button">Kategori seç</button></nav>}/>);
    expect(html).toContain('id="asama-1"');
    expect(html).toContain('aria-label="AŞAMA 1 kategori listesi"');
    expect(html).toContain("Kategori seç");
    expect(html).not.toContain("Desteklenen alanlar");
    expect(html).not.toContain('id="kategoriler"');
  });

  it("renders a future department from configuration without a copied page", () => {
    const electronics = defineDepartmentLandingPack({
      ...APPLIANCES_LANDING_PACK,
      version: XPY_DEPARTMENT_LANDING_VERSION,
      departmentId: "ELECTRONICS",
      canonicalPath: "/electronics",
      visualPack: { ...APPLIANCES_VISUAL_PACK, visualPackId: "electronics-visual/test", domainPackId: "electronics-domain/test", publicName: "Expiya Electronics", sceneConcept: "NEUTRAL" },
      headline: ["Doğru elektroniği", "birlikte seçelim"],
      categories: [{ id: "TELEVISION", label: "Televizyon", description: "Görüntüleme ihtiyacını netleştir.", href: "/electronics/analysis?category=TELEVISION", availability: "AVAILABLE" }],
    });
    const html = renderToStaticMarkup(<DepartmentLanding pack={electronics}/>);
    expect(html).toContain("Expiya Electronics");
    expect(html).not.toContain("Desteklenen alanlar");
    expect(html).toContain("data-xpy-department=\"ELECTRONICS\"");
  });

  it("keeps landing configuration and rendering outside decision and authorization authority", () => {
    const sources = [
      readFileSync(new URL("./departmentLandingPacks.ts", import.meta.url), "utf8"),
      readFileSync(new URL("../../components/xpy/DepartmentLanding.tsx", import.meta.url), "utf8"),
    ].join("\n");
    expect(sources).not.toMatch(/features\/(decision|recommendation|sales-advisor)|authorization|ranking/iu);
  });
});
