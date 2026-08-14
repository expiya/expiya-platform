import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/cars/conversation evidence-backed journey", () => {
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
});
