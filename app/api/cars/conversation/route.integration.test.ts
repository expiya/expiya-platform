import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/cars/conversation evidence-backed journey", () => {
  it("retains unsupported requirements and repairs the exact public-route failure without looping", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.30.0.1" },
      body: JSON.stringify({ conversationId: "http-exact-loop-regression", messages: [
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
      ] }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/pickup.*anladım.*kayıtlı.*tekrar sormayacağım/iu);
    expect(payload.message).not.toMatch(/vazgeçilmez|günlük hayatınızdan/iu);
    expect(payload.conversation).toMatchObject({
      state: "INSUFFICIENT_SUPPORTED_EVIDENCE",
      didConversationProgress: false,
      requirements: expect.arrayContaining([
        expect.objectContaining({ key: "BUDGET_MAX_TRY", value: 2_000_000, sourceTurn: 3 }),
        expect.objectContaining({ key: "DRIVETRAIN", value: "AWD_OR_4X4", sourceTurn: 4, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
        expect.objectContaining({ key: "BODY_TYPE", value: "PICKUP", sourceTurn: 5, status: "UNDERSTOOD_BUT_UNSUPPORTED" }),
      ]),
    });
  });

  it.each([
    "arazi aracı var mı sizde",
    "off-road araç bakıyorum",
    "stabilize yolda kullanacağım",
    "kamp yolu için araç arıyorum",
    "kötü yol şartlarına uygun olsun",
  ])("routes first-turn usage intent before budget through the public handler: %s", async (content) => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: `http-usage-${content}`, messages: [
        { id: "1", role: "user", content },
      ] }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/arazi.*kötü yol/iu);
    expect(payload.message).toMatch(/kamp.*stabilize|çamurlu|ciddi arazi/iu);
    expect(payload.message).not.toMatch(/üst bütçe|Bilmiyorsanız bunu da söyleyebilirsiniz/iu);
  });

  it.each(["ne gibi?", "nasıl yani?", "anlamadım"])(
    "explains usage without repeating or asking budget through the public handler: %s",
    async (repair) => {
      const firstMessage = "Evet, arazi ve kötü yol kullanımına uygun araçları değerlendirebiliriz. Daha çok kamp ve stabilize yol mu, çamurlu/kötü yollar mı, yoksa ciddi arazi kullanımı mı düşünüyorsunuz?";
      const response = await POST(new Request("http://localhost/api/cars/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: `http-usage-repair-${repair}`, messages: [
          { id: "1", role: "user", content: "arazi aracı var mı sizde" },
          { id: "2", role: "assistant", content: firstMessage },
          { id: "3", role: "user", content: repair },
        ] }),
      }));

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.message).toMatch(/örneğin.*stabilize.*çamurlu.*dik/iu);
      expect(payload.message).not.toBe(firstMessage);
      expect(payload.message).not.toMatch(/üst bütçe|Bilmiyorsanız bunu da söyleyebilirsiniz/iu);
    },
  );

  it("suppresses the reported repeated follow-up through the real HTTP handler", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: "http-budget-repair", messages: [
        { id: "1", role: "user", content: "Araba almak istiyorum." },
        { id: "2", role: "assistant", content: "Yaklaşık üst bütçeniz nedir?" },
        { id: "3", role: "user", content: "ne gibi?" },
      ] }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.message).toMatch(/örneğin 1,5 milyon TL/iu);
    expect(payload.message).not.toBe("Yaklaşık üst bütçeniz nedir?");
    expect(payload).not.toHaveProperty("decision");
  });

  it("crosses the real HTTP handler, transcript bridge, governed runtime, and additive response contract", async () => {
    const response = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: "http-evidence-journey", messages: [
        { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
        { id: "2", role: "assistant", content: "Bagaj için zorunlu minimum hacim nedir?" },
        { id: "3", role: "user", content: "300 litre bagaj istiyorum." },
      ] }),
    }));

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ kind: "QUESTION", decision: {
      conversationState: "DECISION_READY", decisionStatus: "DECISION_READY", evidenceBacked: true,
      selectedRuntimeVehicleCandidateId: "RVC-PILOT-0001", selectedVehicle: { brand: "Hyundai", model: "IONIQ 9" },
      requirements: [
        { factKey: "seats", predicate: "AT_LEAST", value: 7 },
        { factKey: "cargo_volume_l", predicate: "AT_LEAST", value: 300 },
      ],
    } });
    expect(payload.message).toMatch(/7 koltuk.*338 L bagaj/iu);
  });

  it("exposes and enforces the structured final discriminator through the public handler", async () => {
    const first = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "10.30.0.2" },
      body: JSON.stringify({ conversationId: "http-final-discriminator", messages: [
        { id: "1", role: "user", content: "En az 5 koltuk ve 350 litre bagaj istiyorum." },
      ] }),
    }));
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
    const rejected = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "10.30.0.3" },
      body: JSON.stringify({ conversationId: "http-final-discriminator", messages }),
    }));
    expect(rejected.status).toBe(409);

    const selected = await POST(new Request("http://localhost/api/cars/conversation", {
      method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "10.30.0.4" },
      body: JSON.stringify({ conversationId: "http-final-discriminator", choiceId: "MAX_CARGO", messages: [
        ...messages.slice(0, 2), { id: "4", role: "user", content: "Daha fazla bagaj alanı" },
      ] }),
    }));
    expect(await selected.json()).toMatchObject({ decision: {
      conversationState: "DECISION_READY", selectedRuntimeVehicleCandidateId: "RVC-PILOT-0002",
    }, conversation: { didConversationProgress: true, textInputAllowed: true } });
  });
});
