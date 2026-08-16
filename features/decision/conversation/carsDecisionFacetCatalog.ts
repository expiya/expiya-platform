import { z } from "zod";

import { activeDecisionFacetPayload as facetPayload } from "@/data/production/catalog/activeCatalog.generated";

const definitionSchema = z.object({
  id: z.string().min(1),
  requirementKey: z.string().min(1),
  valuePath: z.string().regex(/^[A-Za-z0-9_.]+$/),
  operator: z.enum(["MIN", "MAX", "EQUAL"]),
  questionPurpose: z.string().regex(/^CATALOG_FACET:[A-Za-z0-9_]+$/),
  question: z.string().min(1),
  inputPatterns: z.array(z.string().min(1)).min(1),
  answerMappings: z.array(z.object({
    label: z.string().min(1),
    patterns: z.array(z.string().min(1)).min(1),
    value: z.number(),
  })).optional(),
  askByDefault: z.boolean().default(false),
  questionTriggers: z.array(z.string().min(1)).optional(),
  scale: z.number().positive().default(1),
});

export type CarsDecisionFacetDefinition = z.infer<typeof definitionSchema>;

const payloadSchema = z.object({ version: z.literal(1), facets: z.array(definitionSchema) });
export const carsDecisionFacetDefinitions = Object.freeze(payloadSchema.parse(facetPayload).facets);

export function validateDecisionFacetCoverage(
  records: readonly unknown[],
  definitions: readonly CarsDecisionFacetDefinition[] = carsDecisionFacetDefinitions,
): void {
  const ids = new Set<string>();
  const requirementKeys = new Set<string>();
  for (const definition of definitions) {
    if (ids.has(definition.id)) throw new Error(`DUPLICATE_DECISION_FACET_ID:${definition.id}`);
    if (requirementKeys.has(definition.requirementKey)) throw new Error(`DUPLICATE_DECISION_FACET_REQUIREMENT:${definition.requirementKey}`);
    ids.add(definition.id);
    requirementKeys.add(definition.requirementKey);
    if (!records.some((record) => valueAtPath(record, definition.valuePath) !== undefined)) {
      throw new Error(`DECISION_FACET_WITHOUT_CATALOG_VALUES:${definition.id}`);
    }
  }
}

export function valueAtPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (
    value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined
  ), source);
}

export function extractDeclarativeFacetFacts(
  text: string,
  definitions: readonly CarsDecisionFacetDefinition[] = carsDecisionFacetDefinitions,
): readonly { key: string; value: number }[] {
  const facts: { key: string; value: number }[] = [];
  for (const definition of definitions) {
    for (const source of definition.inputPatterns) {
      const match = text.match(new RegExp(source, "iu"));
      if (!match?.[1]) continue;
      const parsed = Number(match[1].replace(",", ".")) * definition.scale;
      if (Number.isFinite(parsed)) facts.push({ key: definition.requirementKey, value: parsed });
      break;
    }
  }
  return facts;
}

export function declarativeFacetPredicate(
  definition: CarsDecisionFacetDefinition,
  requirementValue: string | number,
): (record: unknown) => boolean {
  return (record) => {
    const actual = valueAtPath(record, definition.valuePath);
    if (actual === undefined || actual === null) return false;
    if (definition.operator === "EQUAL") return String(actual) === String(requirementValue);
    if (typeof actual !== "number" || typeof requirementValue !== "number") return false;
    return definition.operator === "MIN" ? actual >= requirementValue : actual <= requirementValue;
  };
}
