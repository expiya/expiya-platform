import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateActiveCoverageWave02 } from "./generate";

describe("active coverage wave 02",()=>{
 it("generates deterministically and preserves candidate-only boundaries",async()=>{const first=await generateActiveCoverageWave02(),second=await generateActiveCoverageWave02();expect(first).toEqual(second);expect(first.categories).toHaveLength(8);expect(first.totals.admitted).toBeGreaterThan(0);expect(first.activationBoundary).toMatchObject({activePointerWrite:false,runtimeMutation:false,databaseMutation:false,productionMutation:false,deployment:false,ownerApprovalRequired:true});});
 it("reconciles every discovery observation terminally",async()=>{const report=await generateActiveCoverageWave02();for(const category of report.categories){const file=JSON.parse(await readFile(path.join(process.cwd(),"outputs/catalog-factory-active-coverage-wave-02/categories",category.categoryId.toLowerCase().replaceAll("_","-"),"candidate-ledger.json"),"utf8"));expect(file.reconciliation.noSilentDrop).toBe(true);expect(file.reconciliation.observations).toBe(file.reconciliation.admitted+file.reconciliation.rejected+file.reconciliation.unknown);expect(file.rankingBoundary).toEqual({brandPrestige:false,catalogOrder:false,persona:false,price:false,rating:false,seller:false});}});
});
