import { describe,expect,it } from "vitest";
import { createDealerClosurePlan, requiredDealerClosureActions, validateDealerClosurePlan, type DealerClosurePlan } from "./dealer/closurePlan";

const plan=()=>createDealerClosurePlan({eventId:"closure-1",idempotencyKey:"tenant-a:closure-1",tenantId:"tenant-a",targetStatus:"SUSPENDED",reason:"FRAUD_SUSPENSION",requestedAt:"2026-09-01T18:00:00Z",requestedByActorId:"system-risk-1"});
describe("dealer closure fail-closed plan",()=>{
  it("covers every public and private access surface",()=>{const value=plan(); expect(value.actions.map(action=>action.type)).toEqual(requiredDealerClosureActions); expect(value.actions.every(action=>action.failClosed)).toBe(true); expect(validateDealerClosurePlan(value)).toEqual([]);});
  it("does not confuse tenant closure with immediate personal-data deletion",()=>{const value=plan(); expect(value.personalDataDeletedAutomatically).toBe(false); expect(value.actions.some(action=>action.type==="OPEN_RETENTION_REVIEW")).toBe(true);});
  it("keeps execution unauthorized until an orchestration review",()=>expect(plan().executionAuthorized).toBe(false));
  it("detects partial and unsafe closure plans",()=>{const value=plan(); const partial={...value,actions:value.actions.filter(action=>action.type!=="REVOKE_LEAD_GRANTS")} as DealerClosurePlan; expect(validateDealerClosurePlan(partial)).toContain("MISSING_ACTION:REVOKE_LEAD_GRANTS"); const unsafe={...value,actions:[...value.actions,{type:"REVOKE_SESSIONS" as const,failClosed:false as never}]} as DealerClosurePlan; expect(validateDealerClosurePlan(unsafe)).toContain("NON_FAIL_CLOSED_ACTION");});
});

