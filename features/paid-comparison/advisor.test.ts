import { describe, expect, it } from "vitest";
import { answerPaidComparisonAdvisor, paidComparisonAdvisorReportSchema } from "./advisor";

const vehicle = (id: string, brand: string, model: string, price: number, range: number) => ({ exactVariantId: id, role: id === "a" ? "DECISION_CARD" : "ALTERNATIVE", identity: { brand, model, trim: "Plus", sources: [] }, price: { value: price, missing: false, validFrom: null, confidence: "HIGH", sources: [] }, facts: { electricRangeKm: { value: range, missing: false, confidence: "HIGH", sources: [] }, luggageLitres: { value: id === "a" ? 400 : 500, missing: false, confidence: "HIGH", sources: [] } } });
const report = paidComparisonAdvisorReportSchema.parse({ schemaVersion: "paid-comparison-report/v1", generatedAt: "2026-08-30T00:00:00Z", catalogReleaseVersion: "1", needsSummary: [{ concept: "range", summary: "Uzun menzil" }], assessment: { conclusion: "Ortak veriler karşılaştırıldı.", leaders: ["b"], scores: [{ exactVariantId: "a", score: 70, evaluatedNeedCount: 1, totalApprovedNeedCount: 1, breakdown: [] }, { exactVariantId: "b", score: 90, evaluatedNeedCount: 1, totalApprovedNeedCount: 1, breakdown: [] }, { exactVariantId: "c", score: 80, evaluatedNeedCount: 1, totalApprovedNeedCount: 1, breakdown: [] }], conditions: [{ exactVariantId: "b", text: "Menzil önceliğinde öne çıkar." }] }, vehicles: [vehicle("a", "Marka A", "Model A", 1_000_000, 400), vehicle("b", "Marka B", "Model B", 1_200_000, 550), vehicle("c", "Marka C", "Model C", 900_000, 450)] });

describe("paid comparison advisor", () => {
  it("compares all three paid-report vehicles on a requested metric", () => {
    const reply = answerPaidComparisonAdvisor({ question: "Menzillerini karşılaştır", report });
    expect(reply.messages.join(" ")).toMatch(/400/u); expect(reply.messages.join(" ")).toMatch(/550/u); expect(reply.messages.join(" ")).toMatch(/450/u);
  });
  it("explains the personalized comparison without claiming general quality", () => {
    const reply = answerPaidComparisonAdvisor({ question: "Hangisi benim için daha iyi?", report });
    expect(reply.messages.join(" ")).toContain("90/100"); expect(reply.messages.join(" ")).toMatch(/genel araç kalitesi/u);
  });
  it("creates a sales action only when exactly one report vehicle is named", () => {
    const reply = answerPaidComparisonAdvisor({ question: "Marka B Model B için test sürüşü istiyorum", report });
    expect(reply.action).toEqual({ exactVariantId: "b", intent: "REQUEST_TEST_DRIVE", label: "Test sürüşü adımına geç" });
    expect(answerPaidComparisonAdvisor({ question: "Test sürüşü istiyorum", report }).action).toBeUndefined();
  });
  it("cannot discuss a vehicle outside the purchased report", () => {
    const reply = answerPaidComparisonAdvisor({ question: "Başka Model hakkında ne düşünüyorsun?", report });
    expect(reply.messages.join(" ")).toMatch(/rapordaki üç araç/u);
  });
});
