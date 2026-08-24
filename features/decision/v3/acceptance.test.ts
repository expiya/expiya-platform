import { describe, expect, it } from "vitest";
import { activeDecisionPreferences } from "./ledger";
import { evaluateV3Catalog } from "./catalogAdapter.server";
import { createV3ConversationState, runV3Turn } from "./engine.server";
import { routeConversationMessage } from "./router";
import type { V3ConversationState } from "./types";

async function conversation(id: string, messages: readonly string[]) {
  let state: V3ConversationState = createV3ConversationState(id); let output;
  for (const [index, message] of messages.entries()) { output = await runV3Turn({ conversationId: id, messageId: `${id}-${index}`, message, expectedRevision: state.revision, state }); state = output.state; }
  return output!;
}

describe("V3 required conversation acceptance corpus", () => {
  it.each(["Merhaba", "Yarın okulda sınav var.", "Dün akşamki maçı izledin mi?", "Yeni telefon almalıyım; iPhone mu Samsung mu?", "Bugün hava çok sıcak."])("keeps %s decision-neutral", async (message) => {
    const output = await conversation(`neutral-${message}`, [message]);
    expect(output.state.ledger).toHaveLength(0); expect(output.message).not.toMatch(/\d+\s+(?:aday|araç|seçenek)/iu);
  });

  it("treats climate equipment as a preference only when the user says so", async () => {
    const output = await conversation("climate", ["Hava sıcak, klimalı araç olsun."]);
    expect(output.state.ledger.every((item) => item.concept !== "weather")).toBe(true);
  });

  it.each([
    "Bebeğimiz olacak; yeni araca ihtiyacımız var.", "Bütçemiz fazla değil, ekonomik bir şey bakıyoruz.",
    "Toplu taşımadan yoruldum, araç almak istiyorum.", "Dört kişilik aileyiz, kamp yapıyoruz, bozuk yola gidiyoruz.",
    "Küçük elektrikli araç istiyorum.", "Vito tarzı araç istiyorum.", "Performans arabası istiyorum.",
    "Golf gibi ama daha yüksek olsun.", "Uzun yolda yormasın.", "Elektrikli olsun.",
  ])("returns natural copy without internal counts for %s", async (message) => {
    const output = await conversation(`natural-${message}`, ["Araç almak istiyorum", message]);
    expect(output.message).not.toMatch(/candidate|ledger|route|\d+\s+(?:aday|seçenek)/iu);
    expect((output.message.match(/\?/gu) ?? []).length).toBeLessThanOrEqual(1);
  });

  it.each(["Ne önemi var?", "Bunların ne anlama geldiğini bilmiyorum."])("handles uncertainty without inventing facts: %s", async (message) => {
    const output = await conversation(`uncertain-${message}`, ["Araç almak istiyorum", message]);
    expect(output.state.ledger.every((item) => item.sourceSpan.text !== message || item.authority !== "MODEL_INFERENCE")).toBe(true);
  });

  it("keeps general automotive information from becoming a preference", async () => {
    const output = await conversation("knowledge", ["Önden çekiş ile arkadan itiş farkını bilmiyorum."]);
    expect(output.state.purchaseIntent).toBe("NOT_EXPRESSED"); expect(output.state.ledger).toHaveLength(0);
  });

  it("skips transmission after BEV and body-style after explicit SUV", async () => {
    const electric = await conversation("bev", ["Araç almak istiyorum", "Elektrikli olsun."]);
    expect(electric.message).not.toMatch(/şanzıman|otomatik|manuel/iu);
    const suv = await conversation("suv", ["Araç almak istiyorum", "SUV olsun."]);
    expect(suv.message).not.toMatch(/gövde|hatchback|sedan listesi/iu);
  });

  it("widens the candidate universe after relaxation", async () => {
    const suv = await conversation("widen", ["Araç almak istiyorum", "SUV olsun."]);
    const before = await evaluateV3Catalog(suv.state.ledger);
    const relaxed = await runV3Turn({ conversationId: "widen", messageId: "relax", message: "Vazgeçtim, hatchback de olabilir.", expectedRevision: suv.state.revision, state: suv.state });
    const after = await evaluateV3Catalog(relaxed.state.ledger);
    expect(activeDecisionPreferences(relaxed.state.ledger).find((item) => item.concept === "bodyStyle")?.normalizedValue).toBe("HATCHBACK");
    expect(after.candidateIds).not.toEqual(before.candidateIds);
  });

  it("projects confirmed mixed-road use to body style, never the weak signal", async () => {
    const weak = await conversation("camp-projection", ["Araç almak istiyorum", "Dört kişilik aileyiz, kamp yapıyoruz, bozuk yola gidiyoruz."]);
    const before = await evaluateV3Catalog(weak.state.ledger); expect(before.variants.some((item) => !item.decisionFacts.bodyStyle.value.toUpperCase().includes("SUV"))).toBe(true);
    const confirmed = await runV3Turn({ conversationId: "camp-projection", messageId: "yes", message: "Evet, değerlendirelim", expectedRevision: weak.state.revision, state: weak.state });
    const after = await evaluateV3Catalog(confirmed.state.ledger); expect(after.candidateIds.length).toBeLessThan(before.candidateIds.length);
    expect(after.variants.every((item) => item.decisionFacts.bodyStyle.value.toUpperCase().includes("SUV"))).toBe(true);
  });

  it("adds, corrects and clears a budget append-only", async () => {
    const output = await conversation("budget", ["Araç almak istiyorum", "Bütçem maksimum 2 milyon", "Düzeltme: bütçem maksimum 3 milyon", "Bütçeyi kaldır"]);
    expect(output.state.ledger.filter((item) => item.concept === "budgetMax").length).toBeGreaterThanOrEqual(3);
    expect(activeDecisionPreferences(output.state.ledger).some((item) => item.concept === "budgetMax")).toBe(false);
  });

  it("returns one car by default and at most three requested alternatives", async () => {
    const one = await conversation("one", ["Yeni araç almak istiyorum", "Şehir içinde günlük kullanacağım", "Parkı kolay kompakt bir yapı olsun", "Kesin bütçem 3 milyon TL", "Elektrikli olsun", "Geri görüş kamerası kesin olsun", "Tek araç öner", "Evet, göster"]); expect(one.recommendations?.length).toBe(1);
    const alternatives = await conversation("three", ["Yeni araç almak istiyorum", "Aile kullanımı için", "Daha ferah ve yüksek olsun", "Bütçe sorun değil", "Benzinli olsun", "Geri görüş kamerası kesin olsun", "Toyota olabilir", "Alternatif göster", "Evet, göster"]); expect(alternatives.recommendations?.length).toBeGreaterThan(0); expect(alternatives.recommendations?.length).toBeLessThanOrEqual(3);
  });

  it("uses a bounded deterministic path when no provider is configured", async () => {
    const output = await conversation("outage", ["Araç almak istiyorum"]); expect(output.message.length).toBeGreaterThan(10);
  });

  it("ends naturally after five non-intent observations", async () => {
    const output = await conversation("five", ["Merhaba", "Yarın sınav var", "Maç nasıldı?", "Hava sıcak", "Teşekkürler, bu kadar"]);
    expect(output.state.purchaseIntent).toBe("ENDED_WITHOUT_INTENT"); expect(output.state.ended).toBe(true);
  });

  it("keeps route contract complete", () => {
    const result = routeConversationMessage("Araç almak istiyorum", { hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result).toMatchObject({ version: "3.8", route: "PURCHASE_INTENT_DISCOVERY", decisionMutationAllowed: true });
    expect(result.purchaseIntentEvidence[0]?.text).toBe("Araç almak istiyorum");
  });
});
