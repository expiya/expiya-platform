import { afterEach, describe, expect, it } from "vitest";
import { runV3Turn } from "./engine.server";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

describe("Cars X advisory parity", () => {
  it.each([
    "Araçlar hakkında hiçbir şey bilmiyorum, yardımcı ol",
    "Arac secmeyi bilmiorum, nerden baslamaliyim",
    "Yeni araba konusunda yardm edermisin",
  ])("orients a novice, writes no decision context and asks one P question: %s", async (message) => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: `cars-advisory:${message}`, messageId: "1", message, expectedRevision: 0 });
    expect(output.advisory).toMatchObject({ kind: "DOMAIN_ORIENTATION", source: "DOMAIN_PACK", contextMutation: "NONE" });
    expect(output.state.ledger).toEqual([]);
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED");
    expect(output.state.lastQuestionKey).toBe("purchaseInterest");
    expect(`${output.advisory?.message} ${output.message}`).toMatch(/Tabii[\s\S]*günlük kullanım[\s\S]*yalnızca bilgi[\s\S]*kendi kullanımın/iu);
    expect(output.message.match(/\?/gu)).toHaveLength(1);
    expect(JSON.stringify(output)).not.toMatch(/semantic key|authority|taxonomy|candidate|exact/iu);
  });

  it("answers pure education without P/Y mutation and only invites continuation", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "cars-education", messageId: "1", message: "Araç seçimi hakkında genel bilgi verir misin?", expectedRevision: 0 });
    expect(output.advisory).toBeUndefined();
    expect(output.state.ledger).toEqual([]);
    expect(output.state.lastQuestionKey).toBeUndefined();
    expect(output.message).toMatch(/günlük kullanım.*yalnızca bilgi.*kendi kullanımın/iu);
  });

  it("answers the golden general buyer-guidance question before any personal P field", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "cars-golden-general-information", messageId: "1", message: "araba alırken en çok neye dikkat etmek gerekir?", expectedRevision: 0 });
    expect(output.state).toMatchObject({ purchaseIntent: "NOT_EXPRESSED", ledger: [] });
    expect(output.state.lastQuestionKey).toBeUndefined();
    expect(output.advisory).toBeUndefined();
    expect(output.message).toMatch(/günlük kullanım.*güvenlik.*bakım.*toplam sahip olma maliyeti.*garanti.*teslimat.*bütçe/iu);
    expect(output.message).toMatch(/yalnızca bilgi.*kendi kullanımın/iu);
    expect(output.message).not.toMatch(/Aracı en çok hangi|bütçe üst sınırı|yakıt seçeneklerini seç/iu);
  });

  it("combines X orientation with one P question for education plus active buying", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    const output = await runV3Turn({ conversationId: "cars-mixed-advisory", messageId: "1", message: "Araçlar hakkında genel bilgi istiyorum ve satın almak istiyorum", expectedRevision: 0 });
    expect(output.state.ledger).toEqual([]);
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    expect(output.message).toMatch(/Tabii.*günlük kullanım/iu);
    expect(output.message.match(/\?/gu)).toHaveLength(1);
  });

  it("preserves and resumes the pending P question", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    let output = await runV3Turn({ conversationId: "cars-advisory-resume", messageId: "1", message: "Yeni araç satın almak istiyorum", expectedRevision: 0 });
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    const before = output.state.ledger;
    output = await runV3Turn({ conversationId: "cars-advisory-resume", messageId: "2", message: "Nereden başlamalıyım? Hiç bilgim yok", expectedRevision: 1, state: output.state });
    expect(output.advisory?.contextMutation).toBe("NONE");
    expect(output.state.lastQuestionKey).toBe("primaryUsage");
    expect(output.state.ledger).toEqual(before);
  });
});
