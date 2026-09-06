import {describe,expect,it} from "vitest";
import {membershipCatalog,validateMembershipCatalog} from "./memberships/catalog";
describe("membership catalog",()=>{
 it("defines valid branch, stock, user and lead-action limits",()=>expect(validateMembershipCatalog(membershipCatalog)).toEqual([]));
 it("never bills completed actions in pilot plans",()=>expect(membershipCatalog.every(plan=>!plan.completedActionBillingAllowed)).toBe(true));
 it("never grants organic ranking benefit",()=>expect(membershipCatalog.every(plan=>!plan.organicRankingBenefit)).toBe(true));
});
