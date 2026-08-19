import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const BASE = "data/production/catalog/governance/v0.55.4/activation-dry-runs/CATALOG-554-FIVE-LAYER-ATOMIC-ACTIVATION-DRY-RUN-003";
const read = <T>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
interface Plan { status: string; recordCount: number; quarantineCount: number; catalogFingerprint: string; payloadChecksums: Record<string,string>; proposedPointerTemplateChecksums: Record<string,string>; proposedGeneratedModuleChecksums: Record<string,string>; releases: Record<string,string>; current: Record<string,{pointer:string|null}> }
interface EquipmentPayload { coverage: { compatibleCatalogSnapshotSha256: string; verifiedAssertionCoverage: { exactVariantCount:number }; reviewedAssociationOnlyCoverage:{ exactVariantCount:number }; uncoveredCoverage:{ exactVariantCount:number } }; decisionAuthority:string }
interface DailyLifePayload { entries: Array<{ decisionUse:string }>; sourceAuthority:string }
const plan = read<Plan>(`${BASE}/activation-dry-run.json`);

describe("Catalog v0.55.4 five-layer activation dry-run 003", () => {
  it("binds all five immutable payloads to the same catalog fingerprint", () => {
    expect(plan.status).toBe("READY_FOR_EXPLICIT_FIVE_LAYER_ATOMIC_ACTIVATION_APPROVAL");
    expect(plan.recordCount).toBe(549);
    expect(plan.quarantineCount).toBe(17);
    expect(plan.payloadChecksums.catalog).toBe(plan.catalogFingerprint);
    expect(Object.keys(plan.payloadChecksums)).toHaveLength(5);
  });

  it("materializes valid Equipment coverage without stale fingerprint or quarantine references", () => {
    const equipment = read<EquipmentPayload>(`data/production/equipment-evidence/releases/${plan.releases.equipment}/equipment-evidence.json`);
    expect(equipment.coverage.compatibleCatalogSnapshotSha256).toBe(plan.catalogFingerprint);
    expect(equipment.coverage.verifiedAssertionCoverage.exactVariantCount + equipment.coverage.reviewedAssociationOnlyCoverage.exactVariantCount + equipment.coverage.uncoveredCoverage.exactVariantCount).toBe(549);
    expect(equipment.decisionAuthority).toBe("SHADOW_AND_EXPLANATION_DISABLED");
  });

  it("keeps Equipment Daily-Life explanation-only and owner-approved", () => {
    const layer = read<DailyLifePayload>(`data/production/equipment-daily-life/releases/${plan.releases.equipmentDailyLife}/equipment-daily-life.json`);
    expect(layer.entries).toHaveLength(51);
    expect(layer.sourceAuthority).toBe("OWNER_EDITORIAL");
    expect(layer.entries.every((entry) => entry.decisionUse === "EXPLANATION_ONLY")).toBe(true);
  });

  it("checksums proposed pointer templates and generated modules from exact bytes", () => {
    for (const key of Object.keys(plan.proposedPointerTemplateChecksums)) expect(sha(readFileSync(`${BASE}/proposed-pointers/${key}.json`))).toBe(plan.proposedPointerTemplateChecksums[key]);
    for (const key of Object.keys(plan.proposedGeneratedModuleChecksums)) expect(sha(readFileSync(`${BASE}/proposed-generated-modules/${key}.ts.txt`))).toBe(plan.proposedGeneratedModuleChecksums[key]);
  });

  it("records the pre-activation pointers and both failed dry-runs", () => {
    expect(plan.current.catalog.pointer).toBe("sha256:c359663fd6f58766b2d0cc6a3837f0ff65f056f913cd0a8cace22cb1f8c4578a");
    expect(plan.current.equipment.pointer).toBe("sha256:39eae2723b0ca4bc38589bc25157326f084ed36f8fa4b6a946c7542d8ea4c98a");
    expect(read<{activePointersChanged:boolean}>("data/production/catalog/governance/v0.55.4/activation-dry-runs/CATALOG-554-FIVE-LAYER-ATOMIC-ACTIVATION-DRY-RUN-001/failure-disposition.json").activePointersChanged).toBe(false);
    expect(read<{activePointersChanged:boolean}>("data/production/catalog/governance/v0.55.4/activation-dry-runs/CATALOG-554-FIVE-LAYER-ATOMIC-ACTIVATION-DRY-RUN-002/failure-disposition.json").activePointersChanged).toBe(false);
  });
});
