import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import dailyPointer from "@/data/production/equipment-daily-life/active.json";
import authorityPointer from "@/data/production/equipment-public-explanation-authority/active.json";
import { assertActiveEquipmentDailyLifeCompatibility, loadActiveEquipmentDailyLifeLayer } from "./equipmentDailyLife";
import { activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum, activeEquipmentPublicExplanationAuthorityManifest,
  activeEquipmentPublicExplanationAuthorityPayload, activeEquipmentPublicExplanationAuthorityRelease } from "@/data/production/equipment-public-explanation-authority/activeEquipmentPublicExplanationAuthority.generated";

const ROOT = process.cwd();
const EVENT_ID = "EPEA-ACT-398AFB4D87D728F55384";
const EVENT_DIR = join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-events", EVENT_ID);
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

describe("EPEA atomic composite activation", () => {
  const event = read<Record<string, unknown>>(join(EVENT_DIR, "activation-event.json"));
  const validation = read<Record<string, unknown>>(join(EVENT_DIR, "post-activation-validation.json"));

  it("records the checksum-bound owner authorization as one append-only activation event", () => expect(event).toMatchObject({
    eventId: EVENT_ID, eventChecksum: "sha256:398afb4d87d728f55384dd2f8bde74d1f38c9a3c60035f7dad535f2c79869e9d",
    ownerActorId: "EQUIPMENT_OWNER_001", activationManifestId: "EPEA-ACTMAN-A68831FC3F16C7619F25",
    activationManifestChecksum: "sha256:a604677715168c97ede36bc3d6d8944609701323c2c102db5b163824300986fe",
    productionCompositeBindingChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082",
    publicIntegrationPerformed: false, decisionEngineEffect: "ZERO", deploymentPerformed: false, migrationPerformed: false,
    databaseWritePerformed: false, commitPushPerformed: false,
  }));

  it("installs all four ACTIVE bytes at the owner-approved checksums", () => expect({
    dailyPointer: sha(readFileSync(join(ROOT, "data/production/equipment-daily-life/active.json"))),
    dailyModule: sha(readFileSync(join(ROOT, "data/production/equipment-daily-life/activeEquipmentDailyLife.generated.ts"))),
    authorityPointer: sha(readFileSync(join(ROOT, "data/production/equipment-public-explanation-authority/active.json"))),
    authorityModule: sha(readFileSync(join(ROOT, "data/production/equipment-public-explanation-authority/activeEquipmentPublicExplanationAuthority.generated.ts"))),
  }).toEqual({
    dailyPointer: "sha256:4c25ab5b88a7e437fa20c0d6d3827180f028f5580fc2ed7b92f7c7246f48ba23",
    dailyModule: "sha256:31e8889bfc91322801c965d756e638d46dea4856ae2b0df905343aa0b927d5ae",
    authorityPointer: "sha256:142f84a7bd526177222ca4d3d3e9602e909e5dc19a753166cc77eb69fdf30602",
    authorityModule: "sha256:be2457e2a2614ed530c0777cf903641a17137e0f803517c208f6c2de01c4d773",
  }));

  it("loads both production releases as ACTIVE with one composite binding", () => {
    expect(() => assertActiveEquipmentDailyLifeCompatibility()).not.toThrow();
    expect(loadActiveEquipmentDailyLifeLayer().release).toBe("v1.0.1-catalog-v0.55.4-2026-08-20");
    expect(activeEquipmentPublicExplanationAuthorityRelease).toBe("v0.1.2-catalog-v0.55.4-2026-08-20");
    expect(activeEquipmentPublicExplanationAuthorityManifest.materializedReleaseId).toBe(activeEquipmentPublicExplanationAuthorityRelease);
    expect(activeEquipmentPublicExplanationAuthorityPayload.authorizedPositiveAssertionIds).toHaveLength(62);
    expect(activeEquipmentPublicExplanationAuthorityPayload.authorizedNegativeAssertionIds).toHaveLength(3);
    expect(activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum).toBe(dailyPointer.productionCompositeBindingChecksum);
    expect(authorityPointer.productionCompositeBindingChecksum).toBe(dailyPointer.productionCompositeBindingChecksum);
  });

  it("keeps Authority publicly inactive and Decision Engine neutral", () => {
    expect(authorityPointer).toMatchObject({ state: "ACTIVE", publicActivation: false, publicIntegration: false, decisionEngineEffect: "ZERO" });
    expect(dailyPointer.runtimeAuthority).toBe("EXPLANATION_ONLY");
    expect(validation).toMatchObject({ status: "PASS", checksumsMatchApprovedTargets: true, publicIntegrationPerformed: false, decisionEngineEffect: "ZERO" });
  });

  it("keeps the rollback dry-run ready without inventing an Authority predecessor", () => expect(read(join(EVENT_DIR, "rollback-dry-run.json"))).toMatchObject({
    status: "READY", equipmentDailyLife: { targetRelease: "v1.0.0-catalog-v0.55.4-2026-08-20" },
    publicExplanationAuthority: { predecessor: "NO_ACTIVE_PREDECESSOR", targetState: "UNCONFIGURED_DISABLED" },
    appendOnlyGovernanceAndMaterializationRecordsPreserved: true, publicIntegrationCreated: false, decisionEngineEffect: "ZERO",
    explicitRollbackApprovalRequired: true,
  }));

  it("verifies every activation event artifact checksum", () => {
    const checksums = read<Record<string, string>>(join(EVENT_DIR, "checksums.json"));
    for (const [file, expected] of Object.entries(checksums)) expect(sha(readFileSync(join(EVENT_DIR, file))), file).toBe(expected);
  });
});
