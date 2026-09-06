import {describe,expect,it} from "vitest";
import {triageFraudSignals} from "./fraud/triage";
import type {UsedCarRiskSignal} from "./fraud/contracts";
const signal=(code:UsedCarRiskSignal["code"],severity:UsedCarRiskSignal["severity"]):UsedCarRiskSignal=>({id:code,tenantId:"t1",inventoryUnitId:"v1",code,severity,evidenceReferenceIds:["e1"],detectedAt:"2026-09-01T00:00:00.000Z",detectorVersion:"v1",status:"OPEN"});
describe("fraud triage",()=>{
 it("routes cross-tenant duplicate to immediate incident response",()=>expect(triageFraudSignals([signal("DUPLICATE_VIN_CROSS_TENANT","HIGH")])).toMatchObject({queue:"INCIDENT_RESPONSE",publicationBlocked:true,dealerHoldRequired:true,slaMinutes:15}));
 it("prioritizes accumulated risk",()=>expect(triageFraudSignals([signal("PRICE_OUTLIER","MEDIUM"),signal("DUPLICATE_IMAGE","MEDIUM")])).toMatchObject({queue:"PRIORITY_REVIEW",publicationBlocked:true}));
 it("never declares fraud automatically",()=>expect(triageFraudSignals([signal("MILEAGE_ROLLBACK","CRITICAL")]).humanConclusionRequired).toBe(true));
});
