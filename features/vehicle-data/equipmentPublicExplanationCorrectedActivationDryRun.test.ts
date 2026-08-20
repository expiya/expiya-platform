import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const ID = "EPEA-ACTMAN-A68831FC3F16C7619F25";
const DIR = join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-preparations", ID);
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;
const dailyPointerPath = join(DIR, "targets/equipment-daily-life.active.json");
const dailyModulePath = join(DIR, "targets/activeEquipmentDailyLife.generated.ts.txt");
const authorityPointerPath = join(DIR, "targets/equipment-public-explanation-authority.active.json");
const authorityModulePath = join(DIR, "targets/activeEquipmentPublicExplanationAuthority.generated.ts.txt");

describe("corrected EPEA ACTIVE target dry-run", () => {
  const manifest = read<Record<string, unknown>>(join(DIR, "activation-manifest.json"));
  const dryRun = read<Record<string, unknown>>(join(DIR, "activation-dry-run.json"));
  const dailyPointer = read<Record<string, unknown>>(dailyPointerPath);
  const authorityPointer = read<Record<string, unknown>>(authorityPointerPath);
  const dailyModule = readFileSync(dailyModulePath, "utf8");
  const authorityModule = readFileSync(authorityModulePath, "utf8");

  it("creates one checksum-bound append-only activation preparation", () => {
    const siblings = readdirSync(join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-preparations"));
    expect(siblings.filter((item) => item === ID)).toHaveLength(1);
    expect(manifest).toMatchObject({ activationManifestId: ID,
      activationManifestChecksum: "sha256:a604677715168c97ede36bc3d6d8944609701323c2c102db5b163824300986fe",
      productionCompositeBindingChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082",
      publicIntegration: false, decisionEngineEffect: "ZERO", explicitOwnerActivationApprovalRequired: true });
    expect(Number.isFinite(Date.parse(manifest.preparedAt as string))).toBe(true);
  });

  it("contains actual ACTIVE pointers without proposed markers", () => {
    for (const pointer of [dailyPointer, authorityPointer]) expect(pointer).toMatchObject({ state: "ACTIVE", activationApprovalRequired: false,
      materializationId: "EPEA-MAT-59027C9336AFF309281C", productionCompositeBindingChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082" });
    expect(dailyPointer).toMatchObject({ activeEquipmentDailyLifeRelease: "v1.0.1-catalog-v0.55.4-2026-08-20",
      payloadSha256: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233" });
    expect(authorityPointer).toMatchObject({ activePublicExplanationAuthorityRelease: "v0.1.2-catalog-v0.55.4-2026-08-20",
      payloadSha256: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd", publicActivation: false, publicIntegration: false, decisionEngineEffect: "ZERO" });
    expect(`${JSON.stringify(dailyPointer)}${JSON.stringify(authorityPointer)}`).not.toMatch(/candidate|PROPOSED_NOT_ACTIVE/u);
  });

  it("contains installable generated modules with checksum-bound fail-closed guards", () => {
    for (const generatedModule of [dailyModule, authorityModule]) {
      expect(generatedModule).not.toMatch(/Proposed only|Not active|PROPOSED_NOT_ACTIVE|activation disabled/iu);
      expect(generatedModule).toContain("throw new Error");
      expect(generatedModule).toContain("payloadChecksum");
      expect(generatedModule).toContain("manifestChecksum");
      expect(generatedModule).toContain("compositeBindingChecksum");
    }
  });

  it("matches all four renewed approval target checksums", () => expect({
    dailyLifePointer: sha(readFileSync(dailyPointerPath)), dailyLifeGeneratedModule: sha(readFileSync(dailyModulePath)),
    authorityPointer: sha(readFileSync(authorityPointerPath)), authorityGeneratedModule: sha(readFileSync(authorityModulePath)),
  }).toEqual({
    dailyLifePointer: "sha256:4c25ab5b88a7e437fa20c0d6d3827180f028f5580fc2ed7b92f7c7246f48ba23",
    dailyLifeGeneratedModule: "sha256:31e8889bfc91322801c965d756e638d46dea4856ae2b0df905343aa0b927d5ae",
    authorityPointer: "sha256:142f84a7bd526177222ca4d3d3e9602e909e5dc19a753166cc77eb69fdf30602",
    authorityGeneratedModule: "sha256:be2457e2a2614ed530c0777cf903641a17137e0f803517c208f6c2de01c4d773",
  }));

  it("imports both target modules from an isolated production-shaped file tree", () => {
    const stage = mkdtempSync(join(tmpdir(), "epea-loader-simulation-"));
    const daily = join(stage, "equipment-daily-life"); const authority = join(stage, "equipment-public-explanation-authority");
    mkdirSync(daily); mkdirSync(authority);
    symlinkSync(join(ROOT, "data/production/equipment-daily-life/releases"), join(daily, "releases"));
    symlinkSync(join(ROOT, "data/production/equipment-public-explanation-authority/releases"), join(authority, "releases"));
    copyFileSync(dailyModulePath, join(daily, "activeEquipmentDailyLife.generated.ts"));
    copyFileSync(authorityModulePath, join(authority, "activeEquipmentPublicExplanationAuthority.generated.ts"));
    const code = `Promise.all([import(${JSON.stringify(`file://${join(daily, "activeEquipmentDailyLife.generated.ts")}`)}),import(${JSON.stringify(`file://${join(authority, "activeEquipmentPublicExplanationAuthority.generated.ts")}`)})]).then(([d,a])=>{if(d.activeEquipmentDailyLifeRelease!==${JSON.stringify("v1.0.1-catalog-v0.55.4-2026-08-20")}||a.activeEquipmentPublicExplanationAuthorityRelease!==${JSON.stringify("v0.1.2-catalog-v0.55.4-2026-08-20")}||d.activeEquipmentDailyLifeCompositeBindingChecksum!==a.activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum)process.exit(2)})`;
    const result = spawnSync(process.execPath, ["--import", "tsx", "-e", code], { cwd: ROOT, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
  });

  it("preserves the previous invalid targets as superseded history", () => expect(dryRun.previousInvalidTargets).toEqual({
    dailyPointer: "sha256:3158a8a66408310510ad0e6a02b324fb8317a01b56dd6f9d54a5ee85229509e8",
    dailyModule: "sha256:cde2bfccca5a1ab16f4af7098e76a784bf16f9f844d864bafe5e990bc9103176",
    authorityPointer: "sha256:7e91a375ee54fbb88bb6cda87d5713591e82ea45f2b42b010cb02d952dd49699",
    authorityModule: "sha256:419a70b160860b3d333d07d474baf4f7d6a80cbafcf61d3a3caee7ae12d8790a",
    disposition: "APPROVED_TARGET_NOT_ACTIVATABLE", lifecycle: "SUPERSEDED_INVALID_FOR_ACTIVATION", immutableHistoricalArtifactsPreserved: true,
  }));

  it("models exact rollback bytes and no fictional Authority predecessor", () => {
    const plan = read<Record<string, unknown>>(join(DIR, "rollback-plan.json"));
    expect(plan).toMatchObject({ currentEquipmentDailyLife: { releaseId: "v1.0.0-catalog-v0.55.4-2026-08-20" },
      currentPublicExplanationAuthority: { state: "NO_ACTIVE_PREDECESSOR", releaseId: null },
      rollbackTargets: { equipmentDailyLife: { releaseId: "v1.0.0-catalog-v0.55.4-2026-08-20" }, publicExplanationAuthority: { state: "UNCONFIGURED_DISABLED" } },
      appendOnlyGovernanceAndMaterializationRecordsPreserved: true, publicIntegrationCreated: false, decisionEngineEffect: "ZERO" });
  });

  it("verifies every dry-run artifact checksum and READY simulation", () => {
    const checksums = read<Record<string, string>>(join(DIR, "checksums.json"));
    for (const [file, expected] of Object.entries(checksums)) expect(sha(readFileSync(join(DIR, file))), file).toBe(expected);
    expect(dryRun).toMatchObject({ finalDisposition: "READY_FOR_RENEWED_EXPLICIT_COMPOSITE_ACTIVATION_APPROVAL",
      activeProductionFilesChanged: false, activationEventCreated: false, activationPerformed: false, publicIntegration: false, decisionEngineEffect: "ZERO" });
    expect(Object.values(dryRun.runtimeSimulation as Record<string, string>)).not.toContain("FAIL");
  });

  it("records that the preparation itself did not create an activation event", () => {
    expect(dryRun).toMatchObject({ activeProductionFilesChanged: false, activationEventCreated: false, activationPerformed: false });
    expect(existsSync(join(ROOT, "data/production/equipment-public-explanation-authority/governance/activation-events/EPEA-ACT-398AFB4D87D728F55384/activation-event.json"))).toBe(true);
  });
});
