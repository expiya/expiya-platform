import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XPY_STAGE_TWO_PROTOCOL_VERSION, type XpyStageTwoProjection } from "@/features/xpy/stageTwo/contracts";
import { XpyStageTwoRenderer } from "./XpyStageTwoRenderer";

const projection: XpyStageTwoProjection = {
  schemaVersion: "xpy-stage2-projection/v1",
  authority: { protocolVersion: XPY_STAGE_TWO_PROTOCOL_VERSION, handoffAuthorityVersion: "2.0.0", departmentId: "CARS", categoryId: "NEW_CAR", conversationId: "c", decisionRevision: 1, decisionFingerprint: "d", exactProductId: "p", configurationIdentity: "configuration", evidence: { release: "r", fingerprint: "f" }, issuedAt: "2026-09-06T10:00:00.000Z", expiresAt: "2026-09-06T11:00:00.000Z", replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" },
  selected: { exactProductId: "p", configurationIdentity: "configuration", title: "Ürün", media: { state: "UNAVAILABLE", alt: "", disclosure: "Medya yok" }, facts: [{ key: "size", label: "Boyut", value: "10", evidenceState: "VERIFIED" }], capabilities: [], limitations: ["Sınır"], price: { state: "UNAVAILABLE", display: "Bilinmiyor", note: "Fiyat yok" } },
  comparison: { access: "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: [], rows: [] },
  boundaries: { canReopenStageOneSelection: false, canAddUnentitledProducts: false, salesActionsActive: false, stageThreeActive: false },
};

describe("shared AŞAMA 2 renderer", () => {
  it("keeps semantic headings, status disclosure, comparison offer before advisor, and responsive shell markers", () => {
    const html = renderToStaticMarkup(<XpyStageTwoRenderer projection={projection}/>);
    expect(html).toContain('aria-labelledby="xpy-stage-two-title"');
    expect(html).toContain('role="status"');
    expect(html).toContain("sm:px-8");
    expect(html.indexOf("Karşılaştırma raporu")).toBeLessThan(html.indexOf("Satış Danışmanı"));
  });
});
