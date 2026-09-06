import {describe,expect,it} from "vitest";
import {evaluateEntitlement} from "./memberships/entitlements";
import {membershipCatalog} from "./memberships/catalog";
const plan=membershipCatalog[0];const usage={activeBranches:1,activeStock:10,activeUsers:2,monthlyLeadActions:5};
describe("membership entitlements",()=>{
 it("fails closed when membership is inactive",()=>expect(evaluateEntitlement({plan,usage,action:"ACTIVATE_STOCK",membershipActive:false})).toEqual({allowed:false,reason:"MEMBERSHIP_INACTIVE"}));
 it("enforces branch and addon limits",()=>{expect(evaluateEntitlement({plan,usage,action:"CREATE_BRANCH",membershipActive:true})).toEqual({allowed:false,reason:"BRANCH_LIMIT_REACHED"});expect(evaluateEntitlement({plan,usage,action:"USE_FEED_API",membershipActive:true})).toEqual({allowed:false,reason:"ADDON_REQUIRED"});});
 it("allows an in-quota action without implying publishing",()=>expect(evaluateEntitlement({plan,usage,action:"ACTIVATE_STOCK",membershipActive:true})).toEqual({allowed:true}));
});
