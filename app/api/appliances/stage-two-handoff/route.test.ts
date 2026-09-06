import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";
const original=process.env.APPLIANCES_STAGE2_HANDOFF_SECRET;
afterEach(()=>{if(original===undefined)delete process.env.APPLIANCES_STAGE2_HANDOFF_SECRET;else process.env.APPLIANCES_STAGE2_HANDOFF_SECRET=original;});
const post=(body:unknown)=>POST(new Request("http://localhost/api/appliances/stage-two-handoff",{method:"POST",headers:{"content-type":"application/json",origin:"http://localhost"},body:JSON.stringify(body)}));
describe("AŞAMA 2 handoff route",()=>{
  it("fails closed with a human recovery message when the server secret is absent",async()=>{delete process.env.APPLIANCES_STAGE2_HANDOFF_SECRET;const response=await post({action:"ISSUE",conversationId:"11111111-1111-4111-8111-111111111111",expectedRevision:1});expect(response.status).toBe(503);expect(await response.json()).toMatchObject({kind:"HANDOFF_UNAVAILABLE",message:expect.stringContaining("AŞAMA 1")});expect(response.headers.get("Cache-Control")).toBe("no-store");});
  it.each([{action:"READ",handoff:"11111111-1111-4111-8111-111111111111"},{action:"ISSUE",conversationId:"11111111-1111-4111-8111-111111111111",expectedRevision:1,decisionFingerprint:"client-forged"}])("rejects raw UUID and client-supplied authority before persistence",async body=>{const response=await post(body);expect(response.status).toBe(400);expect(await response.json()).toMatchObject({kind:"HANDOFF_REJECTED"});});
});
