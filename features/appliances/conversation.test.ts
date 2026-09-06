import { beforeAll, describe, expect, it } from "vitest";
import { createFileSystemAppliancesArtifactRepository } from "./authority/loader.server";
import { enterAppliancesDepartment } from "./entry.server";
import { MemoryAppliancesConversationStore } from "./persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "./persistence/service";
import { runAppliancesConversationTurn } from "./conversation.server";
import { loadRecommendationAuthority, type RecommendationAuthority } from "./recommendation/current.server";
import { activeCatalogPriceFixture } from "./testing/activeCatalogPriceFixture";

const now = new Date("2026-09-03T06:00:00Z"), conversationId = "11111111-1111-4111-8111-111111111111";
let bundle: RecommendationAuthority;
beforeAll(async () => { const loaded = await loadRecommendationAuthority(process.cwd(), now); bundle = { ...loaded, price: activeCatalogPriceFixture(loaded.authority) }; });
async function fixture() {
  const store = new MemoryAppliancesConversationStore();
  const entry = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()), productType: "WASHING_MACHINE", conversationId, now });
  if (entry.status !== "READY") throw new Error(entry.status);
  await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create", payload: "create" });
  const run = async (message: string, messageId = message, expectedRevision?: number) => runAppliancesConversationTurn({ store, authority: bundle.authority, conversationId, messageId, message, expectedRevision: expectedRevision ?? (await store.load(conversationId))!.state.revision, now, loadAuthority: async () => bundle });
  return { store, run };
}
describe("Appliances atomic public orchestration", () => {
  it("enforces Bosch as an append-only hard constraint and never reopens deferred budget", async () => {
    const { run, store } = await fixture();
    const brand = await run("bosch çamaşır makinesi arıyorum", "brand-1");
    expect(brand).toMatchObject({ status: "OK", outcome: { kind: "ASK" } });
    if (brand.status !== "OK") return;
    expect(brand.outcome).not.toMatchObject({ questionKey: "appliances.wm.budget.maximumTry" });
    expect(brand.state.brandConstraintEvents).toEqual(expect.arrayContaining([expect.objectContaining({ brandId: "bosch", decisionUse: "HARD_FILTER", status: "ACTIVE" })]));
    const budgetAsk = await run("evet", "brand-2");
    expect(budgetAsk).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.budget.maximumTry" } });
    const final=await run("bilmiyorum", "brand-3");
    expect(final).toMatchObject({ status: "OK", outcome: { kind: "DECISION_READY",card:{identity:{brand:"Bosch"}} }, state: { questionDeferrals: [expect.objectContaining({ questionKey: "appliances.wm.budget.maximumTry", status: "ACTIVE" })] } });
    expect((await store.load(conversationId))!.state.questionDeferrals).toEqual(expect.arrayContaining([expect.objectContaining({questionKey:"appliances.wm.budget.maximumTry",status:"ACTIVE"})]));
  });
  it("supports brand correction, explicit clear, and unknown-brand clarification without mutation", async()=>{const{run}=await fixture();const bosch=await run("Bosch marka istiyorum","brand-life-1");expect(bosch).toMatchObject({status:"OK",state:{brandConstraintEvents:[expect.objectContaining({brandId:"bosch",status:"ACTIVE"})]}});const samsung=await run("aslında Samsung marka istiyorum","brand-life-2");expect(samsung).toMatchObject({status:"OK",state:{brandConstraintEvents:[expect.objectContaining({brandId:"bosch",status:"ACTIVE"}),expect.objectContaining({brandId:"bosch",status:"SUPERSEDED"}),expect.objectContaining({brandId:"samsung",status:"ACTIVE"})]}});const unknown=await run("Acme marka istiyorum","brand-life-3");expect(unknown).toMatchObject({status:"OK",outcome:{kind:"CLARIFY",questionKey:"appliances.brand.unknown"}});if(unknown.status==="OK")expect(unknown.state.brandConstraintEvents).toHaveLength(3);const cleared=await run("marka tercihi kaldır","brand-life-4");expect(cleared).toMatchObject({status:"OK",state:{brandConstraintEvents:[expect.anything(),expect.anything(),expect.anything(),expect.objectContaining({status:"CLEARED",brandId:"samsung"})]}});});
  it("continues needs-first after soft affordability, non-discriminating capacity and unknown budget", async () => {
    const { run, store } = await fixture();
    const affordable = await run("ekonomik bir model arıyorum", "needs-1");
    expect(affordable).toMatchObject({ status: "OK", outcome: { kind: "ASK" }, state: { budgetMode: "NEEDS_ONLY" } });
    if (affordable.status !== "OK") return;
    expect(affordable.outcome).not.toMatchObject({ questionKey: "appliances.wm.budget.maximumTry" });
    expect(affordable.state.planningSignals).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "SOFT_AFFORDABILITY", sourceMessageId: "needs-1", decisionUse: "NONE" })]));
    const capacity = await run("3 kg kapasite yeterli", "needs-2");
    expect(capacity).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.budget.maximumTry" } });
    if (capacity.status !== "OK") return;
    expect(capacity.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ conceptId: "HIGH_LAUNDRY_VOLUME", normalizedValue: { minimumCapacityKg: 3, contextOnly: false } })]));
    const unknown = await run("bilmiyorum", "needs-3");
    expect(unknown).toMatchObject({ status: "OK", outcome: { kind: "ASK" }, state: { budgetMode: "NEEDS_ONLY" } });
    if (unknown.status !== "OK") return;
    expect(unknown.outcome).not.toMatchObject({ questionKey: "appliances.wm.budget.maximumTry" });
    expect((await store.load(conversationId))!.state.askedQuestionKeys.filter(key => key === "appliances.wm.budget.maximumTry")).toHaveLength(1);
  });
  it("answers an interrupted catalog-price question without consuming the pending ASK", async () => {
    const { run, store } = await fixture();
    const first = await run("çamaşır makinesi almak istiyorum. en ucuz model", "cheap-1");
    expect(first).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.remoteControl.requirement" }, state: { budgetMode: "NEEDS_ONLY" } });
    const before = first.status === "OK" ? first.state.ledger : [];
    const information = await run("katalogdaki en ucuz çamaşır makinesi hangisi?", "cheap-2");
    expect(information).toMatchObject({ status: "OK", outcome: { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" }, state: { lastQuestionKey: "appliances.wm.remoteControl.requirement", budgetMode: "NEEDS_ONLY" } });
    if (information.status !== "OK" || !("message" in information.outcome)) return;
    expect(information.outcome.message).toContain("Beko CMX 8100");
    expect(information.outcome.message).toContain("22.849,5 TL");
    expect(information.outcome.message).toContain("29 doğrulanmış ürünün 19");
    expect(information.outcome.message).toContain("Fiyatı bilinmeyen ürünler:");
    expect(information.outcome.message).toContain("kesin olarak en ucuz olduğu anlamına gelmez");
    expect(information.state.ledger).toEqual(before);
    const remote = await run("hayır", "cheap-3");
    expect(remote).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.budget.maximumTry" } });
    const budget = await run("5000", "cheap-4");
    expect(budget).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.autoDosing.preference" }, state: { budgetMode: "BUDGET_AS_DECISION_FILTER", budgetMetadata: { amountTry: 5000, includedInDecision: true } } });
    expect((await store.load(conversationId))!.state.askedQuestionKeys.filter(key => key === "appliances.wm.budget.maximumTry")).toHaveLength(1);
    expect(await run("evet", "cheap-5")).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.noise.priority" } });
    expect(await run("evet", "cheap-6")).toMatchObject({ status: "OK", outcome: { kind: "CLARIFY", questionKey: "UNRESOLVED_HARD_UNCERTAINTY" } });
  });
  it("keeps a standalone budget statement out of the decision filter until explicit activation", async () => {
    const { run } = await fixture();
    const result = await run("Bütçem 20 bin TL", "soft-budget");
    expect(result).toMatchObject({ status: "OK", state: { budgetMode: "NEEDS_ONLY" } });
    if (result.status !== "OK") return;
    expect(result.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ conceptId: "BUDGET_SENSITIVITY", normalizedValue: { maximumTry: 20_000 }, decisionUse: "NONE", strength: "SOFT" })]));
  });
  it("binds the reported transcript to the outstanding questions without repeating remote control", async () => {
    const { run, store } = await fixture();
    const household = await run("çamaşır makinesine ihtiyacım var. 2 kişi yaşıyoruz.", "transcript-1");
    expect(household).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.budget.maximumTry" } });
    const budget = await run("10 Bin TL", "transcript-2");
    expect(budget).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.remoteControl.requirement" } });
    const remoteNo = await run("gerek yok", "transcript-3");
    expect(remoteNo).toMatchObject({ status: "OK" });
    if (remoteNo.status !== "OK") return;
    expect(remoteNo.outcome).not.toMatchObject({ kind: "CLARIFY", questionKey: "UNRESOLVED_MESSAGE" });
    expect(remoteNo.outcome).not.toMatchObject({ questionKey: "appliances.wm.remoteControl.requirement" });
    const quiet = await run("sessiz olsun", "transcript-4");
    expect(quiet).toMatchObject({ status: "OK" });
    if (quiet.status !== "OK") return;
    expect(quiet.outcome).not.toMatchObject({ questionKey: "appliances.wm.remoteControl.requirement" });
    const state = (await store.load(conversationId))!.state;
    expect(state.askedQuestionKeys.filter(key => key === "appliances.wm.remoteControl.requirement")).toHaveLength(1);
    expect(state.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ conceptId: "LOAD_CONSOLIDATION", normalizedValue: { householdSize: 2, capacityConstraint: false } }),
      expect.objectContaining({ conceptId: "BUDGET_SENSITIVITY", normalizedValue: { maximumTry: 10_000 }, decisionUse: "HARD_FILTER" }),
      expect.objectContaining({ conceptId: "REMOTE_CONTROL", normalizedValue: { wanted: false }, decisionUse: "NONE" }),
      expect.objectContaining({ conceptId: "LOW_NOISE_PRIORITY", normalizedValue: true }),
    ]));
    const last = await run("hayır", "transcript-5");
    expect(last).toMatchObject({ status: "OK" });
    if (last.status !== "OK") return;
    if (quiet.outcome.kind === "ASK") {
      expect(last.outcome).not.toMatchObject({ questionKey: "UNBOUND_CONFIRMATION" });
      expect(last.state.ledger.some(event => event.sourceMessageId === "transcript-5" && event.decisionUse === "NONE")).toBe(true);
    } else expect(last.outcome).toMatchObject({ kind: "CLARIFY", questionKey: "UNBOUND_CONFIRMATION" });
  });
  it("converses from material ASK through natural answers into a persisted authorized card", async () => {
    const { store, run } = await fixture();
    const ask = await run("Çamaşır makinesi arıyorum");
    expect(ask).toMatchObject({ status: "OK", outcome: { kind: "ASK", questionKey: "appliances.wm.budget.maximumTry" }, state: { revision: 2 } });
    const ready = await run("23 bin TL");
    // Unknown-price alternatives remain available for questions, so answer preferences explicitly.
    if (ready.status !== "OK") throw new Error(ready.status);
    const result = ready.outcome.kind === "DECISION_READY" ? ready : await run("Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil");
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "DECISION_READY", card: { identity: { model: "CMX 8100" } } } });
    const stored = await store.load(conversationId);
    expect(stored!.state.decisionRecord?.authorization.artifactFingerprint).toBe(stored!.state.decisionRecord?.artifact.deterministicArtifactFingerprint);
  });
  it("persists idempotent replay and rejects competing revision/payloads", async () => {
    const { run } = await fixture();
    const first = await run("Bütçemi karar filtresi olarak kullan; en fazla 23000 TL, Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil", "m", 1);
    expect(first).toMatchObject({ status: "OK", outcome: { kind: "DECISION_READY" } });
    expect(await run("Bütçemi karar filtresi olarak kullan; en fazla 23000 TL, Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil", "m", 1)).toMatchObject({ status: "OK", replayed: true });
    expect(await run("Başka mesaj", "m", 1)).toEqual({ status: "MESSAGE_PAYLOAD_CONFLICT" });
    expect(await run("Yeni mesaj", "other", 1)).toEqual({ status: "REVISION_CONFLICT" });
  });
  it("reopens an answered binary preference only after an intentional clear",async()=>{const{run,store}=await fixture();await run("Çamaşır makinesi arıyorum","r1");await run("10 bin TL","r2");const answered=await run("gerek yok","r3");expect(answered.status).toBe("OK");if(answered.status!=="OK")return;expect(answered.state.ledger.some(e=>e.conceptId==="REMOTE_CONTROL"&&e.decisionUse==="NONE")).toBe(true);const cleared=await run("Uzaktan kontrol tercihini unut","r4");expect(cleared.status).toBe("OK");if(cleared.status!=="OK")return;expect(cleared.state.ledger.some(e=>e.conceptId==="REMOTE_CONTROL"&&e.status==="CLEARED")).toBe(true);expect(cleared.outcome).toMatchObject({kind:"ASK",questionKey:"appliances.wm.remoteControl.requirement"});expect((await store.load(conversationId))?.state.lastQuestionKey).toBe("appliances.wm.remoteControl.requirement");});
  it.each([ ["Teşekkürler", "SOCIAL_ACKNOWLEDGEMENT"], ["Buhar nedir?", "DOMAIN_INFORMATION"], ["Hava nasıl", "OFF_TOPIC_REDIRECT"], ["Elektrik kablosunu tamir edeyim mi", "SAFETY_BOUNDARY"], ["Kapatalım", "USER_CLOSING"] ])("preserves RESPOND without authorization: %s", async (message, responseKind) => {
    const { run, store } = await fixture(); const result = await run(message);
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "RESPOND", responseKind } });
    if (result.status === "OK") expect(result.outcome).not.toHaveProperty("card");
    expect((await store.load(conversationId))!.state.decisionRecord).toBeUndefined();
  });
  it("requires confirmation, rejects ambiguous confirmation durably, and preserves correction/clear", async () => {
    const { run, store } = await fixture();
    expect(await run("Evet", "unbound", 1)).toMatchObject({ status: "OK", outcome: { kind: "CLARIFY" } });
    expect(await run("Evet", "unbound", 1)).toMatchObject({ status: "OK", replayed: true });
    expect(await run("Gece çalıştıracağım rahatsız etmesin")).toMatchObject({ status: "OK", outcome: { kind: "CLARIFY" } });
    expect(await run("Evet")).toMatchObject({ status: "OK", outcome: { kind: "ASK" } });
    await run("Bütçem 30000 TL");
    await run("Aslında bütçem 23000 TL");
    const corrected = (await store.load(conversationId))!.state;
    expect(corrected.ledger.some(e => e.status === "SUPERSEDED")).toBe(true);
    await run("Bütçemi unut");
    expect((await store.load(conversationId))!.state.ledger.some(e => e.status === "CLEARED")).toBe(true);
  });
  it("returns honest no-selection and stale-price uncertainty, not a winner or empty failure", async () => {
    const { run, store } = await fixture();
    const result = await run("Bütçemi karar filtresi olarak kullan; en fazla 100000 TL, Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil");
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "CLARIFY", selectionState: { kind: "NO_RECOMMENDATION_CONSTRUCTIBLE" } } });
    const stale = await loadRecommendationAuthority(process.cwd(), new Date("2026-09-05"));
    const next = await runAppliancesConversationTurn({ store, authority: bundle.authority, conversationId, messageId: "stale", expectedRevision: 2, message: "Çamaşır makinesi öner", now: stale.now, loadAuthority: async () => stale });
    expect(next).toMatchObject({ status: "OK", outcome: { kind: "FAILED_CLOSED" } });
  });
  it("fails dependency failure closed without committing a recommendation", async () => {
    const { store } = await fixture();
    const result = await runAppliancesConversationTurn({ store, authority: bundle.authority, conversationId, messageId: "bad", expectedRevision: 1, message: "Çamaşır makinesi", now, loadAuthority: async () => { throw new Error("MISSING_POLICY"); } });
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "FAILED_CLOSED" }, state: { revision: 2 } });
    expect((await store.load(conversationId))!.state.decisionRecord).toBeUndefined();
  });
});
