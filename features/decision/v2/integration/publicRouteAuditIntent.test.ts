import { describe, expect, it, vi } from "vitest";
import { createServerRecommendationOfferAuditIntent } from "./publicRoute.server";

const signer = { sign: vi.fn(), verify: vi.fn(() => ({ status: "VALID" as const, offerId: "offer-1", conversationId: "conversation-1", catalogFingerprint: "catalog", decisionFingerprint: "decision", expiresAt: "2026-08-20T13:00:00.000Z" })) };

describe("server authoritative REC audit intent", () => {
  it("ignores client time and emits strict server chronology", async () => {
    const instants = [new Date("2026-08-20T12:00:00.000Z"), new Date("2026-08-20T12:00:00.000Z"), new Date("2026-08-20T12:00:00.001Z")];
    const intent = await createServerRecommendationOfferAuditIntent({ conversationId: "conversation-1", messageId: "message-1", offerToken: "sealed", acceptanceVersion: "REC-2026.08-v1.1", signer, clock: () => instants.shift()!, wait: async () => undefined });
    expect(intent).toMatchObject({ offerId: "offer-1", acceptanceSequence: 1, revealSequence: 2, acceptedAt: "2026-08-20T12:00:00.000Z", revealedAt: "2026-08-20T12:00:00.001Z" });
    expect(Date.parse(intent.acceptedAt)).toBeLessThan(Date.parse(intent.revealedAt));
  });
  it("fails closed for wrong conversation or REC version", async () => {
    await expect(createServerRecommendationOfferAuditIntent({ conversationId: "conversation-1", messageId: "m", offerToken: "sealed", acceptanceVersion: "old", signer })).rejects.toThrow("REC_VERSION_MISMATCH");
    const wrong = { ...signer, verify: vi.fn(() => ({ ...signer.verify(), conversationId: "other" })) };
    await expect(createServerRecommendationOfferAuditIntent({ conversationId: "conversation-1", messageId: "m", offerToken: "sealed", acceptanceVersion: "REC-2026.08-v1.1", signer: wrong })).rejects.toThrow("REC_OFFER_BINDING_INVALID");
  });
});
