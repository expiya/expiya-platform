import { describe, expect, it } from "vitest";
import { defineXpyStageOnePresentationAdapter, XPY_STAGE_ONE_PRESENTATION_VERSION } from "./stageOnePresentation";

describe("future department presentation extension", () => {
  it("renders a complete data-only contract without decision authority", () => {
    const future = defineXpyStageOnePresentationAdapter<{ name: string }>({ adapterId: "future/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION, project: input => ({ schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, exactIdentity: { id: "future-1", brand: "Future", model: input.name, configuration: "Türkiye" }, media: { status: "UNAVAILABLE", alt: `${input.name} ürün görseli` }, badge: "Karar hazır", reasons: ["Doğrulanmış neden"], matchedNeeds: ["İhtiyaç karşılanıyor."], supportingContext: [], technicalFacts: [{ label: "Ölçü", value: "10 cm", explanation: "Kurulum alanıyla karşılaştırılmalıdır." }], capabilities: [{ label: "Doğrulanmış işlev" }], limitations: ["Sonuç garantisi değildir."], offers: [], commerceNotice: "Güncel teklif yok.", sources: [{ label: "Üretici ürün kaydı" }], audit: {} }) });
    expect(future.project({ name: "Model" })).toMatchObject({ schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, exactIdentity: { model: "Model" }, media: { status: "UNAVAILABLE" } });
    expect(JSON.stringify(future)).not.toMatch(/rank|authoriz|select/iu);
  });
});
