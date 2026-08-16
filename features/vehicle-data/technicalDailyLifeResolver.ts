import activePointer from "@/data/production/technical-daily-life/active.json";
import {
  activeTechnicalDailyLifeManifest,
  activeTechnicalDailyLifePayload,
  activeTechnicalDailyLifeRelease,
  compatibleTechnicalDailyLifeCatalogRelease,
} from "@/data/production/technical-daily-life/activeTechnicalDailyLife.generated";
import type {
  TechnicalCondition,
  TechnicalDailyLifeField,
  TechnicalDailyLifeLayer,
  TechnicalDailyLifeManifest,
  TechnicalDailyLifeMapping,
  UsageContext,
} from "@/types/technicalDailyLife";

import { parseTechnicalDailyLifeLayer } from "./technicalDailyLifeSchema";

const activeLayer = parseTechnicalDailyLifeLayer(activeTechnicalDailyLifePayload);
const manifest = activeTechnicalDailyLifeManifest as TechnicalDailyLifeManifest;

export interface ResolveTechnicalDailyLifeMappingsInput {
  readonly technicalField: string;
  readonly technicalValue: unknown;
  readonly usageContexts?: readonly UsageContext[];
  readonly dependentFieldValues?: Readonly<Record<string, unknown>>;
}

function conditionMatches(condition: TechnicalCondition, value: unknown): boolean {
  if (condition.operator === "RANGE") {
    if (typeof value !== "number" || condition.min === undefined || condition.max === undefined) return false;
    return (condition.minInclusive === false ? value > condition.min : value >= condition.min)
      && (condition.maxInclusive === false ? value < condition.max : value <= condition.max);
  }
  if (condition.operator === "IN") {
    if (!condition.values) return false;
    return Array.isArray(value) ? value.some((item) => condition.values!.includes(String(item))) : condition.values.includes(String(value));
  }
  if (condition.operator === "EXISTS") return value !== undefined && value !== null;
  return false;
}

function dependentConditionsMatch(mapping: TechnicalDailyLifeMapping, values: Readonly<Record<string, unknown>> | undefined): boolean {
  for (const dependent of mapping.dependentFields) {
    const valueWasProvided = values && Object.hasOwn(values, dependent.technicalField);
    if (dependent.condition.operator === "EXISTS" && !valueWasProvided) continue;
    if (!valueWasProvided || !conditionMatches(dependent.condition, values![dependent.technicalField])) return false;
  }
  const applicableChecks: readonly [readonly string[], string][] = [
    [mapping.applicableFuelTypes, "fuelType"], [mapping.applicableBodyStyles, "bodyStyle"],
    [mapping.applicableVehicleUseClasses, "vehicleUseClass"],
  ];
  return applicableChecks.every(([allowed, key]) => allowed.length === 0
    || Boolean(values && Object.hasOwn(values, key) && allowed.includes(String(values[key]))));
}

function contextMatches(mapping: TechnicalDailyLifeMapping, contexts: readonly UsageContext[] | undefined): boolean {
  return !contexts?.length || mapping.usageContext.some((context) => contexts.includes(context));
}

export function loadActiveTechnicalDailyLifeLayer(): Readonly<{
  layer: TechnicalDailyLifeLayer;
  manifest: TechnicalDailyLifeManifest;
  release: string;
  compatibleCatalogRelease: string;
}> {
  return Object.freeze({ layer: activeLayer, manifest, release: activeTechnicalDailyLifeRelease, compatibleCatalogRelease: compatibleTechnicalDailyLifeCatalogRelease });
}

export function getTechnicalDailyLifeField(technicalField: string): TechnicalDailyLifeField | undefined {
  return activeLayer.fields.find((field) => field.technicalField === technicalField);
}

export function getTechnicalDailyLifeMappings(technicalField: string): readonly TechnicalDailyLifeMapping[] {
  return getTechnicalDailyLifeField(technicalField)?.usageMappings ?? [];
}

export function getTechnicalDailyLifeMappingById(mappingId: string): TechnicalDailyLifeMapping | undefined {
  return activeLayer.fields.flatMap((field) => field.usageMappings).find((mapping) => mapping.mappingId === mappingId);
}

export function resolveTechnicalDailyLifeMappings(input: ResolveTechnicalDailyLifeMappingsInput): readonly TechnicalDailyLifeMapping[] {
  if (input.technicalValue === undefined || input.technicalValue === null) return [];
  return getTechnicalDailyLifeMappings(input.technicalField).filter((mapping) => (
    ["RANGE", "IN", "EXISTS"].includes(mapping.technicalCondition.operator)
    && conditionMatches(mapping.technicalCondition, input.technicalValue)
    && dependentConditionsMatch(mapping, input.dependentFieldValues)
    && contextMatches(mapping, input.usageContexts)
  ));
}

export function assertActiveTechnicalDailyLifePointer(): void {
  if (activePointer.state !== "ACTIVE" || activePointer.activeTechnicalDailyLifeRelease !== activeTechnicalDailyLifeRelease
    || activePointer.compatibleCatalogRelease !== compatibleTechnicalDailyLifeCatalogRelease
    || activePointer.schemaVersion !== manifest.schemaVersion || manifest.releaseId !== activeTechnicalDailyLifeRelease) {
    throw new Error("ACTIVE_TECHNICAL_DAILY_LIFE_POINTER_MISMATCH");
  }
}
