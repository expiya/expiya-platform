import {describe,expect,it} from "vitest";
import {evaluateSlo,usedCarsSlos} from "./analytics/slo";
describe("used-cars SLO policy",()=>{
 it("uses zero tolerance for tenant isolation and unsafe handoff",()=>expect(usedCarsSlos.filter(slo=>slo.zeroTolerance).map(slo=>slo.id)).toEqual(["LEAD_HANDOFF_SAFETY","TENANT_ISOLATION"]));
 it("pages on the first isolation failure",()=>{const slo=usedCarsSlos.find(item=>item.id==="TENANT_ISOLATION")!;expect(evaluateSlo({slo,good:9,total:10})).toMatchObject({status:"BREACHED",page:true,budgetRemaining:0});});
 it("does not alert on statistically insufficient traffic",()=>{const slo=usedCarsSlos.find(item=>item.id==="PUBLIC_READ_AVAILABILITY")!;expect(evaluateSlo({slo,good:9,total:10})).toMatchObject({status:"INSUFFICIENT_DATA",page:false});});
});
