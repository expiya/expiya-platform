import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryAppliancesConversationStore } from "@/features/appliances/persistence/memoryStore.testSupport";
const fixture = vi.hoisted(() => ({ store: undefined as unknown as MemoryAppliancesConversationStore, unavailable: false }));
vi.mock("@/features/appliances/persistence/initialize.server", () => ({ initializeAppliancesStore: async () => fixture.unavailable ? { status: "UNAVAILABLE", reason: "MIGRATION_TABLES_MISSING" } : { status: "READY", pool: {} } }));
vi.mock("@/features/appliances/persistence/postgresStore.server", () => ({ PostgresAppliancesConversationStore: class { constructor() { return fixture.store; } } }));
vi.mock("@/features/appliances/recommendation/current.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/appliances/recommendation/current.server")>();
  const { activeCatalogPriceFixture } = await import("@/features/appliances/testing/activeCatalogPriceFixture");
  return { ...actual, loadRecommendationAuthority: async (...args: Parameters<typeof actual.loadRecommendationAuthority>) => {
    const bundle = await actual.loadRecommendationAuthority(...args);
    return { ...bundle, price: activeCatalogPriceFixture(bundle.authority, args[1].getTime() >= new Date("2026-09-05T00:00:00Z").getTime() ? "STALE" : "READY") };
  } };
});
import { POST } from "./route";
const conversationId = "11111111-1111-4111-8111-111111111111";
const post = (body: unknown) => POST(new Request("http://localhost/api/appliances/conversation", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify(body) }));
beforeEach(() => { fixture.store = new MemoryAppliancesConversationStore(); fixture.unavailable = false; vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-09-03T06:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("Appliances API integrated decision flow (store boundary substituted)", () => {
  it.each([
    ["WASHING_MACHINE","21111111-1111-4111-8111-111111111111"],
    ["DRYER","31111111-1111-4111-8111-111111111111"],
    ["REFRIGERATOR","41111111-1111-4111-8111-111111111111"],
    ["DISHWASHER","51111111-1111-4111-8111-111111111111"],
    ["VACUUM","61111111-1111-4111-8111-111111111111"],
    ["ROBOT_VACUUM","71111111-1111-4111-8111-111111111111"],
  ] as const)("recomputes %s in the budget mutation's single CAS commit",async(productType,id)=>{expect((await post({action:"CREATE",conversationId:id,messageId:"create-budget",productType})).status).toBe(200);const on=await(await post({action:"TURN",conversationId:id,messageId:"budget-on",expectedRevision:1,message:"Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım 30.000 TL."})).json();expect(on).toMatchObject({revision:2,budgetMode:"BUDGET_AS_DECISION_FILTER",budgetMetadata:{amountTry:30000,includedInDecision:true},budget:{includedInDecision:true}});expect(["ASK","CLARIFY","DECISION_READY","FAILED_CLOSED"]).toContain(on.kind);if(productType!=="WASHING_MACHINE")expect(on.budget).toMatchObject({coverage:"EXACT_PRICE_COVERAGE_UNAVAILABLE",compatibleCandidateCount:0,incompatibleCandidateCount:0});});
  it("advances the reported WM transcript and READ-recovers the outstanding question",async()=>{expect((await post({action:"CREATE",conversationId,messageId:"create-transcript",productType:"WASHING_MACHINE"})).status).toBe(200);const turns=[
    ["t1","çamaşır makinesine ihtiyacım var. 2 kişi yaşıyoruz."],
    ["t2","10 Bin TL"],
    ["t3","gerek yok"],
    ["t4","sessiz olsun"],
  ] as const;const outputs=[];for(let i=0;i<turns.length;i++){const [messageId,message]=turns[i];outputs.push(await(await post({action:"TURN",conversationId,messageId,expectedRevision:i+1,message})).json());}expect(outputs[0]).toMatchObject({kind:"ASK",questionKey:"appliances.wm.budget.maximumTry"});expect(outputs[1]).toMatchObject({kind:"ASK",questionKey:"appliances.wm.remoteControl.requirement"});expect(outputs[2]).not.toMatchObject({questionKey:"appliances.wm.remoteControl.requirement"});expect(outputs[2]).not.toMatchObject({questionKey:"UNRESOLVED_MESSAGE"});expect(outputs[3]).not.toMatchObject({questionKey:"appliances.wm.remoteControl.requirement"});const read=await(await post({action:"READ",conversationId})).json();expect(read).toMatchObject({kind:"CONVERSATION",revision:5});expect(read.state).toBeUndefined();expect((await fixture.store.load(conversationId))?.state).toMatchObject({revision:5,lastQuestionKey:outputs[3].questionKey});});
  it("boots, asks, answers, authorizes, replays and reads authoritative revision", async () => {
    expect((await post({ action: "CREATE", conversationId, messageId: "create", productType: "WASHING_MACHINE" })).status).toBe(200);
    const asked = await post({ action: "TURN", conversationId, messageId: "first", expectedRevision: 1, message: "Çamaşır makinesi arıyorum" });
    expect(await asked.json()).toMatchObject({ kind: "ASK", revision: 2 });
    const body = { action: "TURN", conversationId, messageId: "answer", expectedRevision: 2, message: "Bütçem 23000 TL, Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil" };
    const result = await post(body); const data = await result.json();
    expect(data).toMatchObject({ kind: "DECISION_READY", revision: 3, card: { identity: { model: "CMX 8100" } } });
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(data).not.toHaveProperty("ledger"); expect(data).not.toHaveProperty("decisionRecord");
    expect(await (await post(body)).json()).toMatchObject({ kind: "DECISION_READY", revision: 3, replayed: true });
    expect(await (await post({ action: "READ", conversationId })).json()).toMatchObject({ kind: "CONVERSATION", revision: 3 });
    expect(await (await post({ action: "READ", conversationId })).json()).toMatchObject({ outcome: { kind: "DECISION_READY", card: { identity: { model: "CMX 8100" } } } });
    expect((await post({ ...body, messageId: "conflict" })).status).toBe(409);
  });
  it("rejects stale recommendation replay and reports unavailable persistence safely", async () => {
    await post({ action: "CREATE", conversationId, messageId: "create", productType: "WASHING_MACHINE" });
    await post({ action: "TURN", conversationId, messageId: "budget", expectedRevision: 1, message: "Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım 23.000 TL." });
    const body = { action: "TURN", conversationId, messageId: "answer", expectedRevision: 2, message: "Wi-Fi önemli değil, otomatik dozaj önemli değil, sessizlik önemli değil" };
    expect(await (await post(body)).json()).toMatchObject({ kind: "DECISION_READY" });
    vi.setSystemTime(new Date("2026-09-05"));
    expect(await (await post({ action: "READ", conversationId })).json()).toMatchObject({ kind: "CONVERSATION", outcome: { kind: "FAILED_CLOSED" } });
    expect(await (await post(body)).json()).toMatchObject({ kind: "FAILED_CLOSED", replayed: true });
    fixture.unavailable = true;
    expect((await post({ action: "READ", conversationId })).status).toBe(503);
  });
  it("creates, evaluates and READ-recovers a refrigerator decision", async () => {
    expect((await post({ action: "CREATE", conversationId, messageId: "create-fridge", productType: "REFRIGERATOR" })).status).toBe(200);
    const tied = await post({ action: "TURN", conversationId, messageId: "fridge-context", expectedRevision: 1, message: "Genişlik en fazla 80 cm, derinlik en fazla 85 cm, taze gıda net hacmi en az 200 litre" });
    expect(await tied.json()).toMatchObject({ kind: "CLARIFY", questionKey: "TIED_SET_EXPLANATION", revision: 2 });
    const decided = await post({ action: "TURN", conversationId, messageId: "fridge-correction", expectedRevision: 2, message: "Aslında taze gıda net hacmi en az 300 litre" });
    expect(await decided.json()).toMatchObject({ kind: "CLARIFY", revision: 3 });
    expect(await (await post({ action: "READ", conversationId })).json()).toMatchObject({ kind: "CONVERSATION", productType: "REFRIGERATOR", outcome: { kind: "CLARIFY" } });
  });
});
