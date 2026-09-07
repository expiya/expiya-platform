import { describe,expect,it } from "vitest";
import { buildWave } from "./generate";

describe("TV and laptop Catalog Factory owner-review wave",()=>{
 it("meets exact product, brand, and segment targets",()=>{const wave=buildWave();for(const category of wave.categories){expect(category.counts.exact).toBeGreaterThanOrEqual(category.targets.exact);expect(category.counts.brands).toBeGreaterThanOrEqual(category.targets.brands);expect(category.counts.segments).toBeGreaterThanOrEqual(category.targets.segments)}});
 it("reconciles every observation without silent drops",()=>{const wave=buildWave();expect(wave.silentDropCount).toBe(0);for(const category of wave.categories){expect(category.counts.observed).toBe(category.counts.reconciled);expect(category.products.every(p=>p.terminalState==="ADMITTED_EXACT_TR_PRIMARY_EVIDENCE")).toBe(true);expect(category.terminalObservations.map(o=>o.terminalState).sort()).toEqual(["REJECTED","UNKNOWN"]);}});
 it("keeps persona, media, and commerce fail-closed and candidate-only",()=>{const wave=buildWave();expect(wave.activation).toEqual({authorized:false,activePointerWrite:false,runtimeMutation:false,databaseMutation:false,deployment:false});for(const product of wave.categories.flatMap(c=>c.products)){expect(product.persona).toMatchObject({evidenceState:"UNKNOWN",effect:"NEUTRAL_ZERO_WEIGHT",mayFilter:false});expect(product.media.technicalAuthority).toBe(false);expect(product.commerce).toMatchObject({technicalAuthority:false,rankingEffect:"NONE"});}});
 it("is deterministic and exposes resumable category checkpoints",()=>{const first=buildWave();const second=buildWave();expect(first.packetDigest).toBe(second.packetDigest);expect(first.checkpoint.nextCategory).toBeNull();expect(first.checkpoint.categoryDigests).toEqual(second.checkpoint.categoryDigests);});
 it("keeps smartphone dependency-only",()=>expect(buildWave().locks.smartphone).toBe("DEPENDENCY_ONLY_SEPARATE_DIGEST_BOUND_33_PACKAGE_IN_PROGRESS"));
});
