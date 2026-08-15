import { describe, expect, it } from "vitest";

import { emptyConversationTrace } from "./carsRequirementLedger";
import {
  heldAuthorizationIsUsable,
  openHeldAuthorization,
  requirementFingerprint,
  resealHeldAuthorization,
  sealHeldAuthorization,
  tokenLeaksCandidateIdentity,
} from "./carsHeldAuthorization";

describe("held candidate authorization", () => {
  it("seals an opaque token that does not leak candidate identity", () => {
    const token = sealHeldAuthorization({
      conversationId: "c1",
      runtimeVehicleCandidateId: "RVC-PILOT-0001",
      vehicleVariantId: "a3728e65-51b2-447f-a6c3-a1f64db8a310",
      requirementFingerprint: "abc",
    });
    expect(tokenLeaksCandidateIdentity(token)).toBe(false);
    expect(token).not.toContain("RVC-PILOT-0001");
    expect(token).not.toContain("Hyundai");
    expect(openHeldAuthorization(token)?.runtimeVehicleCandidateId).toBe("RVC-PILOT-0001");
  });

  it("rejects a forged or foreign conversation token", () => {
    const token = sealHeldAuthorization({
      conversationId: "c1",
      runtimeVehicleCandidateId: "RVC-PILOT-0001",
      vehicleVariantId: "variant",
      requirementFingerprint: requirementFingerprint(emptyConversationTrace()),
    });
    expect(heldAuthorizationIsUsable({
      token,
      conversationId: "other",
      memory: emptyConversationTrace(),
    })).toBeUndefined();
    expect(heldAuthorizationIsUsable({
      token: "v1.forged.payload.tag",
      conversationId: "c1",
      memory: emptyConversationTrace(),
    })).toBeUndefined();
  });

  it("does not reveal after expiry, decline, or invalidation", () => {
    const memory = emptyConversationTrace();
    const token = sealHeldAuthorization({
      conversationId: "c1",
      runtimeVehicleCandidateId: "RVC-PILOT-0001",
      vehicleVariantId: "variant",
      requirementFingerprint: requirementFingerprint(memory),
      now: Date.now() - 3_600_000 * 3,
    });
    expect(heldAuthorizationIsUsable({ token, conversationId: "c1", memory })).toBeUndefined();
    const declined = resealHeldAuthorization(sealHeldAuthorization({
      conversationId: "c1",
      runtimeVehicleCandidateId: "RVC-PILOT-0001",
      vehicleVariantId: "variant",
      requirementFingerprint: requirementFingerprint(memory),
    }), "DECLINED");
    expect(heldAuthorizationIsUsable({ token: declined, conversationId: "c1", memory, requireActiveOffer: true })).toBeUndefined();
  });
});
