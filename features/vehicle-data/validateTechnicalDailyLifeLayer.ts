import { createHash } from "node:crypto";

import type { TechnicalDailyLifeField, TechnicalDailyLifeLayer, TechnicalDailyLifeMapping } from "@/types/technicalDailyLife";

export interface TechnicalDailyLifeValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly mappingId?: string;
}

const forbiddenIllustrativeUses = new Set(["MAP_TO_TECHNICAL_RANGE", "SOFT_PREFERENCE_ONLY", "HARD_FILTER_AFTER_CONFIRMATION", "HARD_FILTER_DIRECT"]);
const expectedUnits: Readonly<Record<string, string | null>> = {
  "activeNewPrice.amountTry": "TRY", "variant.modelYear.value": "year", "variant.powertrain.engineDisplacementCc.value": "cc",
  "variant.powertrain.powerKw.value": "kW", "variant.powertrain.torqueNm.value": "Nm", "variant.dimensions.lengthMm.value": "mm",
  "variant.dimensions.widthMm.value": "mm", "variant.dimensions.heightMm.value": "mm", "variant.dimensions.wheelbaseMm.value": "mm",
  "variant.dimensions.seats.value": "count", "variant.dimensions.luggageLitres.value": "L", "variant.dimensions.cargoVolumeLitres.value": "L",
  "variant.dimensions.payloadKg.value": "kg", "variant.dimensions.brakedTowingKg.value": "kg",
  "variant.efficiency.combinedLitresPer100Km.value": "L/100km", "variant.efficiency.combinedKwhPer100Km.value": "kWh/100km",
  "variant.efficiency.electricRangeKm.value": "km", "variant.efficiency.batteryCapacityKwh.value": "kWh",
  "variant.efficiency.batteryUsableKwh.value": "kWh", "variant.efficiency.maxDcChargeKw.value": "kW",
};

export function sha256Text(value: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function valueAtCatalogPath(source: unknown, path: string): unknown {
  if (path.endsWith("[].value")) {
    const array = path.slice(0, -"[].value".length).split(".").reduce<unknown>((value, key) => (
      value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined
    ), source);
    return Array.isArray(array) ? array.map((item) => item && typeof item === "object" ? (item as Record<string, unknown>).value : undefined).filter((item) => item !== undefined) : undefined;
  }
  return path.split(".").reduce<unknown>((value, key) => (
    value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined
  ), source);
}

function matchesRange(mapping: TechnicalDailyLifeMapping, value: number): boolean {
  const condition = mapping.technicalCondition;
  if (condition.operator !== "RANGE" || condition.min === undefined || condition.max === undefined) return false;
  return (condition.minInclusive === false ? value > condition.min : value >= condition.min)
    && (condition.maxInclusive === false ? value < condition.max : value <= condition.max);
}

function validateInvariant(mapping: TechnicalDailyLifeMapping): TechnicalDailyLifeValidationIssue[] {
  const ref = { mappingId: mapping.mappingId };
  if (mapping.interpretationClass === "DECISION_SAFE" && (
    mapping.rankingEffect !== "DIRECT_FILTER" || !mapping.hardFilterEligible || mapping.confirmationRequiredForHardFilter
  )) return [{ code: "DECISION_SAFE_INVARIANT", message: "DECISION_SAFE invariant failed.", ...ref }];
  if (mapping.interpretationClass === "GUIDED_APPROXIMATION" && (
    mapping.rankingEffect !== "SOFT_UNTIL_CONFIRMED" || mapping.hardFilterEligible || !mapping.confirmationRequiredForHardFilter
  )) return [{ code: "GUIDED_APPROXIMATION_INVARIANT", message: "GUIDED_APPROXIMATION invariant failed.", ...ref }];
  if (mapping.interpretationClass === "ILLUSTRATIVE_ONLY" && (
    mapping.rankingEffect !== "NONE" || mapping.hardFilterEligible || mapping.confirmationRequiredForHardFilter
    || mapping.decisionUse.some((item) => forbiddenIllustrativeUses.has(item))
  )) return [{ code: "ILLUSTRATIVE_ONLY_INVARIANT", message: "ILLUSTRATIVE_ONLY invariant failed.", ...ref }];
  return [];
}

export function validateTechnicalDailyLifeLayer(layer: TechnicalDailyLifeLayer): readonly TechnicalDailyLifeValidationIssue[] {
  const issues: TechnicalDailyLifeValidationIssue[] = [];
  const mappingIds = new Set<string>();
  const fields = new Set(layer.fields.map((field) => field.technicalField));
  for (const field of layer.fields) for (const mapping of field.usageMappings) {
    if (mappingIds.has(mapping.mappingId)) issues.push({ code: "DUPLICATE_MAPPING_ID", message: `Duplicate mappingId ${mapping.mappingId}.`, field: field.technicalField, mappingId: mapping.mappingId });
    mappingIds.add(mapping.mappingId);
    issues.push(...validateInvariant(mapping).map((issue) => ({ ...issue, field: field.technicalField })));
    for (const dependent of mapping.dependentFields) if (!fields.has(dependent.technicalField)) {
      issues.push({ code: "UNKNOWN_DEPENDENT_FIELD", message: `Unknown dependent field ${dependent.technicalField}.`, field: field.technicalField, mappingId: mapping.mappingId });
    }
  }
  return issues;
}

function observedValues(records: readonly unknown[], field: TechnicalDailyLifeField): readonly unknown[] {
  if (!field.catalogPath) return [];
  return records.flatMap((record) => {
    const value = valueAtCatalogPath(record, field.catalogPath!);
    return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  });
}

export function validateTechnicalDailyLifeCatalogCompatibility(input: {
  readonly layer: TechnicalDailyLifeLayer;
  readonly records: readonly unknown[];
  readonly catalogRelease: string;
  readonly expectedCatalogRelease: string;
}): readonly TechnicalDailyLifeValidationIssue[] {
  const issues: TechnicalDailyLifeValidationIssue[] = [];
  if (input.catalogRelease !== input.expectedCatalogRelease) issues.push({ code: "CATALOG_RELEASE_MISMATCH", message: `Expected ${input.expectedCatalogRelease}, received ${input.catalogRelease}.` });
  for (const field of input.layer.fields) {
    if (field.schemaState === "SCHEMA_MISSING") {
      if (field.catalogPath !== null) issues.push({ code: "MISSING_SCHEMA_WITH_PATH", message: "SCHEMA_MISSING field must not declare catalogPath.", field: field.technicalField });
      continue;
    }
    if (!field.catalogPath) {
      issues.push({ code: "DECLARED_FIELD_WITHOUT_PATH", message: "Declared field lacks catalogPath.", field: field.technicalField });
      continue;
    }
    const values = observedValues(input.records, field);
    if (values.length === 0) {
      issues.push({ code: "CATALOG_PATH_WITHOUT_VALUES", message: `No active catalog value at ${field.catalogPath}.`, field: field.technicalField });
      continue;
    }
    const numericExpected = field.dataType === "number" || field.dataType === "integer";
    const populatedRecords = input.records.filter((record) => {
      const value = valueAtCatalogPath(record, field.catalogPath!);
      return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
    }).length;
    const currentCoverage = input.records.length ? populatedRecords / input.records.length : 0;
    if (Math.abs(currentCoverage - field.coverageRatio) >= 0.1) issues.push({ code: "CRITICAL_COVERAGE_DRIFT",
      message: `Coverage changed from ${(field.coverageRatio * 100).toFixed(1)}% to ${(currentCoverage * 100).toFixed(1)}%.`, field: field.technicalField });
    if (values.some((value) => numericExpected ? typeof value !== "number" || !Number.isFinite(value) : typeof value !== "string")) {
      issues.push({ code: "CATALOG_DATA_TYPE_MISMATCH", message: `Observed value type does not match ${field.dataType}.`, field: field.technicalField });
    }
    const expectedUnit = expectedUnits[field.catalogPath];
    if (expectedUnit !== undefined && field.unit !== expectedUnit) issues.push({ code: "UNIT_MISMATCH", message: `Expected unit ${expectedUnit}, received ${field.unit}.`, field: field.technicalField });
    const automatic = field.usageMappings.filter((mapping) => ["RANGE", "IN", "EXISTS"].includes(mapping.technicalCondition.operator));
    const exhaustiveCoverageRequired = !["EXPLANATION_ONLY", "INSUFFICIENT_COVERAGE", "NOT_READY"].includes(field.dailyLifeLayerStatus);
    if (numericExpected) {
      for (const value of values as number[]) if (exhaustiveCoverageRequired && !automatic.some((mapping) => matchesRange(mapping, value))) {
        issues.push({ code: "UNCOVERED_NUMERIC_VALUE", message: `Observed value ${value} is outside all declared bands.`, field: field.technicalField });
        break;
      }
      const groups = new Map<string, TechnicalDailyLifeMapping[]>();
      for (const mapping of automatic.filter((item) => item.technicalCondition.operator === "RANGE")) {
        const signature = JSON.stringify({ dependentFields: mapping.dependentFields, fuel: mapping.applicableFuelTypes,
          body: mapping.applicableBodyStyles, useClass: mapping.applicableVehicleUseClasses });
        groups.set(signature, [...(groups.get(signature) ?? []), mapping]);
      }
      for (const mappings of groups.values()) {
        const sorted = [...mappings].sort((left, right) => left.technicalCondition.min! - right.technicalCondition.min!);
        for (let index = 1; index < sorted.length; index += 1) if (sorted[index].technicalCondition.min! <= sorted[index - 1].technicalCondition.max!) {
          issues.push({ code: "OVERLAPPING_NUMERIC_BANDS", message: `${sorted[index - 1].mappingId} overlaps ${sorted[index].mappingId}.`, field: field.technicalField });
        }
      }
    } else if (field.dataType.startsWith("categorical")) {
      const allowed = new Set(automatic.flatMap((mapping) => mapping.technicalCondition.values ?? []));
      const unknown = [...new Set((values as string[]).filter((value) => !allowed.has(value)))];
      const observed = new Set(values as string[]);
      const stale = [...allowed].filter((value) => !observed.has(value));
      if (exhaustiveCoverageRequired && unknown.length) issues.push({ code: "UNCOVERED_CATEGORICAL_VALUE", message: `Uncovered categorical values: ${unknown.join(", ")}.`, field: field.technicalField });
      if (stale.length) issues.push({ code: "STALE_CATEGORICAL_MAPPING_VALUE", message: `Mapped values no longer present: ${stale.join(", ")}.`, field: field.technicalField });
    }
  }
  return issues;
}

export function assertTechnicalDailyLifeCompatibility(input: Parameters<typeof validateTechnicalDailyLifeCatalogCompatibility>[0]): void {
  const issues = [...validateTechnicalDailyLifeLayer(input.layer), ...validateTechnicalDailyLifeCatalogCompatibility(input)];
  if (issues.length) throw new Error(`TECHNICAL_DAILY_LIFE_VALIDATION_FAILED:\n${issues.map((issue) => `${issue.code}${issue.field ? `:${issue.field}` : ""} ${issue.message}`).join("\n")}`);
}
