import { describe, expect, it } from "vitest";
import { enterAppliancesDepartment } from "./entry.server";
import { createFileSystemAppliancesArtifactRepository } from "./authority/loader.server";
import { MemoryAppliancesConversationStore } from "./persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "./persistence/service";
import { runAppliancesBudgetControlTurn } from "./budgetControl.server";

describe("Appliances budget decision control", () => {
  it.each(["WASHING_MACHINE", "DRYER", "REFRIGERATOR", "DISHWASHER", "VACUUM", "ROBOT_VACUUM"] as const)("persists mode, amount and provenance for %s", async productType => {
    const repository=createFileSystemAppliancesArtifactRepository(process.cwd()), entered=await enterAppliancesDepartment({repository,productType,conversationId:"00000000-0000-4000-8000-000000000001",now:new Date("2026-09-03T00:00:00Z")});
    if(entered.status!=="READY")throw new Error(entered.status);const store=new MemoryAppliancesConversationStore();await commitAppliancesBootstrap({store,state:entered.state,messageId:"create",payload:{action:"CREATE"}});
    const enabled=await runAppliancesBudgetControlTurn({store,conversationId:entered.state.conversationId,messageId:"on",expectedRevision:1,message:"Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım 30.000 TL.",now:new Date("2026-09-03T00:01:00Z")});
    expect(enabled).toMatchObject({status:"OK",state:{budgetMode:"BUDGET_AS_DECISION_FILTER",budgetMetadata:{amountTry:30000,includedInDecision:true,provenance:{sourceMessageId:"on"}}}});
    if(enabled.status!=="OK")return;const disabled=await runAppliancesBudgetControlTurn({store,conversationId:entered.state.conversationId,messageId:"off",expectedRevision:2,message:"Bütçeyi karardan çıkar, ihtiyaç odaklı devam.",now:new Date("2026-09-03T00:02:00Z")});
    expect(disabled).toMatchObject({status:"OK",state:{budgetMode:"NEEDS_ONLY",budgetMetadata:{amountTry:30000,includedInDecision:false,provenance:{sourceMessageId:"on"}},decisionRecord:undefined}});
  });
  it("asks for an explicit maximum and preserves replay/conflict/CAS",async()=>{const repository=createFileSystemAppliancesArtifactRepository(process.cwd()),entered=await enterAppliancesDepartment({repository,productType:"WASHING_MACHINE",conversationId:"00000000-0000-4000-8000-000000000002"});if(entered.status!=="READY")throw new Error(entered.status);const store=new MemoryAppliancesConversationStore();await commitAppliancesBootstrap({store,state:entered.state,messageId:"create",payload:{action:"CREATE"}});const input={store,conversationId:entered.state.conversationId,messageId:"on",expectedRevision:1,message:"Bütçemi karar filtresi olarak kullan."};expect(await runAppliancesBudgetControlTurn(input)).toMatchObject({status:"OK",outcome:{kind:"ASK",questionKey:"appliances.budget.maximumTry"},state:{budgetMetadata:undefined}});expect(await runAppliancesBudgetControlTurn(input)).toMatchObject({status:"OK",replayed:true});expect(await runAppliancesBudgetControlTurn({...input,message:"Bütçemi karar filtresi olarak kullan. 20.000 TL"})).toMatchObject({status:"MESSAGE_PAYLOAD_CONFLICT"});expect(await runAppliancesBudgetControlTurn({...input,messageId:"stale"})).toMatchObject({status:"REVISION_CONFLICT"});});
});
