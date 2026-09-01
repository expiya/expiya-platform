import { describe,expect,it } from "vitest";
import { assessRlsAdversarialCoverage,usedCarsRlsAdversarialMatrix } from "./security/rlsAdversarialMatrix";
describe("RLS adversarial migration gate matrix",()=>{
  it("has stable unique IDs and only fail-closed outcomes",()=>{expect(new Set(usedCarsRlsAdversarialMatrix.map(item=>item.id)).size).toBe(usedCarsRlsAdversarialMatrix.length);expect(usedCarsRlsAdversarialMatrix.every(item=>["DENY","EMPTY_RESULT","ROLLBACK","ZERO_PUBLIC_ROWS"].includes(item.expected))).toBe(true);expect(usedCarsRlsAdversarialMatrix.every(item=>item.automatedBeforeMigration)).toBe(true);});
  it("covers every required attack surface",()=>{expect(new Set(usedCarsRlsAdversarialMatrix.map(item=>item.surface))).toEqual(new Set(["TENANT_ROW","BRANCH_ROW","COMPOSITE_FK","IMPORT","MODERATION","PUBLIC_READER","POOL_CONTEXT","TENANT_CLOSURE","PRIVILEGED_ROLE","EXPORT"]));});
  it("keeps the gate incomplete until all scenarios execute",()=>{const partial=assessRlsAdversarialCoverage(["RLS-001"]);expect(partial.complete).toBe(false);expect(partial.missing).toContain("RLS-012");const complete=assessRlsAdversarialCoverage(usedCarsRlsAdversarialMatrix.map(item=>item.id));expect(complete).toEqual({complete:true,missing:[]});});
});
