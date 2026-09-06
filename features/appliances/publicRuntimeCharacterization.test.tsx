import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DepartmentLanding } from "@/components/xpy/DepartmentLanding";
import { APPLIANCES_LANDING_PACK } from "@/features/xpy/departmentLandingPacks";
import { requireXpyReentry, resolveXpyDomainPack } from "@/features/xpy/domainPacks";
import { APPLIANCES_CATEGORY_REGISTRY, parseAppliancesCategoryRoute } from "./categoryRegistry";
import type { AppliancesProductType, AppliancesRuntimeOutcome } from "./contracts";
import { appliancesCategoryKnowledge, appliancesInformationAnswer, appliancesOpeningGreeting } from "./advisory";
import { appliancesChoices } from "./questionPack";
import { projectPublicAppliancesOutcome } from "./nativeTurn.server";

const representativeQuestion: Readonly<Record<AppliancesProductType, string>> = {
  WASHING_MACHINE: "appliances.wm.remoteControl.requirement", DRYER: "appliances.dryer.capacity", REFRIGERATOR: "appliances.refrigerator.freezerArrangement",
  DISHWASHER: "appliances.dishwasher.material", VACUUM: "appliances.vacuum.material", ROBOT_VACUUM: "appliances.robot.material", FREEZER: "appliances.freezer.material",
  BUILT_IN_OVEN: "appliances.oven.material", FREESTANDING_COOKER: "appliances.cooker.material", HOB: "appliances.hob.material", RANGE_HOOD: "appliances.hood.material",
  COUNTERTOP_MICROWAVE_OVEN: "appliances.countertop-microwave.material", BUILT_IN_MICROWAVE_OVEN: "appliances.built-in-microwave.material", AIR_PURIFIER: "appliances.air-purifier.material",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: "appliances.fully-automatic-espresso.material", MANUAL_ESPRESSO_MACHINE: "appliances.manual-espresso.material", FILTER_COFFEE_MACHINE: "appliances.filter-coffee.material",
  TURKISH_COFFEE_MACHINE: "appliances.turkish-coffee.material", AIR_FRYER: "appliances.air-fryer.material", BLENDER: "appliances.blender.material", FOOD_PROCESSOR: "appliances.food-processor.material",
  ELECTRIC_STORAGE_WATER_HEATER: "appliances.storage-water-heater.site-verification", INSTANTANEOUS_ELECTRIC_WATER_HEATER: "appliances.instant-water-heater.site-verification",
  SPLIT_AIR_CONDITIONER: "appliances.split-ac.site-verification",
};

describe("24-category public Appliances runtime characterization", () => {
  it.each(APPLIANCES_CATEGORY_REGISTRY)("keeps route, landing, status, labels, X/P and Y boundary aligned for $categoryId", category => {
    const landing = APPLIANCES_LANDING_PACK.categories.find(item => item.id === category.categoryId);
    expect(landing).toMatchObject({ label: category.publicLabelTr, href: category.route, availability: category.status === "ACTIVE" ? "AVAILABLE" : "UNAVAILABLE" });
    expect(category.publicLabelTr).not.toBe(category.categoryId);
    expect(parseAppliancesCategoryRoute(category.categoryId)).toMatchObject({ status: category.status, category: { categoryId: category.categoryId } });
    expect(resolveXpyDomainPack("APPLIANCES", category.categoryId).status).toBe(category.status);

    if (category.status === "NOT_READY") {
      return;
    }

    const type = category.categoryId as AppliancesProductType;
    const reentry = requireXpyReentry("APPLIANCES", type);
    const information = appliancesInformationAnswer(type, `${reentry.informationalTerms[0]} hakkında genel bilgi verir misin?`);
    expect(information.length).toBeGreaterThan(20);
    expect(information).not.toContain(type);
    const choices = appliancesChoices(representativeQuestion[type]);
    expect(choices).toMatchObject({ questionKey: representativeQuestion[type], selectionMode: "SINGLE" });
    expect(choices!.options.length).toBeGreaterThan(0);
  });

  it("keeps category access in Stage 1 instead of the landing directory", () => {
    const html = renderToStaticMarkup(<DepartmentLanding pack={APPLIANCES_LANDING_PACK}/>);
    expect(html).not.toContain("Desteklenen alanlar");
    expect(html).not.toContain('id="kategoriler"');
    expect(APPLIANCES_LANDING_PACK.categories).toHaveLength(24);
    expect(APPLIANCES_LANDING_PACK.categories.every((category) => category.href.endsWith("#asama-1"))).toBe(true);
  });

  it("requires X consumer knowledge and a preference opener for every active catalog category", () => {
    for (const category of APPLIANCES_CATEGORY_REGISTRY.filter((item) => item.status === "ACTIVE")) {
      const knowledge = appliancesCategoryKnowledge(category.categoryId as AppliancesProductType);
      expect(knowledge.generalCulture.length).toBeGreaterThan(40);
      expect(knowledge.consumerNeedGuidance.length).toBeGreaterThan(0);
      expect(knowledge.preferenceQuestion).toMatch(/\?$/u);
      expect(appliancesOpeningGreeting(category.categoryId as AppliancesProductType, true)).toMatch(/Merhaba,.*almak istediğini öğrendim\..*\?$/u);
    }
  });

  it("keeps unresolved sets human-labelled and strips IDs/comparisons, failing closed without labels", () => {
    const unresolved: AppliancesRuntimeOutcome = { kind: "CLARIFY", questionKey: "TIED_SET_EXPLANATION", message: "Eşit seçenekler.", selectionState: { kind: "TIED_SET_EXPLANATION", identities: [{ productId: "INTERNAL_ENUM_01", brand: "Arçelik", model: "Model A", configurationIdentity: "Arçelik Model A", market: "TR" }], disclosures: [], comparisons: [{ candidateAId: "INTERNAL_ENUM_01", candidateBId: "INTERNAL_ENUM_02", dimensions: [], result: "TIED" }] as never } };
    const projected = projectPublicAppliancesOutcome(unresolved);
    expect(JSON.stringify(projected)).not.toMatch(/INTERNAL_ENUM|productId|candidateAId|candidateBId|Ürün kaydı/u);
    expect(projected).toMatchObject({ kind: "CLARIFY", selectionState: { identities: [{ brand: "Arçelik", model: "Model A" }], comparisons: [] } });
    expect(projectPublicAppliancesOutcome({ ...unresolved, selectionState: { ...unresolved.selectionState!, identities: [{ ...unresolved.selectionState!.identities[0]!, brand: "" }] } })).toMatchObject({ kind: "FAILED_CLOSED" });
  });

  it("humanizes internal selection vocabulary at the public boundary", () => {
    const projected = projectPublicAppliancesOutcome({ kind: "CLARIFY", questionKey: "NON_DOMINATED_SET_EXPLANATION", message: "Birden fazla non-dominated exact model runtime-seçilebilir ve yetkilendirilebilir." });
    expect(JSON.stringify(projected)).not.toMatch(/non-dominated|exact model|runtime|yetkilendirilebilir/iu);
    expect(projected).toMatchObject({ kind: "CLARIFY", message: expect.stringContaining("farklı ihtiyaçlarda öne çıkan") });
  });

  it("adds selectable answers to Turkish yes-or-no material questions", () => {
    expect(projectPublicAppliancesOutcome({ kind: "ASK", questionKey: "filter-care", message: "Düzenli bakım yapman senin için uygun mu?" })).toMatchObject({
      choices: { selectionMode: "SINGLE", options: [{ label: "Evet" }, { label: "Hayır" }, { label: "Henüz bilmiyorum" }] },
    });
  });

  it("characterizes public controls without granting comparison, Advisor, or Y authority", () => {
    expect(APPLIANCES_LANDING_PACK.stages.map(stage => stage.availability)).toEqual(["AVAILABLE", "REQUIRES_HANDOFF", "UNAVAILABLE"]);
    expect(APPLIANCES_LANDING_PACK.stages[1]?.description).toMatch(/AŞAMA 1.*ürün kartından açılır/iu);
    expect(APPLIANCES_LANDING_PACK.stages[1]?.description).toMatch(/teknik bilgilerini.*günlük kullanımdaki karşılığını/iu);
    expect(APPLIANCES_LANDING_PACK.stages[2]?.description).toMatch(/satıcı|teklif|stok|ödeme|sipariş/iu);
  });
});
