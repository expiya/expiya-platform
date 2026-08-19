import activePointer from "@/data/production/equipment-daily-life/active.json";
import { activeEquipmentDailyLifeManifest, activeEquipmentDailyLifePayload, activeEquipmentDailyLifeRelease } from "@/data/production/equipment-daily-life/activeEquipmentDailyLife.generated";
import { EQUIPMENT_FEATURE_CODES, type EquipmentFeatureCode } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeEntry, EquipmentDailyLifeLayer } from "@/types/equipmentDailyLife";

const activeLayer = activeEquipmentDailyLifePayload as EquipmentDailyLifeLayer;
const activeManifest = activeEquipmentDailyLifeManifest as { releaseId: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; payloadSha256: string; activationPerformed: boolean };

export function validateEquipmentDailyLifeLayer(layer: EquipmentDailyLifeLayer): readonly string[] {
  const issues: string[] = [];
  if (layer.entries.length !== EQUIPMENT_FEATURE_CODES.length) issues.push("FEATURE_COUNT_MISMATCH");
  const codes = layer.entries.map((entry) => entry.featureCode);
  if (new Set(codes).size !== codes.length) issues.push("DUPLICATE_FEATURE_CODE");
  for (const code of EQUIPMENT_FEATURE_CODES) if (!codes.includes(code)) issues.push(`FEATURE_MISSING:${code}`);
  for (const entry of layer.entries) {
    if (!entry.labelTr.trim() || !entry.dailyLifeBenefit.trim() || !entry.userFacingExplanation.trim() || !entry.caveat.trim()) issues.push(`EMPTY_EDITORIAL_FIELD:${entry.featureCode}`);
    if (entry.decisionUse !== "EXPLANATION_ONLY") issues.push(`DECISION_USE_FORBIDDEN:${entry.featureCode}`);
    if (/\b(garanti eder|kesinlikle önler|kaza yaptırmaz|tam güvenlik)\b/iu.test(`${entry.dailyLifeBenefit} ${entry.userFacingExplanation}`)) issues.push(`SAFETY_GUARANTEE_FORBIDDEN:${entry.featureCode}`);
  }
  return issues;
}

export function getEquipmentDailyLifeEntry(layer: EquipmentDailyLifeLayer, featureCode: EquipmentFeatureCode): EquipmentDailyLifeEntry | undefined {
  return layer.entries.find((entry) => entry.featureCode === featureCode);
}

export function canPresentEquipmentDailyLifeAsConfirmed(input: { availabilityStatus: string; provisionMode: string; verificationState: string; conflictState: string; sourceApplicability: string }): boolean {
  return input.availabilityStatus === "STANDARD" && input.provisionMode === "INCLUDED" && input.verificationState === "VERIFIED" && input.conflictState === "CLEAR" && input.sourceApplicability === "EXACT_VARIANT";
}

export function loadActiveEquipmentDailyLifeLayer(): Readonly<{ layer: EquipmentDailyLifeLayer; release: string; effectiveRuntimeAuthority: "EXPLANATION_ONLY" }> {
  assertActiveEquipmentDailyLifeCompatibility();
  return Object.freeze({ layer: activeLayer, release: activeEquipmentDailyLifeRelease, effectiveRuntimeAuthority: "EXPLANATION_ONLY" as const });
}

export function assertActiveEquipmentDailyLifeCompatibility(): void {
  if (activePointer.state !== "ACTIVE" || activePointer.activeEquipmentDailyLifeRelease !== activeEquipmentDailyLifeRelease
    || activePointer.compatibleCatalogRelease !== activeLayer.compatibleCatalogRelease
    || activePointer.compatibleCatalogFingerprint !== activeLayer.compatibleCatalogFingerprint
    || activePointer.payloadSha256 !== activeManifest.payloadSha256 || activeManifest.releaseId !== activeEquipmentDailyLifeRelease
    || activePointer.runtimeAuthority !== "EXPLANATION_ONLY") {
    throw new Error("ACTIVE_EQUIPMENT_DAILY_LIFE_POINTER_MISMATCH");
  }
  const issues = validateEquipmentDailyLifeLayer(activeLayer);
  if (issues.length) throw new Error(`ACTIVE_EQUIPMENT_DAILY_LIFE_INVALID:${issues.join(",")}`);
}
