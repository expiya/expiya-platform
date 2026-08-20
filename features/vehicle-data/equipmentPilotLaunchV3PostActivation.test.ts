import { describe, expect, it } from "vitest";

import { loadActiveRecOfferAuditFoundation } from "@/features/decision/v2/offer/recOfferAuditFoundationRuntime.server";
import { createEquipmentExplanationCtas } from "./equipmentPublicExplanationFacade.server";
import { loadActiveEquipmentPublicExplanationIntegration } from "./equipmentPublicExplanationIntegrationRuntime.server";

describe("Equipment pilot launch V3 post-activation", () => {
  it("loads both checksum-bound ACTIVE chains", () => {
    expect(loadActiveRecOfferAuditFoundation()).toMatchObject({ status: "ACTIVE", pointer: { activeFoundationRelease: "v1.0.1-catalog-v0.55.4-2026-08-20" } });
    expect(loadActiveEquipmentPublicExplanationIntegration()).toMatchObject({ status: "ACTIVE", policy: { integrationRelease: "v0.1.0-catalog-v0.55.4-2026-08-20", publicEffect: "ENABLED" } });
  });

  it("exposes a CTA only for a revealed pilot variant", () => {
    const byd = "6cb56615-37ef-51a8-9202-a73e59d4e14b";
    expect(createEquipmentExplanationCtas({ conversationId: "conversation", offerId: "offer", lifecycleState: "REVEALED", revealedExactVariantIds: [byd] })).toEqual([
      { actionId: "EPEA_EXPLAIN_BYD_DOLPHIN_COMFORT_MY2025", exactVariantId: byd, label: "Bu aracı anlat" },
    ]);
    expect(createEquipmentExplanationCtas({ conversationId: "conversation", offerId: "offer", lifecycleState: "REVEALED", revealedExactVariantIds: ["outside-pilot"] })).toEqual([]);
    expect(createEquipmentExplanationCtas({ conversationId: "conversation", offerId: "offer", lifecycleState: "CONSENTED", revealedExactVariantIds: [byd] })).toEqual([]);
  });
});
