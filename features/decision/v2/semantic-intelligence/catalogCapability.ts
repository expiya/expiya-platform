import type { CatalogSnapshot } from "../catalog/types";
import { calculateCatalogDecisionFactCoverage } from "../catalog/coverage";
import type { AllowedInterpretationFieldId } from "../interpretation/types";

export interface CatalogCapabilityEntry { readonly fieldId: AllowedInterpretationFieldId; readonly status: "EVALUABLE" | "INSUFFICIENT_COVERAGE" | "UNSUPPORTED"; readonly coverageRatio: number; readonly minimumCoverageRatio: number; readonly supportedOperators: readonly ("EQUALS" | "ONE_OF" | "EXCLUDES" | "MINIMUM" | "MAXIMUM")[] }
export interface CatalogCapabilityRegistry { readonly version: "CATALOG-CAPABILITY-0.1"; readonly catalogReleaseVersion: string; readonly catalogFingerprint: string; readonly universeFingerprint: string; readonly entries: readonly CatalogCapabilityEntry[] }

const configured: Readonly<Partial<Record<AllowedInterpretationFieldId, readonly [number, readonly CatalogCapabilityEntry["supportedOperators"][number][]]>>> = Object.freeze({
  bodyStyle: [0.95, ["EQUALS", "ONE_OF", "EXCLUDES"]], fuelType: [0.95, ["EQUALS", "ONE_OF", "EXCLUDES"]], transmission: [0.95, ["EQUALS", "ONE_OF", "EXCLUDES"]], powerKw: [0.9, ["MINIMUM", "MAXIMUM"]], seats: [0.75, ["EQUALS", "MINIMUM"]], drivenWheels: [0.65, ["EQUALS", "ONE_OF"]], luggageLitres: [0.65, ["MINIMUM"]],
});

export function createCatalogCapabilityRegistry(snapshot: CatalogSnapshot, universeFingerprint = snapshot.authority.catalogFingerprint): CatalogCapabilityRegistry {
  const coverage = calculateCatalogDecisionFactCoverage(snapshot); const total = Math.max(1, coverage.totalVariants);
  const fields = new Set<AllowedInterpretationFieldId>([...Object.keys(configured) as AllowedInterpretationFieldId[], "cargoVolumeLitres", "payloadKg", "electricRangeKm", "combinedLitresPer100Km", "combinedKwhPer100Km"]);
  const entries = [...fields].sort().map((fieldId): CatalogCapabilityEntry => {
    const specification = configured[fieldId]; const ratio = (coverage.fields[fieldId] ?? 0) / total;
    if (!specification) return Object.freeze({ fieldId, status: "UNSUPPORTED", coverageRatio: ratio, minimumCoverageRatio: 1, supportedOperators: Object.freeze([]) });
    return Object.freeze({ fieldId, status: ratio >= specification[0] ? "EVALUABLE" : "INSUFFICIENT_COVERAGE", coverageRatio: ratio, minimumCoverageRatio: specification[0], supportedOperators: Object.freeze(specification[1]) });
  });
  return Object.freeze({ version: "CATALOG-CAPABILITY-0.1", catalogReleaseVersion: snapshot.authority.releaseVersion, catalogFingerprint: snapshot.authority.catalogFingerprint, universeFingerprint, entries: Object.freeze(entries) });
}
