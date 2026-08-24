import { describe, expect, it } from "vitest";
import { productScopeReply } from "./productScope";
import { runV3Turn } from "./engine.server";

describe("V3 product scope", () => {
  it.each([
    "İkinci el otomatik sedan arıyorum.",
    "500-600 bin bandında temiz ikinci el araç önerir misin?",
    "İlanınızdaki araç için kapora bırakmak istiyorum.",
    "Otomatik ve km'si düşük dizel araç bakıyorum.",
  ])("states the new-car-only boundary for used selection: %s", (message) => {
    expect(productScopeReply(message)).toMatchObject({ kind: "USED_VEHICLE_SELECTION" });
    expect(productScopeReply(message)?.message).toContain("yalnızca satıştaki sıfır araç");
  });

  it.each([
    "İkinci el alırken ekspertizde nelere dikkat etmeliyim?",
    "İkinci elde kaç kilometre çok sayılır?",
    "Bir aracın ikinci el piyasası neden hızlı olur?",
  ])("does not block general used-car information: %s", (message) => {
    expect(productScopeReply(message)).toBeUndefined();
  });

  it("does not claim live inventory", () => {
    expect(productScopeReply("Stokta olan elektrikli araçları listeler misin?")).toMatchObject({ kind: "LIVE_STOCK" });
  });

  it("does not confuse delivery work with vehicle delivery availability", () => {
    expect(productScopeReply("Dükkan teslimatlarında kullanmak için manuel ticari araç alacağız.")).toBeUndefined();
  });

  it.each([
    "İlk sahibinden boyasız Volkswagen Tiguan için yazıyorum, teklife açığım.",
    "Servis bakımlı Kia Sportage için kapora gönderebilirim.",
    "Temiz bir kombi van alacağım.",
  ])("recognizes implicit used-car selection language: %s", (message) => {
    expect(productScopeReply(message)).toMatchObject({ kind: "USED_VEHICLE_SELECTION" });
  });

  it("applies the boundary through the real turn runner without recording used-car constraints", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "used-boundary", messageId: "1", message: "İkinci el otomatik sedan arıyorum.", expectedRevision: 0 });
    expect(output.message).toContain("yalnızca satıştaki sıfır araç");
    expect(output.state.revision).toBe(1);
    expect(output.state.ledger).toHaveLength(0);
  });
});
