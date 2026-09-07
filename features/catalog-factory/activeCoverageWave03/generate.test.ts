import { readFile } from "node:fs/promises";
import { describe,expect,it } from "vitest";
import { generateActiveCoverageWave03 } from "./generate";

describe("active coverage Wave-03 discovery",()=>{
 it("pins exact-14 80+14=94 and prohibits superseded exact-15",async()=>{const {packet}=await generateActiveCoverageWave03();expect(packet.authorityBaseline).toMatchObject({before:80,additions:14,active:94});expect(packet.authorityBaseline.oldExact15.admissionAllowed).toBe(false);expect(packet.authorityBaseline.oldExact15.lifecycle).toContain("PROHIBITED");});
 it("is deterministic, bounded and candidate-only",async()=>{const first=await generateActiveCoverageWave03(),second=await generateActiveCoverageWave03();expect(first).toEqual(second);expect(first.packet.selection.boundedCategories).toEqual(["REFRIGERATOR","DISHWASHER","DRYER","MONITOR"]);expect(first.packet.selection.candidates).toBe(6);expect(first.packet.reconciliation.noSilentDrop).toBe(true);expect(Object.values(first.packet.rankingBoundary).every(x=>x===false)).toBe(true);expect(first.preflight.checks.mutationBoundaryPreserved).toBe(true);});
 it("materializes matching immutable digest files",async()=>{const {packet}=await generateActiveCoverageWave03();const disk=JSON.parse(await readFile("outputs/catalog-factory-active-coverage-wave-03-discovery-01/CANDIDATE_PACKET.json","utf8")) as {candidateDigest:string;candidates:{lifecycle:string}[]};expect(disk.candidateDigest).toBe(packet.candidateDigest);expect(disk.candidates.every(x=>x.lifecycle==="IMMUTABLE_CANDIDATE_NOT_ACTIVE")).toBe(true);});
});
