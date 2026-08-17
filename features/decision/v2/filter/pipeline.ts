import type { CatalogFact, CatalogVariantSnapshot } from "../catalog/types";
import { normalizeCatalogIdentity } from "../catalog/normalization";
import { catalogFactReference } from "../usage/authority";
import { evaluateUsageCargoSuitability } from "../usage/evaluate";
import type { ActiveHardConstraint, DecisionFieldDefinition, FilterOperator, FilterStepTrace, PipelineDiagnostic, TechnicalCandidatePool, TechnicalCandidateResult, TechnicalPipelineInput } from "./types";

const POLICY = Object.freeze([{ policyId: "v2-technical-filter-pipeline", policyVersion: "1.0.0", decisionEffect: "HARD_FILTER" as const }]);
const OPERATORS = new Set<FilterOperator>(["EQUALS", "ONE_OF", "EXCLUDES", "MINIMUM", "MAXIMUM"]);

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== "object" || seen.has(value as object)) return value;
  seen.add(value as object); for (const child of Object.values(value as object)) deepFreeze(child, seen); return Object.freeze(value);
}
type Outcome = "PASS" | "FAIL" | "UNKNOWN";
type Mutable = { variant: CatalogVariantSnapshot; familyId: string; passed: string[]; failed: string[]; unknown: string[]; reasons: string[]; facts: ReturnType<typeof catalogFactReference>[] };

function evaluateFact(definition: DecisionFieldDefinition, constraint: ActiveHardConstraint, fact: CatalogFact<unknown> | undefined, fingerprint: string): { outcome: Outcome; reason: string } {
  if (!OPERATORS.has(constraint.operator as FilterOperator) || !definition.supportedOperators.includes(constraint.operator as FilterOperator)) return { outcome: "UNKNOWN", reason: "UNSUPPORTED_FILTER_OPERATOR" };
  if (definition.unit && constraint.unit !== definition.unit) return { outcome: "UNKNOWN", reason: "FILTER_UNIT_MISMATCH" };
  if (!fact || fact.catalogFingerprint !== fingerprint || fact.provenance.length === 0 || fact.confidence === "LOW") return { outcome: "UNKNOWN", reason: "FACT_NOT_HARD_EVALUABLE" };
  const value = constraint.value; const operator = constraint.operator as FilterOperator;
  if (definition.valueType === "NUMBER" && (typeof value !== "number" || !Number.isFinite(value))) return { outcome: "UNKNOWN", reason: "FILTER_VALUE_TYPE_MISMATCH" };
  if ((definition.valueType === "STRING" || definition.valueType === "ENUM") && operator !== "ONE_OF" && operator !== "EXCLUDES" && typeof value !== "string") return { outcome: "UNKNOWN", reason: "FILTER_VALUE_TYPE_MISMATCH" };
  if ((operator === "ONE_OF" || operator === "EXCLUDES") && (!Array.isArray(value) || value.some((item) => typeof item !== "string"))) return { outcome: "UNKNOWN", reason: "FILTER_VALUE_TYPE_MISMATCH" };
  const allowed = definition.enumValues;
  const values = Array.isArray(value) ? value : [value];
  if (allowed && values.some((item) => typeof item !== "string" || !allowed.includes(item))) return { outcome: "UNKNOWN", reason: "FILTER_VALUE_TYPE_MISMATCH" };
  const comparable = (candidate: unknown): unknown => {
    if (definition.fieldId !== "transmission" || typeof candidate !== "string") return candidate;
    if (/manual/iu.test(candidate)) return "MANUAL";
    if (/automatic|otomatik|dct|cvt|e-?dct|tek oran|single.speed/iu.test(candidate)) return "AUTOMATIC";
    return candidate.toLocaleUpperCase("tr-TR");
  };
  const factValue = comparable(fact.value); const comparableValues = values.map(comparable);
  let pass = false;
  if (operator === "EQUALS") pass = factValue === comparable(value);
  if (operator === "ONE_OF") pass = comparableValues.includes(factValue);
  if (operator === "EXCLUDES") pass = !comparableValues.includes(factValue);
  if (operator === "MINIMUM") pass = typeof fact.value === "number" && fact.value >= (value as number);
  if (operator === "MAXIMUM") pass = typeof fact.value === "number" && fact.value <= (value as number);
  return { outcome: pass ? "PASS" : "FAIL", reason: pass ? "TECHNICAL_FACT_MATCH" : "TECHNICAL_FACT_MISMATCH" };
}

function add(mutable: Mutable, filterId: string, outcome: Outcome, reason: string, fact?: CatalogFact<unknown>, field?: string) {
  (outcome === "PASS" ? mutable.passed : outcome === "FAIL" ? mutable.failed : mutable.unknown).push(filterId);
  mutable.reasons.push(reason);
  if (fact && field) mutable.facts.push(catalogFactReference(field, fact));
}

export function evaluateTechnicalCandidatePool(input: TechnicalPipelineInput): TechnicalCandidatePool {
  const diagnostics: PipelineDiagnostic[] = [...input.activeConstraints.diagnostics];
  if (!input.decisionFingerprint.trim()) diagnostics.push({ code: "DECISION_FINGERPRINT_MISSING" });
  const variants = [...input.snapshot.variants].sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(variants.map((v) => v.id)).size !== variants.length) diagnostics.push({ code: "DUPLICATE_SNAPSHOT_VARIANT_ID" });
  const familyByVariant = new Map<string, string>();
  for (const family of input.snapshot.familyIndex.values()) for (const id of family.variantIds) familyByVariant.set(id, family.familyId);
  const states: Mutable[] = variants.map((variant) => ({ variant, familyId: familyByVariant.get(variant.id) ?? "", passed: [], failed: [], unknown: [], reasons: [], facts: [] }));
  const traces: FilterStepTrace[] = [];
  const trace = (filterId: string, fieldId: string, constraintIds: readonly string[], outcomes: Map<string, Outcome>, reasons: readonly string[]) => traces.push({ filterId, fieldId, constraintIds, inputCandidateIds: variants.map((v) => v.id), passedCandidateIds: variants.filter((v) => outcomes.get(v.id) === "PASS").map((v) => v.id), notEvaluableCandidateIds: variants.filter((v) => outcomes.get(v.id) === "UNKNOWN").map((v) => v.id), eliminatedCandidateIds: variants.filter((v) => outcomes.get(v.id) === "FAIL").map((v) => v.id), reasonCodes: [...new Set(reasons)].sort(), policyReferences: POLICY });

  const scopeOutcomes = new Map<string, Outcome>();
  for (const state of states) { const outcome: Outcome = state.variant.market !== input.snapshot.authority.market ? "FAIL" : state.variant.lifecycleStatus === "ON_SALE" ? "PASS" : state.variant.lifecycleStatus === "ANNOUNCED" ? "UNKNOWN" : "FAIL"; add(state, "scope:lifecycle", outcome, `SCOPE_${state.variant.lifecycleStatus}`); scopeOutcomes.set(state.variant.id, outcome); }
  trace("scope:lifecycle", "lifecycleStatus", [], scopeOutcomes, states.flatMap((s) => s.reasons));

  const exactIds = new Set(variants.map((v) => v.id)); const familyIds = new Set(input.snapshot.familyIndex.values().map((f) => f.familyId)); const brandIds = new Set(input.snapshot.brandIndex.values().map((b) => b.normalizedBrand));
  for (const rejection of input.activeRejections.rejections) {
    const reference = rejection.scope === "EXACT_VARIANT" ? rejection.candidateId : rejection.scope === "MODEL_FAMILY" ? rejection.familyId : rejection.brandId;
    const known = !!reference && (rejection.scope === "EXACT_VARIANT" ? exactIds : rejection.scope === "MODEL_FAMILY" ? familyIds : brandIds).has(reference);
    if (!known) diagnostics.push({ code: "UNKNOWN_REJECTION_REFERENCE", referenceId: rejection.id });
  }
  const rejectionOutcomes = new Map<string, Outcome>();
  for (const state of states) {
    const rejected = input.activeRejections.rejections.some((r) => r.scopeExplicitlyRequested && ((r.scope === "EXACT_VARIANT" && r.candidateId === state.variant.id) || (r.scope === "MODEL_FAMILY" && r.familyId === state.familyId) || (r.scope === "BRAND" && r.brandId === normalizeCatalogIdentity(state.variant.brand))));
    const outcome: Outcome = rejected ? "FAIL" : "PASS"; add(state, "rejection:active", outcome, rejected ? "EXPLICIT_REJECTION" : "NOT_REJECTED"); rejectionOutcomes.set(state.variant.id, outcome);
  }
  trace("rejection:active", "rejectionScope", input.activeRejections.rejections.map((r) => r.id), rejectionOutcomes, ["EXPLICIT_REJECTION", "NOT_REJECTED"]);

  const deferred: string[] = [];
  const grouped = new Map<string, ActiveHardConstraint[]>();
  for (const constraint of input.activeConstraints.activeHardConstraints) (grouped.get(constraint.fieldId) ?? grouped.set(constraint.fieldId, []).get(constraint.fieldId)!).push(constraint);
  const registry = new Map(input.fieldRegistry.fields.map((field) => [field.fieldId, field]));
  for (const fieldId of [...grouped.keys()].sort((a, b) => (input.fieldRegistry.fields.findIndex((f) => f.fieldId === a) + 1 || 9999) - (input.fieldRegistry.fields.findIndex((f) => f.fieldId === b) + 1 || 9999) || a.localeCompare(b))) {
    const constraints = grouped.get(fieldId)!; const definition = registry.get(fieldId);
    if (fieldId === "usageArchitecture" || fieldId === "rearSeatPreference") continue;
    if (!definition) diagnostics.push({ code: "UNREGISTERED_DECISION_FIELD", fieldId });
    if (definition?.decisionUse === "DEFERRED_TO_AFFORDABILITY") { deferred.push(...constraints.map((c) => c.constraintId)); continue; }
    if (definition?.decisionUse === "NOT_FOR_FILTERING") continue;
    const semantic = new Map(constraints.map((c) => [JSON.stringify([c.operator, c.value, c.unit]), c]));
    const conflict = semantic.size > 1;
    if (conflict) diagnostics.push({ code: "CONFLICTING_ACTIVE_HARD_CONSTRAINTS", fieldId });
    const representative = [...semantic.values()][0]; const filterId = `constraint:${fieldId}`; const outcomes = new Map<string, Outcome>(); const reasons: string[] = [];
    if (definition && (!OPERATORS.has(representative.operator as FilterOperator) || !definition.supportedOperators.includes(representative.operator as FilterOperator))) diagnostics.push({ code: "UNSUPPORTED_FILTER_OPERATOR", fieldId, referenceId: representative.constraintId });
    if (definition?.unit && representative.unit !== definition.unit) diagnostics.push({ code: "FILTER_UNIT_MISMATCH", fieldId, referenceId: representative.constraintId });
    const representativeValues = Array.isArray(representative.value) ? representative.value : [representative.value];
    if (definition && ((definition.valueType === "NUMBER" && (typeof representative.value !== "number" || !Number.isFinite(representative.value))) || ((definition.valueType === "STRING" || definition.valueType === "ENUM") && representative.operator !== "ONE_OF" && representative.operator !== "EXCLUDES" && typeof representative.value !== "string") || ((representative.operator === "ONE_OF" || representative.operator === "EXCLUDES") && representativeValues.some((value) => typeof value !== "string")))) diagnostics.push({ code: "FILTER_VALUE_TYPE_MISMATCH", fieldId, referenceId: representative.constraintId });
    for (const state of states) {
      const fact = definition?.readFact(state.variant); const evaluated = !definition || conflict ? { outcome: "UNKNOWN" as const, reason: !definition ? "UNREGISTERED_DECISION_FIELD" : "CONFLICTING_ACTIVE_HARD_CONSTRAINTS" } : evaluateFact(definition, representative, fact, input.snapshot.authority.catalogFingerprint);
      add(state, filterId, evaluated.outcome, evaluated.reason, fact, fieldId); outcomes.set(state.variant.id, evaluated.outcome); reasons.push(evaluated.reason);
    }
    trace(filterId, fieldId, constraints.map((c) => c.constraintId).sort(), outcomes, reasons);
  }

  const usageOutcomes = new Map<string, Outcome>(); const usageReasons: string[] = [];
  for (const state of states) { const evaluation = evaluateUsageCargoSuitability(state.variant, input.usageNeed, input.usagePolicies); const outcome: Outcome = evaluation.hardFailures.length ? "FAIL" : evaluation.unknownHardRequirements.length ? "UNKNOWN" : "PASS"; const reason = evaluation.checks.map((c) => c.reasonCode); add(state, "usage-cargo-hard", outcome, reason.join("|") || "USAGE_HARD_PASS"); state.facts.push(...evaluation.checks.flatMap((c) => c.sourceFactReferences)); usageOutcomes.set(state.variant.id, outcome); usageReasons.push(...reason); }
  trace("usage-cargo-hard", "usageCargo", [], usageOutcomes, usageReasons.length ? usageReasons : ["USAGE_HARD_PASS"]);

  const candidates: TechnicalCandidateResult[] = states.map((state) => ({ exactVariantId: state.variant.id, modelFamilyId: state.familyId, disposition: state.failed.length ? "ELIMINATED" : state.unknown.length ? "NOT_EVALUABLE" : "ELIGIBLE", passedFilterIds: [...new Set(state.passed)], failedFilterIds: [...new Set(state.failed)], unknownFilterIds: [...new Set(state.unknown)], reasonCodes: [...new Set(state.reasons)].sort(), factReferences: [...new Map(state.facts.map((f) => [`${f.field}:${f.catalogFingerprint}:${f.factKind}`, f])).values()] }));
  const bucket = (disposition: TechnicalCandidateResult["disposition"]) => candidates.filter((c) => c.disposition === disposition).map((c) => c.exactVariantId);
  let survivors = new Set(variants.map((v) => v.id)); let firstZero: string | undefined;
  for (const step of traces) { const passed = new Set(step.passedCandidateIds); survivors = new Set([...survivors].filter((id) => passed.has(id))); if (!firstZero && survivors.size === 0) firstZero = step.filterId; }
  const eligible = bucket("ELIGIBLE"), notEvaluable = bucket("NOT_EVALUABLE"), eliminated = bucket("ELIMINATED");
  return deepFreeze({ catalogFingerprint: input.snapshot.authority.catalogFingerprint, decisionFingerprint: input.decisionFingerprint, initialCandidateIds: variants.map((v) => v.id), eligibleCandidateIds: eligible, notEvaluableCandidateIds: notEvaluable, eliminatedCandidateIds: eliminated, candidates, filterTrace: traces, deferredConstraintIds: [...new Set(deferred)].sort(), diagnostics, firstZeroEligibleFilterId: firstZero, counts: { initial: variants.length, eligible: eligible.length, notEvaluable: notEvaluable.length, eliminated: eliminated.length } });
}
