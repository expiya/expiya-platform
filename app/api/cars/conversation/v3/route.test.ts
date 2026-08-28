import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";
import { resetV31StoreForTests } from "@/features/decision/v3/store.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => {
  resetV31StoreForTests();
  if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled;
});

const request = (conversationId: string, message: string) => POST(new Request("http://localhost/api/cars/conversation/v3", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ conversationId, messageId: "m1", message, expectedRevision: 0, includePilotDiagnostics: true }),
}));

describe("production-facing POST /api/cars/conversation/v3", () => {
  it.each([
    ["Yolcu taşıma amaçlı araç arıyorum.", "PASSENGER_TRANSPORT", "passengerCapacity"],
    ["Kongre katılımcılarını otelleri ile etkinlik alanı arasında taşımak için sıfır bir araç arıyoruz.", "PASSENGER_TRANSPORT", "passengerCapacity"],
    ["Saha ekibimiz bayileri ve müşterileri ziyaret etmek için yeni bir otomobil kullanacak.", "CORPORATE_TRAVEL", undefined],
    ["Kolili ürünleri mağazalara dağıtmak için sıfır bir araç satın alacağım.", "COMMERCIAL", undefined],
    ["Şehir içinde kullanacağım, daha ferah ve yüksek bir araç arıyorum.", "URBAN_DAILY", undefined],
    ["Çocuklarımla şehir içinde kullanacağım bir araç istiyorum.", "FAMILY", undefined],
    ["Her hafta şehirler arası yol yapacağım.", "LONG_DISTANCE", undefined],
    ["Bozuk köy yollarında kullanacağım.", "MIXED_ROAD", undefined],
  ])("uses the same semantic contract without a pilot query: %s", async (message, expected, question) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const response = await request(`public:${expected}`, message);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ concept: "primaryUsage", normalizedValue: expected, authority: "USER_EXPLICIT" })]));
    expect(body.message).not.toMatch(/candidate|ledger|route/iu);
    expect(body.state.lastQuestionKey).not.toBe("primaryUsage");
    if (question) expect(body.state.lastQuestionKey).toBe(question);
  });

  it("keeps vague business use unresolved and asks one public clarification", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const response = await request("public:business-vague", "İşim için araç arıyorum.");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state.ledger.some((item: { concept: string }) => item.concept === "primaryUsage")).toBe(false);
    expect(body.state.lastQuestionKey).toBe("primaryUsage");
    expect((body.message.match(/\?/gu) ?? [])).toHaveLength(1);
  });
});
