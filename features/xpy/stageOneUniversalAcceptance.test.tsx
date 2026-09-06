import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpyDecisionCard } from "@/components/xpy/XpyDecisionCard";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { ELECTRONICS_CATEGORY_IDS } from "@/features/electronics/architectureBaseline";
import { authorizeStrollerCard } from "@/features/baby/decision";
import { STROLLER_PRODUCTS } from "@/features/baby/catalog";
import { STROLLER_STAGE_ONE_PRESENTATION, projectStrollerSet } from "@/features/baby/presentation/stageOneAdapter";
import { ELECTRONICS_STAGE_ONE_PRESENTATION, projectElectronicsSet } from "@/features/electronics/presentation/stageOneAdapter";
import { XPY_STAGE_ONE_ADAPTER_REGISTRY, requireXpyStageOneAdapter } from "./stageOneAdapterRegistry";

describe("universal XPY Stage 1 decision-card contract", () => {
  it("requires one shared projection adapter for every active category", () => {
    expect(Object.keys(XPY_STAGE_ONE_ADAPTER_REGISTRY.CARS)).toEqual(["NEW_CAR"]);
    expect(Object.keys(XPY_STAGE_ONE_ADAPTER_REGISTRY.APPLIANCES)).toEqual([...APPLIANCES_PRODUCT_TYPES]);
    expect(Object.keys(XPY_STAGE_ONE_ADAPTER_REGISTRY.ELECTRONICS)).toEqual([...ELECTRONICS_CATEGORY_IDS]);
    expect(Object.keys(XPY_STAGE_ONE_ADAPTER_REGISTRY.BABY_AND_CHILD)).toEqual(["STROLLER"]);
    expect(APPLIANCES_PRODUCT_TYPES.every(id => requireXpyStageOneAdapter("APPLIANCES", id) === "appliances-stage1-presentation/v1")).toBe(true);
    expect(ELECTRONICS_CATEGORY_IDS.every(id => requireXpyStageOneAdapter("ELECTRONICS", id) === "electronics-stage1-presentation/v1")).toBe(true);
    expect(() => requireXpyStageOneAdapter("ELECTRONICS", "UNKNOWN")).toThrow("STAGE_ONE_PRESENTATION_ADAPTER_MISSING");
  });

  it("projects the authorized Chicco Goody Plus without exposing audit identifiers", () => {
    const product = STROLLER_PRODUCTS.find(row => row.model === "Goody Plus")!;
    const projection = STROLLER_STAGE_ONE_PRESENTATION.project(authorizeStrollerCard(product, { CARRY_WEIGHT: "LIGHT" }, 4));
    const html = renderToStaticMarkup(<XpyDecisionCard card={projection}/>);
    expect(html).toContain("Chicco Goody Plus");
    expect(html).toContain("6,9 kg");
    expect(html).toContain("Tek elle katlama");
    expect(html).not.toMatch(/sha256|authorization|CHICCO_GOODY_PLUS|UNKNOWN/u);
  });

  it.each(ELECTRONICS_CATEGORY_IDS)("projects an authorized %s result through the same renderer", categoryId => {
    const projection = ELECTRONICS_STAGE_ONE_PRESENTATION.project({ exactProductId: `fixture-${categoryId}`, categoryId, manufacturer: "Örnek", modelCode: "Model", configurationIdentity: "Türkiye yapılandırması", rationale: [{ acceptedConcept: "OS_SUPPORT", evidenceFactIds: ["fact-1"], explanationTr: "Destek ihtiyacı doğrulanmış bilgilerle değerlendirildi." }], technicalEvidence: [{ label: "DISPLAY", value: "6,1 inç" }], dailyLifeInterpretation: ["Ekran boyutu taşınabilirlik tercihiyle birlikte düşünülmelidir."], authorizationFingerprint: "internal", authority: { policyDigest: "internal", catalogReleaseDigest: "internal", contextRevision: 2 } });
    const html = renderToStaticMarkup(<XpyDecisionCard card={projection}/>);
    expect(html).toContain("Teknik gerçekler ve günlük hayattaki anlamı");
    expect(html).toContain("İşletim sistemi desteği");
    expect(html).not.toMatch(/OS_SUPPORT|policyDigest|catalogReleaseDigest|fixture-/u);
  });

  it("renders tied and non-dominated sets without a false winner and without horizontal overflow", () => {
    const electronics = projectElectronicsSet("LAPTOP", { kind: "CLARIFY", candidateSummaries: [{ manufacturer: "A", modelCode: "Bir" }, { manufacturer: "B", modelCode: "İki" }], uncertainty: ["WORKLOAD"] });
    const stroller = projectStrollerSet(STROLLER_PRODUCTS.slice(0, 2).map(row => ({ id: row.exactProductId, label: `${row.manufacturer} ${row.model}` })));
    for (const projection of [electronics, stroller]) {
      const html = renderToStaticMarkup(<XpyDecisionCard card={projection}/>);
      expect(html).toContain('data-outcome="NON_DOMINATED_SET"');
      expect(html).toMatch(/kazanan ilan etmeye yetmiyor|Hiçbir model kazanan/iu);
      expect(html).toContain("max-w-full");
      expect(html).toContain("overflow-hidden");
      expect(html).not.toMatch(/kazanan ilan edildi|en iyi ürün/u);
    }
  });
});
