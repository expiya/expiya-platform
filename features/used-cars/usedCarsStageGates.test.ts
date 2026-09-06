import {describe,expect,it} from "vitest";
import {usedCarsStageGates,validateStagePromotion} from "./readiness/stageGates";
describe("launch stage gates",()=>{
 it("uses monotonic predecessor gates",()=>expect(validateStagePromotion({target:"CONTROLLED_PILOT",completedStages:["SYNTHETIC_MVP"],namedApproverId:"owner",rollbackPlanChecksum:`sha256:${"a".repeat(64)}`,explicitScopeAuthorization:true})).toEqual({allowed:false,reason:"PREDECESSOR_INCOMPLETE"}));
 it("requires named approval, rollback and explicit scope",()=>expect(validateStagePromotion({target:"STAGING_INTEGRATION",completedStages:["SYNTHETIC_MVP"],namedApproverId:null,rollbackPlanChecksum:null,explicitScopeAuthorization:false})).toEqual({allowed:false,reason:"NAMED_APPROVER_REQUIRED"}));
 it("never promotes automatically",()=>expect(validateStagePromotion({target:"STAGING_INTEGRATION",completedStages:["SYNTHETIC_MVP"],namedApproverId:"owner",rollbackPlanChecksum:`sha256:${"a".repeat(64)}`,explicitScopeAuthorization:true})).toEqual({allowed:true,automaticPromotion:false}));
 it("keeps real data and charges out of early stages",()=>{expect(usedCarsStageGates[0]).toMatchObject({allowsRealData:false,allowsCharges:false});expect(usedCarsStageGates[1]).toMatchObject({allowsRealData:false,allowsCharges:false});});
});
