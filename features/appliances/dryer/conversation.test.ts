import { describe, expect, it } from "vitest";
import { loadActiveDryerAuthority } from "./authority.server";
import { runDryerConversationTurn } from "./conversation.server";
import { enterAppliancesDepartment } from "../entry.server";
import { createFileSystemAppliancesArtifactRepository } from "../authority/loader.server";
import { MemoryAppliancesConversationStore } from "../persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "../persistence/service";
import { recoverAppliancesConversation } from "../recovery.server";

describe("DRYER end-to-end category adapter", () => {
  it("preserves exact replay, payload conflict and revision conflict",async()=>{const repository=createFileSystemAppliancesArtifactRepository(process.cwd()),store=new MemoryAppliancesConversationStore();const entry=await enterAppliancesDepartment({repository,productType:"DRYER",conversationId:"88888888-8888-4888-8888-888888888890"});if(entry.status!=="READY")throw new Error(entry.status);await commitAppliancesBootstrap({store,state:entry.state,messageId:"create",payload:{productType:"DRYER"}});const authority=await loadActiveDryerAuthority(process.cwd());if(authority.status!=="READY")throw new Error(authority.reason);const input={store,authority:authority.snapshot,conversationId:entry.state.conversationId,messageId:"life",expectedRevision:1,message:"Çamaşır çok çıkıyor"};const first=await runDryerConversationTurn(input);expect(first.status).toBe("OK");expect(await runDryerConversationTurn(input)).toEqual(first.status==="OK"?{...first,replayed:true}:first);expect(await runDryerConversationTurn({...input,message:"Sessiz olsun"})).toEqual({status:"MESSAGE_PAYLOAD_CONFLICT"});expect(await runDryerConversationTurn({...input,messageId:"stale",expectedRevision:1})).toEqual({status:"REVISION_CONFLICT"});});
  it("starts with material load capacity and binds a short uncertainty answer",async()=>{const repository=createFileSystemAppliancesArtifactRepository(process.cwd()),store=new MemoryAppliancesConversationStore();const entry=await enterAppliancesDepartment({repository,productType:"DRYER",conversationId:"88888888-8888-4888-8888-888888888889"});if(entry.status!=="READY")throw new Error(entry.status);await commitAppliancesBootstrap({store,state:entry.state,messageId:"create",payload:{productType:"DRYER"}});const authority=await loadActiveDryerAuthority(process.cwd());if(authority.status!=="READY")throw new Error(authority.reason);const asked=await runDryerConversationTurn({store,authority:authority.snapshot,conversationId:entry.state.conversationId,messageId:"q1",expectedRevision:1,message:"Çamaşır çok çıkıyor"});expect(asked.status==="OK"&&asked.outcome).toMatchObject({kind:"ASK",questionKey:"appliances.dryer.capacity"});const answered=await runDryerConversationTurn({store,authority:authority.snapshot,conversationId:entry.state.conversationId,messageId:"q2",expectedRevision:2,message:"gerek yok"});expect(answered.status).toBe("OK");if(answered.status!=="OK")return;expect(answered.outcome).not.toMatchObject({questionKey:"appliances.dryer.capacity"});expect(answered.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({conceptId:"DRYING_CAPACITY",normalizedValue:{declined:true},decisionUse:"NONE"})]));});
  it("loads the approved seven-model authority and preserves non-comparable facts", async () => {
    const loaded=await loadActiveDryerAuthority(process.cwd()); expect(loaded.status).toBe("READY"); if(loaded.status!=="READY")return;
    expect(loaded.snapshot.pack.products).toHaveLength(7); expect(loaded.snapshot.pack.products.map(p=>p.model)).toEqual(expect.arrayContaining(["KMX 82","KM 99","WQG24100TR"]));
    expect(loaded.snapshot.pack.products.every(p=>p.technicalFacts.noiseRegime===null)).toBe(true);
    expect(loaded.snapshot.pack.selectionPolicy).toMatchObject({scores:false,weights:false,implicitTieBreak:false});
  });
  it("refuses a tie after a correction when the expanded catalog still has multiple fits", async () => {
    const repository=createFileSystemAppliancesArtifactRepository(process.cwd()), store=new MemoryAppliancesConversationStore();
    const entry=await enterAppliancesDepartment({repository,productType:"DRYER",conversationId:"88888888-8888-4888-8888-888888888888",now:new Date("2026-09-03T09:00:00Z")}); expect(entry.status).toBe("READY"); if(entry.status!=="READY")return;
    await commitAppliancesBootstrap({store,state:entry.state,messageId:"create",payload:{productType:"DRYER"}});
    const authority=await loadActiveDryerAuthority(process.cwd()); if(authority.status!=="READY")throw new Error(authority.reason);
    const tied=await runDryerConversationTurn({store,authority:authority.snapshot,conversationId:entry.state.conversationId,messageId:"m1",expectedRevision:1,message:"Derinlik en fazla 70 cm, en az 8 kg olsun",now:new Date("2026-09-03T09:01:00Z")});
    expect(tied.status).toBe("OK"); if(tied.status!=="OK")return; expect(tied.outcome.kind).toBe("CLARIFY"); expect(tied.state.decisionRecord).toBeUndefined();
    const corrected=await runDryerConversationTurn({store,authority:authority.snapshot,conversationId:entry.state.conversationId,messageId:"m2",expectedRevision:2,message:"Aslında derinlik en fazla 60 cm",now:new Date("2026-09-03T09:02:00Z")});
    expect(corrected.status).toBe("OK"); if(corrected.status!=="OK")return; expect(corrected.outcome.kind).toBe("CLARIFY");
    expect(corrected.state.decisionRecord).toBeUndefined();
    const recovered=await recoverAppliancesConversation(store,entry.state.conversationId); expect(recovered?.outcome?.kind).toBe("CLARIFY");
  });
});
