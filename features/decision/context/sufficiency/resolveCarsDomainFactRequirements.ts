import type { ContextCandidate } from "@/types/contextCandidate";
import type {
  CarsSufficiencyPolicy,
  MaterialityAssessment,
} from "@/types/contextSufficiency";
import type {
  CarsCandidateIdentityCoverageTrace,
  CarsCanonicalScalar,
  CarsDomainFactBinding,
  CarsDomainFactContextLineage,
  CarsDomainFactPredicate,
  CarsDomainFactRequirement,
  CarsDomainFactRequirementIdentity,
  CarsDomainFactRequirementResolution,
  CarsDomainFactRequirementResolutionError,
  CarsDomainFactRequirementResolutionErrorCode,
  CarsDomainFactRequirementResolutionResult,
} from "@/types/carsDomainFactRequirement";

export interface ResolveCarsDomainFactRequirementsInput {
  readonly policy: CarsSufficiencyPolicy;
  readonly materialityAssessments: readonly MaterialityAssessment[];
  readonly appliedCandidates: readonly ContextCandidate[];
  readonly resolvedOptionIds: readonly string[];
  readonly candidateIdentityCoverage?: CarsCandidateIdentityCoverageTrace;
  readonly bindings: readonly CarsDomainFactBinding[];
}

const CATEGORIES = new Set<string>([
  "Car.id",
  "brand",
  "model",
  "year",
  "fuel",
  "transmission",
  "bodyType",
]);

const RELATIONS = new Set<string>([
  "EXACT_EQUAL",
  "EXACT_NOT_EQUAL",
  "IN_SET",
  "NOT_IN_SET",
  "ORDERED_YEAR_COMPARISON",
  "RAW_FACT_REQUIRED",
]);

const DIRECTIONS = new Set<string>([
  "BEFORE",
  "ON_OR_BEFORE",
  "AFTER",
  "ON_OR_AFTER",
]);

function error(
  code: CarsDomainFactRequirementResolutionErrorCode,
  parentPolicyRequirementId: string,
  referenceId: string,
): CarsDomainFactRequirementResolutionError {
  return { code, parentPolicyRequirementId, referenceId };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function occurrence(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function scalarKey(value: CarsCanonicalScalar): string {
  return typeof value === "string" ? `s:${value.length}:${value}` : `n:${value}`;
}

function validateLineage(
  lineage: readonly CarsDomainFactContextLineage[],
  candidateIds: ReadonlySet<string>,
  parentId: string,
  referenceId: string,
): CarsDomainFactRequirementResolutionError[] {
  const errors: CarsDomainFactRequirementResolutionError[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(lineage) || lineage.length === 0) {
    return [error("UNKNOWN_CONTEXT_LINEAGE", parentId, referenceId)];
  }
  lineage.forEach((item, index) => {
    const itemRef = `${referenceId}:lineage:${index}`;
    if (
      !nonEmpty(item?.candidateId) ||
      !nonEmpty(item?.bindingReferenceId) ||
      !candidateIds.has(item?.candidateId)
    ) {
      errors.push(error("UNKNOWN_CONTEXT_LINEAGE", parentId, itemRef));
    }
    if (
      !occurrence(item?.contextSourceOccurrence) ||
      !occurrence(item?.candidateInputOccurrence) ||
      !occurrence(item?.relationSourceOccurrence)
    ) {
      errors.push(error("INVALID_OCCURRENCE", parentId, itemRef));
    }
    const key = [
      item?.candidateId,
      item?.bindingReferenceId,
      item?.contextSourceOccurrence,
      item?.candidateInputOccurrence,
      item?.relationSourceOccurrence,
    ].join("\u0000");
    if (seen.has(key)) {
      errors.push(error("DUPLICATE_CONTEXT_LINEAGE", parentId, itemRef));
    }
    seen.add(key);
  });
  return errors;
}

function validatePredicate(
  category: unknown,
  predicate: unknown,
  parentId: string,
  referenceId: string,
): CarsDomainFactRequirementResolutionError[] {
  if (!CATEGORIES.has(String(category))) {
    return [error("INVALID_FACT_CATEGORY", parentId, referenceId)];
  }
  if (
    typeof predicate !== "object" ||
    predicate === null ||
    !RELATIONS.has(String((predicate as { relation?: unknown }).relation))
  ) {
    return [error("INVALID_PREDICATE", parentId, referenceId)];
  }
  const value = predicate as Record<string, unknown>;
  const relation = value.relation;
  const hasOperand = Object.prototype.hasOwnProperty.call(value, "operand");
  if (relation === "RAW_FACT_REQUIRED") {
    return hasOperand
      ? [error("INVALID_PREDICATE", parentId, referenceId)]
      : [];
  }
  if (relation === "ORDERED_YEAR_COMPARISON") {
    if (
      category !== "year" ||
      !Number.isSafeInteger(value.operand) ||
      !DIRECTIONS.has(String(value.direction))
    ) {
      return [error("INVALID_CATEGORY_OPERAND", parentId, referenceId)];
    }
    return [];
  }
  const operands =
    relation === "IN_SET" || relation === "NOT_IN_SET"
      ? value.operand
      : [value.operand];
  if (!Array.isArray(operands)) {
    return [error("INVALID_PREDICATE", parentId, referenceId)];
  }
  if (operands.length === 0) {
    return [error("EMPTY_SET_OPERAND", parentId, referenceId)];
  }
  const types = new Set(operands.map((operand) => typeof operand));
  if (types.size > 1) {
    return [error("MIXED_SET_OPERAND_TYPES", parentId, referenceId)];
  }
  if (![...types].every((type) => type === "string" || type === "number")) {
    return [error("INVALID_CATEGORY_OPERAND", parentId, referenceId)];
  }
  const expectedType = category === "year" ? "number" : "string";
  if (
    !operands.every(
      (operand) =>
        typeof operand === expectedType &&
        (typeof operand !== "number" || Number.isFinite(operand)),
    )
  ) {
    return [error("INVALID_CATEGORY_OPERAND", parentId, referenceId)];
  }
  if (relation === "IN_SET" || relation === "NOT_IN_SET") {
    const seen = new Set<string>();
    for (const operand of operands as CarsCanonicalScalar[]) {
      const key = scalarKey(operand);
      if (seen.has(key)) {
        return [error("DUPLICATE_SET_OPERAND", parentId, referenceId)];
      }
      seen.add(key);
    }
  }
  return [];
}

function projectOptionScope(
  binding: CarsDomainFactBinding,
  resolvedOptionIds: readonly string[],
  parentId: string,
  referenceId: string,
): { optionIds: string[]; errors: CarsDomainFactRequirementResolutionError[] } {
  const resolved = new Set(resolvedOptionIds);
  if (binding.optionScope?.kind === "ALL_RESOLVED_OPTIONS") {
    return resolvedOptionIds.length === 0
      ? { optionIds: [], errors: [error("EMPTY_OPTION_SCOPE", parentId, referenceId)] }
      : { optionIds: [...resolvedOptionIds], errors: [] };
  }
  if (binding.optionScope?.kind !== "OPTION_IDS") {
    return { optionIds: [], errors: [error("EMPTY_OPTION_SCOPE", parentId, referenceId)] };
  }
  const requested = binding.optionScope.optionIds;
  if (!Array.isArray(requested) || requested.length === 0) {
    return { optionIds: [], errors: [error("EMPTY_OPTION_SCOPE", parentId, referenceId)] };
  }
  const requestedSet = new Set<string>();
  const errors: CarsDomainFactRequirementResolutionError[] = [];
  requested.forEach((optionId, index) => {
    if (!nonEmpty(optionId) || !resolved.has(optionId)) {
      errors.push(error("UNKNOWN_OPTION_SCOPE_ID", parentId, `${referenceId}:option:${index}`));
    }
    if (requestedSet.has(optionId)) {
      errors.push(error("DUPLICATE_OPTION_SCOPE_ID", parentId, `${referenceId}:option:${index}`));
    }
    requestedSet.add(optionId);
  });
  return {
    optionIds: resolvedOptionIds.filter((optionId) => requestedSet.has(optionId)),
    errors,
  };
}

function canonicalPredicate(predicate: CarsDomainFactPredicate): CarsDomainFactPredicate {
  if (predicate.relation === "IN_SET" || predicate.relation === "NOT_IN_SET") {
    const operand = [...predicate.operand].sort((left, right) => {
      const leftKey = scalarKey(left);
      const rightKey = scalarKey(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    }) as [CarsCanonicalScalar, ...CarsCanonicalScalar[]];
    return { relation: predicate.relation, operand };
  }
  if (predicate.relation === "ORDERED_YEAR_COMPARISON") {
    return {
      relation: predicate.relation,
      direction: predicate.direction,
      operand: predicate.operand,
    };
  }
  if (predicate.relation === "RAW_FACT_REQUIRED") {
    return { relation: predicate.relation };
  }
  const exact = predicate as Extract<
    CarsDomainFactPredicate,
    { relation: "EXACT_EQUAL" | "EXACT_NOT_EQUAL" }
  >;
  return { relation: exact.relation, operand: exact.operand };
}

function field(value: string): string {
  return `${new TextEncoder().encode(value).length}:${value}`;
}

function canonicalIdentity(identity: CarsDomainFactRequirementIdentity): string {
  const predicate = identity.predicate;
  const predicateFields =
    predicate.relation === "RAW_FACT_REQUIRED"
      ? [predicate.relation]
      : predicate.relation === "ORDERED_YEAR_COMPARISON"
        ? [predicate.relation, predicate.direction, scalarKey(predicate.operand)]
        : predicate.relation === "IN_SET" || predicate.relation === "NOT_IN_SET"
          ? [predicate.relation, ...predicate.operand.map(scalarKey)]
          : [
              predicate.relation,
              scalarKey(
                (predicate as Extract<
                  CarsDomainFactPredicate,
                  { relation: "EXACT_EQUAL" | "EXACT_NOT_EQUAL" }
                >).operand,
              ),
            ];
  const lineage = identity.contextLineage.flatMap((item) => [
    item.candidateId,
    item.bindingReferenceId,
    String(item.contextSourceOccurrence),
    String(item.candidateInputOccurrence),
    String(item.relationSourceOccurrence),
  ]);
  return [
    identity.version,
    identity.policyId,
    identity.policyVersion,
    identity.parentPolicyRequirementId,
    String(identity.contextLineage.length),
    ...lineage,
    String(identity.optionIds.length),
    ...identity.optionIds,
    identity.category,
    ...predicateFields,
  ].map(field).join("");
}

// Small synchronous SHA-256 keeps this pure module usable on both server and browser.
function sha256(message: string): string {
  const bytes = [...new TextEncoder().encode(message)];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 255);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 255);
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = Array.from({ length: 64 }, (_, index) => {
    const prime = nthPrime(index + 1);
    return Math.floor((Math.sqrt(prime) % 1) * 0x100000000) >>> 0;
  });
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(64);
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      w[index] = (((bytes[start] << 24) | (bytes[start + 1] << 16) |
        (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0);
    }
    for (let index = 16; index < 64; index += 1) {
      const a = w[index - 15];
      const b = w[index - 2];
      const s0 = (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) >>> 0;
      const s1 = (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10)) >>> 0;
      w[index] = (w[index - 16] + s0 + w[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let index = 0; index < 64; index += 1) {
      const s1 = (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (hh + s1 + ch + k[index] + w[index]) >>> 0;
      const s0 = (rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((value, index) => {
      h[index] = (h[index] + value) >>> 0;
    });
  }
  return h.map((value) => value.toString(16).padStart(8, "0")).join("");
}

function rotate(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function nthPrime(position: number): number {
  let found = 0;
  for (let candidate = 2; ; candidate += 1) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) { prime = false; break; }
    }
    if (prime && ++found === position) return candidate;
  }
}

function cloneLineage(lineage: readonly CarsDomainFactContextLineage[]): CarsDomainFactContextLineage[] {
  return lineage.map((item) => ({ ...item }));
}

function validCoverage(
  trace: CarsCandidateIdentityCoverageTrace | undefined,
  candidateIds: ReadonlySet<string>,
  resolvedOptionIds: readonly string[],
): boolean {
  if (!trace || trace.parentPolicyRequirementId !== "candidate-options") return false;
  if (
    !nonEmpty(trace.canonicalProducerReferenceId) ||
    !nonEmpty(trace.catalogAcquisitionReferenceId) ||
    !nonEmpty(trace.exactMatcherReferenceId) ||
    !Array.isArray(trace.candidateIds) || trace.candidateIds.length === 0 ||
    !Array.isArray(trace.optionIds) || trace.optionIds.length === 0
  ) return false;
  return trace.candidateIds.every((id) => candidateIds.has(id)) &&
    trace.optionIds.length === resolvedOptionIds.length &&
    trace.optionIds.every((id, index) => id === resolvedOptionIds[index]) &&
    new Set(trace.candidateIds).size === trace.candidateIds.length &&
    new Set(trace.optionIds).size === trace.optionIds.length;
}

export function resolveCarsDomainFactRequirements(
  input: ResolveCarsDomainFactRequirementsInput,
): CarsDomainFactRequirementResolutionResult {
  const requirements: CarsDomainFactRequirement[] = [];
  const resolutions: CarsDomainFactRequirementResolution[] = [];
  const orphanErrors: CarsDomainFactRequirementResolutionError[] = [];
  const policyIds = new Set(input.policy.requirements.map((item) => item.requirementId));
  const candidateIds = new Set(input.appliedCandidates.map((item) => item.id));
  const assessmentGroups = new Map<string, MaterialityAssessment[]>();
  input.materialityAssessments.forEach((assessment) => {
    if (!policyIds.has(assessment.requirementId)) {
      orphanErrors.push(error("UNKNOWN_PARENT_POLICY_REQUIREMENT", assessment.requirementId, assessment.requirementId));
      return;
    }
    const group = assessmentGroups.get(assessment.requirementId) ?? [];
    group.push(assessment);
    assessmentGroups.set(assessment.requirementId, group);
  });
  const bindingGroups = new Map<string, { binding: CarsDomainFactBinding; inputIndex: number }[]>();
  input.bindings.forEach((binding, inputIndex) => {
    if (!policyIds.has(binding.parentPolicyRequirementId)) {
      orphanErrors.push(error("UNKNOWN_PARENT_POLICY_REQUIREMENT", binding.parentPolicyRequirementId, String(inputIndex)));
      return;
    }
    const group = bindingGroups.get(binding.parentPolicyRequirementId) ?? [];
    group.push({ binding, inputIndex });
    bindingGroups.set(binding.parentPolicyRequirementId, group);
  });

  input.policy.requirements.forEach((policyRequirement) => {
    const parentId = policyRequirement.requirementId;
    if (parentId === "candidate-options") {
      if (validCoverage(input.candidateIdentityCoverage, candidateIds, input.resolvedOptionIds)) {
        resolutions.push({ parentPolicyRequirementId: parentId, status: "RESOLVED", requirements: [], reason: "CANDIDATE_IDENTITY_COVERED" });
      } else if (input.candidateIdentityCoverage) {
        resolutions.push({ parentPolicyRequirementId: parentId, status: "FAILED", requirements: [], errors: [error("CANDIDATE_IDENTITY_COVERAGE_MISSING", parentId, parentId)] });
      } else {
        resolutions.push({ parentPolicyRequirementId: parentId, status: "UNRESOLVED", requirements: [], limitations: ["Candidate identity coverage is missing or invalid."], contextLineage: [] });
      }
      return;
    }
    if (policyRequirement.mode !== "CONDITIONAL") {
      if ((bindingGroups.get(parentId) ?? []).length > 0) {
        resolutions.push({ parentPolicyRequirementId: parentId, status: "FAILED", requirements: [], errors: [error("RESOLVED_ZERO_INVALID", parentId, parentId)] });
      } else {
        resolutions.push({ parentPolicyRequirementId: parentId, status: "RESOLVED", requirements: [], reason: "CONTEXT_ONLY" });
      }
      return;
    }
    const assessments = assessmentGroups.get(parentId) ?? [];
    if (assessments.length !== 1) {
      const code = assessments.length === 0 ? "MISSING_MATERIALITY_ASSESSMENT" : "DUPLICATE_MATERIALITY_ASSESSMENT";
      resolutions.push({ parentPolicyRequirementId: parentId, status: "FAILED", requirements: [], errors: [error(code, parentId, parentId)] });
      return;
    }
    const assessment = assessments[0];
    if (assessment.outcome === "NOT_MATERIAL") {
      resolutions.push({ parentPolicyRequirementId: parentId, status: "RESOLVED", requirements: [], reason: "NOT_MATERIAL" });
      return;
    }
    if (assessment.outcome === "UNRESOLVED") {
      const limitations = assessment.limitations.length > 0 ? [...assessment.limitations] : ["Materiality is unresolved."];
      resolutions.push({ parentPolicyRequirementId: parentId, status: "UNRESOLVED", requirements: [], limitations: limitations as [string, ...string[]], contextLineage: [] });
      return;
    }
    const entries = [...(bindingGroups.get(parentId) ?? [])].sort((left, right) =>
      left.binding.bindingSourceOccurrence - right.binding.bindingSourceOccurrence ||
      left.binding.relationSourceOccurrence - right.binding.relationSourceOccurrence ||
      left.inputIndex - right.inputIndex,
    );
    if (entries.length === 0) {
      resolutions.push({ parentPolicyRequirementId: parentId, status: "UNRESOLVED", requirements: [], limitations: ["Material domain-fact binding is missing."], contextLineage: [] });
      return;
    }
    const parentErrors: CarsDomainFactRequirementResolutionError[] = [];
    const parentRequirements: CarsDomainFactRequirement[] = [];
    const occurrences = new Set<string>();
    entries.forEach(({ binding, inputIndex }) => {
      const referenceId = String(inputIndex);
      if (!occurrence(binding.bindingSourceOccurrence) || !occurrence(binding.relationSourceOccurrence)) {
        parentErrors.push(error("INVALID_OCCURRENCE", parentId, referenceId));
      }
      const occurrenceKey = `${binding.bindingSourceOccurrence}:${binding.relationSourceOccurrence}`;
      if (occurrences.has(occurrenceKey)) parentErrors.push(error("INVALID_OCCURRENCE", parentId, referenceId));
      occurrences.add(occurrenceKey);
      parentErrors.push(...validateLineage(binding.contextLineage, candidateIds, parentId, referenceId));
      parentErrors.push(...validatePredicate(binding.category, binding.predicate, parentId, referenceId));
      const projected = projectOptionScope(binding, input.resolvedOptionIds, parentId, referenceId);
      parentErrors.push(...projected.errors);
      if (parentErrors.length > 0) return;
      const identity: CarsDomainFactRequirementIdentity = {
        version: "cars-dfr:v1",
        policyId: input.policy.policyId,
        policyVersion: input.policy.version,
        parentPolicyRequirementId: parentId,
        contextLineage: cloneLineage(binding.contextLineage),
        optionIds: [...projected.optionIds],
        category: binding.category,
        predicate: canonicalPredicate(binding.predicate),
      };
      parentRequirements.push({
        id: `cars-dfr:v1:${sha256(canonicalIdentity(identity))}`,
        identity,
        bindingSourceOccurrence: binding.bindingSourceOccurrence,
        relationSourceOccurrence: binding.relationSourceOccurrence,
      });
    });
    parentErrors.push(
      ...validateCarsDomainFactRequirementResolution(
        parentRequirements,
        parentId,
      ),
    );
    if (parentErrors.length > 0) {
      resolutions.push({ parentPolicyRequirementId: parentId, status: "FAILED", requirements: [], errors: parentErrors as [CarsDomainFactRequirementResolutionError, ...CarsDomainFactRequirementResolutionError[]] });
    } else {
      requirements.push(...parentRequirements);
      resolutions.push({ parentPolicyRequirementId: parentId, status: "RESOLVED", requirements: parentRequirements.map((item) => ({ ...item, identity: { ...item.identity, contextLineage: cloneLineage(item.identity.contextLineage), optionIds: [...item.identity.optionIds], predicate: canonicalPredicate(item.identity.predicate) } })) });
    }
  });

  if (orphanErrors.length > 0) {
    resolutions.push({ parentPolicyRequirementId: orphanErrors[0].parentPolicyRequirementId, status: "FAILED", requirements: [], errors: orphanErrors as [CarsDomainFactRequirementResolutionError, ...CarsDomainFactRequirementResolutionError[]] });
  }
  const errors = resolutions.flatMap((item) => item.status === "FAILED" ? [...item.errors] : []);
  const limitations = resolutions.flatMap((item) => item.status === "UNRESOLVED" ? [...item.limitations] : []);
  return {
    status: errors.length > 0 ? "FAILED" : limitations.length > 0 ? "UNRESOLVED" : "RESOLVED",
    resolutions,
    requirements: requirements.map((item) => ({ ...item, identity: { ...item.identity, contextLineage: cloneLineage(item.identity.contextLineage), optionIds: [...item.identity.optionIds], predicate: canonicalPredicate(item.identity.predicate) } })),
    limitations,
    errors,
  };
}

export function validateCarsDomainFactRequirementResolution(
  requirements: readonly CarsDomainFactRequirement[],
  parentPolicyRequirementId: string,
): CarsDomainFactRequirementResolutionError[] {
  const errors: CarsDomainFactRequirementResolutionError[] = [];
  const byId = new Map<string, string>();
  requirements.forEach((requirement) => {
    const semantic = canonicalIdentity(requirement.identity);
    if (byId.has(requirement.id)) {
      errors.push(
        error(
          byId.get(requirement.id) === semantic
            ? "DUPLICATE_CONCRETE_REQUIREMENT"
            : "CONCRETE_REQUIREMENT_ID_COLLISION",
          parentPolicyRequirementId,
          requirement.id,
        ),
      );
    } else {
      byId.set(requirement.id, semantic);
    }
  });
  return errors;
}
