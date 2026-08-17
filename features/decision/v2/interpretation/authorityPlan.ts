import type { AuthoritativeSemanticPlan, InterpretationResult, SemanticPolicyTraceEntry, ValidatedInterpretation } from "./types";

export function createAuthoritativeSemanticPlan(input: { readonly raw: InterpretationResult; readonly validated: ValidatedInterpretation }): AuthoritativeSemanticPlan {
  const trace: SemanticPolicyTraceEntry[] = [];
  const hard = input.validated.acceptedConstraintMutations.filter((item) => item.deterministicDecisionUse === "HARD_CANDIDATE");
  if (input.raw.acts.includes("HARD_REQUIREMENT") && hard.length === 0) trace.push({ code: "PROVIDER_STRENGTH_DOWNGRADED_BY_POLICY", act: "HARD_REQUIREMENT" });
  if (!input.raw.acts.includes("HARD_REQUIREMENT")) for (const item of hard) trace.push({ code: "EXPLICIT_HARD_LANGUAGE_ENFORCED", fieldId: item.fieldId });
  const rawFields = new Set(input.raw.constraintMutations.map((item) => item.fieldId));
  for (const item of input.validated.acceptedConstraintMutations) if (!rawFields.has(item.fieldId)) trace.push({ code: "CRITICAL_SEMANTIC_MUTATION_COMPLETED", fieldId: item.fieldId });
  return Object.freeze({ ...input.validated, authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", providerActs: Object.freeze([...input.raw.acts]), policyTrace: Object.freeze(trace) });
}
