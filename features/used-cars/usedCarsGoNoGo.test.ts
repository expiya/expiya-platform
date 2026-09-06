import {describe,expect,it} from "vitest";
import {evaluateGoNoGo,requiredKillSwitches} from "./readiness/goNoGo";
const ready={stage:"CONTROLLED_PILOT" as const,readinessPassed:true,evidenceComplete:true,rollbackDrilled:true,observabilityGreen:true,supportAndIncidentStaffed:true,killSwitchesTested:requiredKillSwitches,unresolvedSev1OrSev2:0,namedDecisionMakerId:"owner",explicitGoDecision:true};
describe("launch go/no-go",()=>{
 it("returns GO without authorizing automatic deployment",()=>expect(evaluateGoNoGo(ready)).toEqual({decision:"GO",blockers:[],automaticDeploymentAuthorized:false}));
 it("fails closed for an open high severity incident",()=>expect(evaluateGoNoGo({...ready,unresolvedSev1OrSev2:1})).toMatchObject({decision:"NO_GO",blockers:["HIGH_SEVERITY_INCIDENT_OPEN"]}));
 it("requires every kill switch",()=>expect(evaluateGoNoGo({...ready,killSwitchesTested:[]}).blockers).toHaveLength(requiredKillSwitches.length));
});
