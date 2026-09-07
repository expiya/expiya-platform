import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { materializeWave02EvidenceClosure } from "./materialize";

describe("Wave-02 evidence closure",()=>{
 it("materializes snapshots deterministically with immutable activation boundaries",async()=>{const first=await materializeWave02EvidenceClosure(),second=await materializeWave02EvidenceClosure();expect(first).toEqual(second);expect(first.totals.admitted+first.totals.rejected+first.totals.conflicted+first.totals.unknown).toBe(58);expect(first.activationBoundary).toMatchObject({activePointerWrite:false,runtimeMutation:false,databaseMutation:false,productionMutation:false,deployment:false});});
 it("gives every candidate one evidence-terminal outcome and permits facts only for admitted snapshots",async()=>{const report=await materializeWave02EvidenceClosure();for(const row of report.categories){const ledger=JSON.parse(await readFile(path.join(process.cwd(),"outputs/catalog-factory-active-coverage-wave-02-evidence-closure-01/categories",row.categoryId.toLowerCase().replaceAll("_","-"),"closure-ledger.json"),"utf8"));expect(ledger.results).toHaveLength(ledger.candidateObservations);expect(ledger.results.every((result:{outcome:string;technicalFacts:unknown[]})=>result.outcome==="ADMITTED"||result.technicalFacts.length===0)).toBe(true);expect(ledger.readiness.ownerReview==="READY"||ledger.readiness.ownerReview==="BLOCKED_FOR_UNCLOSED_PRODUCTS").toBe(true);}});
});
