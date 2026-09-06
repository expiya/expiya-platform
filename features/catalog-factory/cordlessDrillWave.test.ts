import { describe, expect, it } from "vitest";
import { canonicalJson } from "./canonical";
import { ACCEPTED_DRILLS, buildCordlessDrillWaveInput } from "./cordlessDrillWave";
import { runCatalogFactory } from "./pipeline";

describe("Cordless Drill real wave 01", () => {
  it("admits 16 exact diverse variants and terminally reconciles every observation", async () => {
    const input = buildCordlessDrillWaveInput(); const output = await runCatalogFactory(input,{now:"2026-09-06T19:00:00.000Z"});
    expect(ACCEPTED_DRILLS).toHaveLength(16); expect(new Set(ACCEPTED_DRILLS.map(row=>row.brand)).size).toBeGreaterThanOrEqual(8);
    expect(input.identities).toHaveLength(input.observations.length); expect(new Set(input.identities.flatMap(row=>row.outcome==="EXACT"&&row.exactProductId?[row.exactProductId]:[]))).toHaveProperty("size",16); expect(input.identities.filter(row=>row.outcome==="UNKNOWN")).toHaveLength(4);
    expect(input.ingestion.candidates.every(row=>row.gate==="DECISION_READY")).toBe(true); expect(output.activationPlan).toMatchObject({activePointerWrite:false,databaseMigration:false,deployment:false});
  });
  it("keeps kit and bare identities exact and commerce separate", () => { const input=buildCordlessDrillWaveInput(); expect(ACCEPTED_DRILLS.some(row=>row.kit.startsWith("BARE"))).toBe(true); expect(ACCEPTED_DRILLS.some(row=>row.kit.startsWith("KIT"))).toBe(true); expect(input.commerceMedia.every(row=>row.technicalEvidenceDigest===null)).toBe(true); });
  it("double-generates deterministically", async () => { const input=buildCordlessDrillWaveInput(); const first=await runCatalogFactory(input,{now:"2026-09-06T19:00:00.000Z"}); const second=await runCatalogFactory({...input,observations:[...input.observations].reverse()},{now:"2026-09-06T19:00:00.000Z"}); expect(second.digest).toBe(first.digest); expect(canonicalJson(second)).toBe(canonicalJson(first)); });
});
