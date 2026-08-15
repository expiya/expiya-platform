import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/decision/conversation/planCarsConversationTurn", () => ({
  planCarsConversationTurn: vi.fn().mockResolvedValue({
    requestedModel: "gpt-5.5",
    parseOutcome: "UNAVAILABLE",
    fallbackUsed: false,
  }),
}));

import { POST } from "./route";

async function postConversation(conversationId: string, messages: unknown[], extra: Record<string, unknown> = {}, ip = "10.40.0.1") {
  return POST(new Request("http://localhost/api/cars/conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ conversationId, messages, ...extra }),
  }));
}

describe("POST /api/cars/conversation evidence-backed journey", () => {
  it("retains unsupported requirements and repairs pickup frustration without looping", async () => {
    const response = await postConversation("http-exact-loop-regression", [
      { id: "1", role: "user", content: "arazi aracı bakıyorum" },
      { id: "2", role: "assistant", content: "Kamp ve stabilize yol mu?" },
      { id: "3", role: "user", content: "Kamp ve stabilize yol" },
      { id: "4", role: "assistant", content: "Yaklaşık üst bütçeniz nedir?" },
      { id: "5", role: "user", content: "2 milyon tl" },
      { id: "6", role: "assistant", content: "Sizin için vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "4x4 olmalı" },
      { id: "8", role: "assistant", content: "4x4 şartınızı kaydettim. En az kaç koltuk gerekli?" },
      { id: "9", role: "user", content: "pick up araç tercihim" },
      { id: "10", role: "assistant", content: "Pickup tercihinizi kaydettim." },
      { id: "11", role: "user", content: "pick up dedim ya. anlamdın mı?" },
    ], {}, "10.30.0.1");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/pickup/iu);
    expect(payload.message).not.toMatch(/vazgeçilmez|günlük hayatınızdan/iu);
    expect(payload.conversation.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000, sourceTurn: 3 }),
      expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4", sourceTurn: 4, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP", sourceTurn: 5, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
    ]));
  });

  it("binds yes to the prior four-seat confirmation through the public route", async () => {
    const response = await postConversation("http-party-confirmation", [
      { id: "1", role: "user", content: "arazi aracı lazım" },
      { id: "2", role: "assistant", content: "Ciddi arazi mi?" },
      { id: "3", role: "user", content: "Ciddi arazi kullanımı" },
      { id: "4", role: "assistant", content: "Bütçeniz?" },
      { id: "5", role: "user", content: "3 milyon" },
      { id: "6", role: "assistant", content: "Vazgeçilmez özellik nedir?" },
      { id: "7", role: "user", content: "donanım yüksek olsun" },
      { id: "8", role: "assistant", content: "Kaç kişi taşınacak?" },
      { id: "9", role: "user", content: "4 kişilik olsun, küçük olmasın" },
      { id: "10", role: "assistant", content: "4 kişi olduğunuzu anladım. En az 4 koltuk sizin için zorunlu mu?" },
      { id: "11", role: "user", content: "evet" },
    ], {}, "10.30.0.5");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/4 kişilik kullanım/iu);
    expect(payload.message).not.toMatch(/litre olarak|minimum hacmi/iu);
    expect(payload.conversation.didConversationProgress).toBe(true);
    expect(payload.conversation.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "USAGE_SERIOUS_OFF_ROAD", value: "SERIOUS_OFF_ROAD" }),
      expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 3_000_000 }),
      expect.objectContaining({ key: "EQUIPMENT_LEVEL", value: "HIGH" }),
      expect.objectContaining({ key: "SIZE_PREFERENCE", value: "NOT_SMALL" }),
      expect.objectContaining({ key: "PARTY_SIZE", value: 4 }),
      expect.objectContaining({ key: "MIN_SEATS", value: 4, sourceTurn: 6 }),
    ]));
  });

  it.each([
    "arazi aracı var mı sizde",
    "off-road araç bakıyorum",
    "stabilize yolda kullanacağım",
    "kamp yolu için araç arıyorum",
    "kötü yol şartlarına uygun olsun",
  ])("routes first-turn usage intent before budget through the public handler: %s", async (content) => {
    const response = await postConversation(`http-usage-${content}`, [{ id: "1", role: "user", content }]);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/kamp|stabilize|arazi|çamurlu|şehir/iu);
    expect(payload.message).not.toMatch(/üst bütçe|vazgeçilmez/iu);
  });

  it.each(["ne gibi?", "nasıl yani?", "anlamadım"])(
    "explains usage without repeating or asking budget through the public handler: %s",
    async (repair) => {
      const firstMessage = "Evet, arazi ve kötü yol kullanımına uygun araçları değerlendirebiliriz. Daha çok kamp ve stabilize yol mu, çamurlu/kötü yollar mı, yoksa ciddi arazi kullanımı mı düşünüyorsunuz?";
      const response = await postConversation(`http-usage-repair-${repair}`, [
        { id: "1", role: "user", content: "arazi aracı var mı sizde" },
        { id: "2", role: "assistant", content: firstMessage },
        { id: "3", role: "user", content: repair },
      ]);
      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.message).toMatch(/örneğin.*stabilize.*çamurlu.*dik/iu);
      expect(payload.message).not.toBe(firstMessage);
      expect(payload.message).not.toMatch(/üst bütçe/iu);
    },
  );

  it("suppresses the reported repeated follow-up through the real HTTP handler", async () => {
    const response = await postConversation("http-budget-repair", [
      { id: "1", role: "user", content: "Araba almak istiyorum." },
      { id: "2", role: "assistant", content: "Yaklaşık üst bütçeniz nedir?" },
      { id: "3", role: "user", content: "ne gibi?" },
    ]);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/örneğin 1,5 milyon TL/iu);
    expect(payload.message).not.toBe("Yaklaşık üst bütçeniz nedir?");
  });

  it("crosses the real HTTP handler, transcript bridge, governed runtime, and additive response contract", async () => {
    const response = await postConversation("http-evidence-journey", [
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
      { id: "2", role: "assistant", content: "Bagaj için zorunlu minimum hacim nedir?" },
      { id: "3", role: "user", content: "300 litre bagaj istiyorum." },
    ]);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ kind: "QUESTION", decision: {
      conversationState: "OFFER_AWAITING_CONSENT", decisionStatus: "DECISION_READY",
      requirements: [
        { factKey: "seats", predicate: "AT_LEAST", value: 7 },
        { factKey: "cargo_volume_l", predicate: "AT_LEAST", value: 300 },
      ],
    } });
    expect(payload.decision.selectedRuntimeVehicleCandidateId).toBeUndefined();
    expect(payload.decision.selectedVehicle).toBeUndefined();
    expect(payload.message).not.toMatch(/Hyundai|IONIQ|RVC-/i);
    expect(payload.conversation.heldAuthorization).toBeTruthy();
  });

  it("evaluates a sufficient first message as an offer without revealing identity", async () => {
    const response = await postConversation("http-immediate-unique", [
      { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    ]);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.decision.conversationState).toBe("OFFER_AWAITING_CONSENT");
    expect(payload.decision.selectedRuntimeVehicleCandidateId).toBeUndefined();
    expect(payload.kind).toBe("QUESTION");
  });

  it("exposes and enforces the structured final discriminator through the public handler", async () => {
    const first = await postConversation("http-final-discriminator", [
      { id: "1", role: "user", content: "En az 5 koltuk ve 350 litre bagaj istiyorum." },
    ], {}, "10.30.0.2");
    const firstPayload = await first.json();
    expect(firstPayload).toMatchObject({
      discriminatorChoices: [{ id: "MAX_CARGO", label: "Daha fazla bagaj alanı" }],
      conversation: { state: "FINAL_DISCRIMINATOR_REQUIRED", textInputAllowed: false },
    });

    const messages = [
      { id: "1", role: "user", content: "En az 5 koltuk ve 350 litre bagaj istiyorum." },
      { id: "2", role: "assistant", content: firstPayload.message, discriminatorChoices: firstPayload.discriminatorChoices },
      { id: "3", role: "user", content: "serbest metin" },
    ];
    const rejected = await postConversation("http-final-discriminator", messages, {}, "10.30.0.3");
    expect(rejected.status).toBe(409);

    const selected = await postConversation("http-final-discriminator", [
      ...messages.slice(0, 2), { id: "4", role: "user", content: "Daha fazla bagaj alanı" },
    ], { choiceId: "MAX_CARGO" }, "10.30.0.4");
    const selectedPayload = await selected.json();
    expect(selectedPayload).toMatchObject({
      kind: "QUESTION",
      decision: { conversationState: "OFFER_AWAITING_CONSENT" },
      conversation: { didConversationProgress: true, textInputAllowed: true },
    });
    expect(selectedPayload.decision.selectedRuntimeVehicleCandidateId).toBeUndefined();

    const accepted = await postConversation("http-final-discriminator", [
      ...messages.slice(0, 2),
      { id: "4", role: "user", content: "Daha fazla bagaj alanı" },
      { id: "5", role: "assistant", content: selectedPayload.message },
      { id: "6", role: "user", content: "evet" },
    ], { conversation: selectedPayload.conversation }, "10.30.0.6");
    expect(await accepted.json()).toMatchObject({
      kind: "RECOMMENDATIONS",
      decision: { conversationState: "DECISION_READY", selectedRuntimeVehicleCandidateId: "RVC-PILOT-0002" },
    });
  });

  it("keeps a pure greeting social through the public route", async () => {
    const response = await postConversation("http-greeting", [
      { id: "1", role: "user", content: "Merhaba" },
    ], {}, "10.30.0.7");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/merhaba|hoş geldiniz|yardımcı/iu);
    expect(payload.message).not.toMatch(/hangi senaryo|daraltalım|kaç koltuk/iu);
    expect(payload.conversation.requirements).toEqual([]);
    expect(payload.conversation.vehicleIntentEstablished).toBe(false);
    expect(payload.options).toBeUndefined();
  });

  it("reveals the held card after typed acceptance through the public route", async () => {
    const offer = await postConversation("http-consent", [
      { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    ], {}, "10.30.0.8");
    const offerPayload = await offer.json();
    expect(offerPayload.kind).toBe("QUESTION");
    expect(offerPayload.decision.selectedRuntimeVehicleCandidateId).toBeUndefined();
    const accepted = await postConversation("http-consent", [
      { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
      { id: "2", role: "assistant", content: offerPayload.message },
      { id: "3", role: "user", content: "evet" },
    ], { conversation: offerPayload.conversation }, "10.30.0.9");
    const acceptedPayload = await accepted.json();
    expect(acceptedPayload.kind).toBe("RECOMMENDATIONS");
    expect(acceptedPayload.recommendations).toHaveLength(1);
    expect(acceptedPayload.decision.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0001");
  });
});
