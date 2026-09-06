import { describe, expect, it } from "vitest";
import { createDemoMatchQuery, parseDemoMatchNumber } from "./preferenceTransfer";
describe("preference ledger to matching transfer",()=>{
  it("maps selected non-PII criteria to bounded query values",()=>{ expect(createDemoMatchQuery({totalBudgetTry:"1450000",bodyStyle:"SUV",unexpectedExpenseTolerance:"Düşük",maximumVehicleAge:"5",maximumMileageKm:"70000",preferredBrand:"Toyota",preferredModel:"Toyota C-HR",preferredCities:"Ankara,İstanbul"})).toEqual({budget:"1450000",body:"SUV",risk:"LOW",minYear:"2021",maxMileage:"70000",brand:"Toyota",model:"Toyota C-HR",cities:"Ankara,İstanbul"}); });
  it("bounds manipulated numeric query values",()=>{ expect(parseDemoMatchNumber("99999999",1600000,900000,1800000)).toBe(1800000); expect(parseDemoMatchNumber("bad",90_000,0,500_000)).toBe(90_000); });
  it("maps no-preference brand, model and city to all",()=>{ expect(createDemoMatchQuery({preferredBrand:"Fark etmez",preferredModel:"Fark etmez"})).toMatchObject({brand:"ALL",model:"ALL",cities:"ALL"}); });
});
