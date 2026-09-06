import { describe, expect, it } from "vitest";
import { PILOT_INPUT } from "./fixtures";
import { mapBounded, runCatalogFactory, type CheckpointStore } from "./pipeline";

describe("Catalog Factory v0.1", () => {
  it("double-generates the same canonical result", async () => {
    const first = await runCatalogFactory(PILOT_INPUT, { now: "2026-09-06T12:00:00.000Z" });
    const second = await runCatalogFactory({ ...PILOT_INPUT, observations: [...PILOT_INPUT.observations].reverse() }, { now: "2026-09-06T12:00:00.000Z" });
    expect(second.digest).toBe(first.digest); expect(first.activationPlan).toMatchObject({ activePointerWrite: false, databaseMigration: false, deployment: false });
  });
  it("resumes checkpoints and scopes incremental candidates", async () => {
    let saved: Awaited<ReturnType<typeof runCatalogFactory>>["checkpoint"] | undefined;
    const store: CheckpointStore = { async load() { return saved; }, async save(value) { saved = value; } };
    await runCatalogFactory(PILOT_INPUT, { checkpointStore: store, now: "2026-09-06T12:00:00.000Z" });
    const resumed = await runCatalogFactory(PILOT_INPUT, { checkpointStore: store, rebuildCategories: ["BABY_AND_CHILD/TOY"], now: "2026-09-06T12:00:00.000Z" });
    expect(resumed.domainPackCandidates).toHaveLength(1); expect(resumed.domainPackCandidates[0].categories).toEqual(["TOY"]); expect(resumed.checkpoint.completedStages).toHaveLength(10);
  });
  it("allows bounded concurrency without reordering", async () => { let active = 0; let peak = 0; const values = await mapBounded([3, 2, 1], 2, async value => { active++; peak = Math.max(peak, active); await Promise.resolve(); active--; return value * 2; }); expect(values).toEqual([6, 4, 2]); expect(peak).toBeLessThanOrEqual(2); });
  it("fails closed on silent drops, Amazon technical authority and Persona overflow", async () => {
    await expect(runCatalogFactory({ ...PILOT_INPUT, identities: PILOT_INPUT.identities.slice(1) })).rejects.toThrow("EVERY_OBSERVATION");
    await expect(runCatalogFactory({ ...PILOT_INPUT, evidence: [{ ...PILOT_INPUT.evidence[0], evidenceClasses: ["AMAZON_TR_COMMERCE"] }, ...PILOT_INPUT.evidence.slice(1)] })).rejects.toThrow("EVIDENCE_AUTHORITY");
    await expect(runCatalogFactory({ ...PILOT_INPUT, personas: [{ ...PILOT_INPUT.personas[0], aggregateSoftScore: 0.76 }, ...PILOT_INPUT.personas.slice(1)] })).rejects.toThrow("PERSONA_AUTHORITY");
  });
  it("characterizes expansion, proposed durable goods and high-risk neutral unknown", async () => { const output = await runCatalogFactory(PILOT_INPUT, { now: "2026-09-06T12:00:00.000Z" }); expect(Object.keys(output.coverage)).toEqual(["BABY_AND_CHILD/TOY", "DURABLE_GOODS_CANDIDATE/CORDLESS_DRILL", "ELECTRONICS/SMARTPHONE"]); expect(output.coverage["BABY_AND_CHILD/TOY"]).toMatchObject({ observations: 1, reconciled: 1, exactProducts: 0 }); expect(output.gates.find(row => row.gate === "owner-approval")?.status).toBe("PENDING"); });
});
