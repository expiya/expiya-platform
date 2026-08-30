import { describe, expect, it } from "vitest";
import { answerSalesAdvisor } from "./advisor";
import type { Phase2HandoffPayload, VariantContentArtifact } from "./types";

const artifact = { schemaVersion: "variant-content/v2", artifactVersion: "2.0.0", exactVariantId: "v", catalogRelease: "c", catalogFingerprint: "f", title: "Araç Varyant", identity: { brand: "A", model: "B", trim: "C", modelYear: 2026 }, facts: [{ key: "luggage", label: "Bagaj", value: "420 litre", disposition: "VERIFIED" }, { key: "emptyMass", label: "Boş kütle", value: "1.354 kg", disposition: "FAMILY_LEVEL", scopeNote: "Yabancı pazar aile verisi" }], equipment: [], colors: [], media: [], price: { status: "UNAVAILABLE", display: "Güncel fiyat doğrulanıyor", note: "Yetkili kayıt yok." }, researchStatus: { lastReviewedAt: "2026-08-27", exactFacts: 1, scopedFacts: 1 }, sourceChecksum: "x", checksum: "y" } satisfies VariantContentArtifact;
const handoff = { version: "2.0.0", conversationId: "c", decisionFingerprint: "d", offerId: "o", selectedExactVariantId: "v", catalogRelease: "c", catalogFingerprint: "f", approvedNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }], personaMatchSummary: [], recommendationTerms: { version: "r", acceptedAt: "2026-08-20T00:00:00.000Z" }, decisionStateDigest: "s", nonce: "test_nonce_123456", issuedAt: "2026-08-20T00:00:00.000Z", expiresAt: "2026-08-21T00:00:00.000Z" } satisfies Phase2HandoffPayload;

describe("Turkish sales advisor", () => {
  it("answers a direct vehicle question concretely without invented facts", () => expect(answerSalesAdvisor({ question: "Bagaj kaç litre?", artifact, handoff }).messages[0]).toBe("Bagaj: 420 litre."));
  it("understands passenger-capacity phrasing", () => { const withSeats = { ...artifact, facts: [...artifact.facts, { key: "seats", label: "Koltuk", value: "8 kişilik", disposition: "VERIFIED" as const }] }; expect(answerSalesAdvisor({ question: "Yolcu kapasitesi nedir?", artifact: withSeats, handoff }).messages[0]).toBe("Koltuk: 8 kişilik."); });
  it("resolves compositional language through a bounded semantic plan", () => { const withSeats = { ...artifact, facts: [...artifact.facts, { key: "seats", label: "Koltuk", value: "8 kişilik", disposition: "VERIFIED" as const }] }; const semantic = { intent: "FACT_QUERY" as const, requestedFactKeys: ["seats"], requestedEquipmentKeys: [], comparisonVehicleNames: [], answerMode: "EXPLAIN_BENEFIT" as const, clarification: null, confidence: 0.98, origin: "MODEL" as const }; expect(answerSalesAdvisor({ question: "Biz sekiz kişiyiz, hepimiz birlikte seyahat edebilir miyiz?", artifact: withSeats, handoff, semantic }).messages[0]).toBe("Koltuk: 8 kişilik."); });
  it("discloses missing colors and video", () => { expect(answerSalesAdvisor({ question: "Renkleri neler?", artifact, handoff }).messages.join(" ")).toMatch(/doğrulanmış renk kaydı henüz yok/u); expect(answerSalesAdvisor({ question: "Videosu var mı?", artifact, handoff }).messages.join(" ")).toMatch(/video doğrulanmadığı/u); });
  it("answers weight with an explicit non-exact scope", () => { const reply = answerSalesAdvisor({ question: "Bu aracın ağırlığı nedir?", artifact, handoff }); expect(reply.messages[0]).toContain("1.354 kg"); expect(reply.messages.join(" ")).toContain("kesin değeri olarak sunmuyorum"); });
  it("redirects every comparison request to the personal report", () => { const reply = answerSalesAdvisor({ question: "Rakip Model ile karşılaştır", artifact, handoff }); expect(reply.messages.join(" ")).toMatch(/yalnız Araç Varyant/u); expect(reply.action).toEqual({ label: "2 araç seç ve karşılaştır", href: "#paid-comparison-title" }); });
  it("rejects off-topic requests while preserving selected-vehicle ownership help", () => {
    expect(answerSalesAdvisor({ question: "Bana yemek tarifi ver", artifact, handoff }).messages.join(" ")).toMatch(/yalnız Araç Varyant/u);
    expect(answerSalesAdvisor({ question: "Bu aracın kaskosunda neye bakmalıyım?", artifact, handoff }).messages.join(" ")).toMatch(/hasarsızlık|orijinal parça/u);
    expect(answerSalesAdvisor({ question: "Bakım aralığı nedir?", artifact, handoff }).messages.join(" ")).toMatch(/kullanım kılavuzu|bakım planı/u);
    expect(answerSalesAdvisor({ question: "Finansman seçeneklerini açıkla", artifact, handoff }).messages.join(" ")).toMatch(/toplam geri ödeme/u);
    expect(answerSalesAdvisor({ question: "İkinci el piyasası ve MTV nasıl?", artifact, handoff }).messages.join(" ")).toMatch(/gerçekleşmiş satış|resmî tarife/u);
  });
  it("summarizes all available verified technical facts", () => {
    const reply = answerSalesAdvisor({ question: "Tüm teknik özelliklerini anlat", artifact, handoff });
    expect(reply.messages.join(" ")).toContain("Bagaj: 420 litre");
    expect(reply.messages.join(" ")).not.toContain("1.354 kg");
  });
  it("does not use pressure or artificial scarcity corpus", () => { const corpus = ["Fiyatı ne?", "Dezavantajı var mı?", "Bana anlat"].flatMap((question) => answerSalesAdvisor({ question, artifact, handoff }).messages).join(" "); expect(corpus).not.toMatch(/son fırsat|hemen al|stok tüken|kaçırma|acil|only|buy now/iu); });
  it("answers multiple requested facts instead of silently dropping all but one", () => {
    const withPerformance = { ...artifact, facts: [...artifact.facts, { key: "power", label: "Güç", value: "110 kW", disposition: "VERIFIED" as const }, { key: "torque", label: "Tork", value: "250 Nm", disposition: "VERIFIED" as const }] };
    const semantic = { intent: "FACT_QUERY" as const, requestedFactKeys: ["power", "torque"], requestedEquipmentKeys: [], comparisonVehicleNames: [], answerMode: "EXPLAIN_BENEFIT" as const, clarification: null, confidence: 0.98, origin: "MODEL" as const };
    const reply = answerSalesAdvisor({ question: "Gücü ve torku ne, günlük hayatta ne fark eder?", artifact: withPerformance, handoff, semantic });
    expect(reply.messages.join(" ")).toMatch(/Güç:/u); expect(reply.messages.join(" ")).toMatch(/Tork:/u);
  });

  it("resolves a bounded follow-up from the same conversation history", () => {
    const reply = answerSalesAdvisor({ question: "Bu ne anlama geliyor?", artifact, handoff, history: [{ role: "assistant", text: "Bagaj: 420 litre." }] });
    expect(reply.messages[0]).toBe("Bagaj: 420 litre.");
  });
});
