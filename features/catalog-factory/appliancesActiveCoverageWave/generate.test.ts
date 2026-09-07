import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROBOT_VACUUM_CANDIDATES, SPLIT_AIR_CONDITIONER_CANDIDATES } from "./catalog";
import { verifyAppliancesActiveCoverageWave } from "./generate";

describe("candidate-only active coverage appliance wave",()=>{
 it("meets exact/brand/segment targets without active mutations",async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),"appliances-wave-"));const rows=await verifyAppliancesActiveCoverageWave(dir);expect(rows.map(x=>x.categoryId)).toEqual(["ROBOT_VACUUM","SPLIT_AIR_CONDITIONER"]);for(const row of rows){expect(Object.values(row.coverage.gates).every(Boolean)).toBe(true);} });
 it.each([["ROBOT_VACUUM",ROBOT_VACUUM_CANDIDATES,18,6,5],["SPLIT_AIR_CONDITIONER",SPLIT_AIR_CONDITIONER_CANDIDATES,18,6,5]] as const)("%s has broad deterministic membership",(_id,rows,minProducts,minBrands,minSegments)=>{expect(rows.length).toBeGreaterThanOrEqual(minProducts);expect(new Set(rows.map(x=>x.brand)).size).toBeGreaterThanOrEqual(minBrands);expect(new Set(rows.map(x=>x.segment)).size).toBeGreaterThanOrEqual(minSegments);expect(new Set(rows.map(x=>x.id)).size).toBe(rows.length);expect(rows.every(x=>x.sourceUrl.startsWith("https://"))).toBe(true);});
});
