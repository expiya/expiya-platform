import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeLayer } from "@/types/equipmentDailyLife";
import { assertActiveEquipmentDailyLifeCompatibility, canPresentEquipmentDailyLifeAsConfirmed, getEquipmentDailyLifeEntry, loadActiveEquipmentDailyLifeLayer, validateEquipmentDailyLifeLayer } from "./equipmentDailyLife";

const BASE = "data/production/equipment-daily-life/release-candidates/v1.0.0-catalog-v0.55.4-2026-08-20-candidate";
const raw = readFileSync(`${BASE}/equipment-daily-life.json`, "utf8");
const layer = JSON.parse(raw) as EquipmentDailyLifeLayer;
const manifest = JSON.parse(readFileSync(`${BASE}/manifest.json`, "utf8")) as { payloadSha256: string };
const sha = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

describe("Equipment Daily-Life V1 candidate", () => {
  it("covers the closed 51-feature vocabulary exactly once", () => {
    expect(layer.entries).toHaveLength(51);
    expect(new Set(layer.entries.map((entry) => entry.featureCode))).toEqual(new Set(EQUIPMENT_FEATURE_CODES));
    expect(validateEquipmentDailyLifeLayer(layer)).toEqual([]);
  });

  it("is checksum-bound, editorial draft, and runtime-disabled", () => {
    expect(manifest.payloadSha256).toBe(sha(raw));
    expect(layer.sourceAuthority).toBe("OWNER_EDITORIAL_DRAFT");
    expect(layer.runtimeAuthority).toBe("DISABLED_PENDING_OWNER_APPROVAL_AND_EQUIPMENT_ACTIVATION");
    expect(layer.entries.every((entry) => entry.decisionUse === "EXPLANATION_ONLY")).toBe(true);
  });

  it("provides a guarded rear-camera explanation", () => {
    const item = getEquipmentDailyLifeEntry(layer, "REAR_VIEW_CAMERA");
    expect(item?.userFacingExplanation).toContain("dar alanlarda park");
    expect(item?.caveat).toContain("yerini almaz");
  });

  it("allows confirmed wording only for verified exact standard equipment", () => {
    expect(canPresentEquipmentDailyLifeAsConfirmed({ availabilityStatus: "STANDARD", provisionMode: "INCLUDED", verificationState: "VERIFIED", conflictState: "CLEAR", sourceApplicability: "EXACT_VARIANT" })).toBe(true);
    for (const availabilityStatus of ["OPTIONAL", "PACKAGE_DEPENDENT", "UNKNOWN", "NOT_AVAILABLE"]) expect(canPresentEquipmentDailyLifeAsConfirmed({ availabilityStatus, provisionMode: "UNRESOLVED", verificationState: "VERIFIED", conflictState: "CLEAR", sourceApplicability: "EXACT_VARIANT" })).toBe(false);
  });

  it("does not claim filtering, ranking, or safety guarantees", () => {
    expect(raw).not.toMatch(/HARD_FILTER|SOFT_PREFERENCE|garanti eder|kesinlikle önler|kaza yaptırmaz/iu);
  });
});

describe("Equipment Daily-Life V1 owner-approved release", () => {
  const releaseBase = "data/production/equipment-daily-life/releases/v1.0.0-catalog-v0.55.4-2026-08-20";
  const releaseRaw = readFileSync(`${releaseBase}/equipment-daily-life.json`, "utf8");
  const release = JSON.parse(releaseRaw) as EquipmentDailyLifeLayer;
  const releaseManifest = JSON.parse(readFileSync(`${releaseBase}/manifest.json`, "utf8")) as { payloadSha256: string; activationPerformed: boolean; ownerApprovalEventId: string };

  it("materializes all 51 approved entries without changing their editorial text", () => {
    expect(validateEquipmentDailyLifeLayer(release)).toEqual([]);
    expect(release.entries).toHaveLength(51);
    expect(release.entries.map((entry) => ({ ...entry, authority: undefined }))).toEqual(layer.entries.map((entry) => ({ ...entry, authority: undefined })));
    expect(release.entries.every((entry) => entry.authority === "OWNER_EDITORIAL")).toBe(true);
  });

  it("binds the immutable release to owner approval without mutating its pre-activation manifest", () => {
    expect(releaseManifest.payloadSha256).toBe(sha(releaseRaw));
    expect(releaseManifest.ownerApprovalEventId).toBe("EQUIPMENT-DAILY-LIFE-V1-OWNER-APPROVAL-001");
    expect(releaseManifest.activationPerformed).toBe(false);
    expect(release.runtimeAuthority).toBe("DISABLED_PENDING_OWNER_APPROVAL_AND_EQUIPMENT_ACTIVATION");
  });

  it("loads through the activated read-only pointer", () => {
    expect(() => assertActiveEquipmentDailyLifeCompatibility()).not.toThrow();
    expect(loadActiveEquipmentDailyLifeLayer()).toMatchObject({ release: "v1.0.1-catalog-v0.55.4-2026-08-20", effectiveRuntimeAuthority: "EXPLANATION_ONLY" });
  });
});
