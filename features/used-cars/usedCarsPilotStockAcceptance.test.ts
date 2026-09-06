import {describe,expect,it} from "vitest";
import {evaluatePilotStock,type PilotStockCandidate} from "./pilot/stockAcceptance";
const stock:PilotStockCandidate={taxonomyEntityId:"uct_trim_x",taxonomyReleaseVersion:"tr-used-pilot-0.1.0",vinFingerprintPresent:true,plateFingerprintPresent:true,branchVerified:true,priceUpdatedAt:"2026-08-30T00:00:00.000Z",stockUpdatedAt:"2026-08-31T12:00:00.000Z",requiredFieldsComplete:true,mediaPassed:true,evidenceConflictsOpen:false,duplicateSignals:[],classicVehicle:false};
describe("pilot stock acceptance",()=>{
 it("accepts a fresh controlled draft without publishing it",()=>expect(evaluatePilotStock({candidate:stock,now:"2026-09-01T00:00:00.000Z"})).toEqual({accepted:true,publishable:false,codes:[]}));
 it("rejects stale, duplicate and conflicting inventory",()=>expect(evaluatePilotStock({candidate:{...stock,priceUpdatedAt:"2026-01-01T00:00:00.000Z",duplicateSignals:["vin"],evidenceConflictsOpen:true},now:"2026-09-01T00:00:00.000Z"}).codes).toEqual(expect.arrayContaining(["STALE_PRICE","DUPLICATE_SIGNAL","EVIDENCE_CONFLICT"])));
 it("keeps classic stock outside first pilot",()=>expect(evaluatePilotStock({candidate:{...stock,classicVehicle:true},now:"2026-09-01T00:00:00.000Z"}).codes).toContain("CLASSIC_OUT_OF_SCOPE"));
});
