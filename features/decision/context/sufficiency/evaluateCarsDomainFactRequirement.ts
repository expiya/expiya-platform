import type { CarsDomainEvidenceAssertion } from "@/types/carsDomainEvidence";
import type { CarsDomainFactRequirement } from "@/types/carsDomainFactRequirement";
import type { CarsDomainSufficiencyDiagnosticReason } from "@/types/contextSufficiency";

export type CarsDomainFactEvaluation =
  | { readonly status: "SATISFIED" }
  | {
      readonly status: "NEGATIVE" | "UNRESOLVED";
      readonly reason: CarsDomainSufficiencyDiagnosticReason;
    };

export function evaluateCarsDomainFactRequirement(
  requirement: CarsDomainFactRequirement,
  evidence: CarsDomainEvidenceAssertion,
): CarsDomainFactEvaluation {
  if (
    evidence.category !== requirement.identity.category ||
    evidence.availability !== "AVAILABLE" ||
    evidence.provenance !== "AUTHORITATIVE_SOURCE" ||
    evidence.source === undefined
  ) {
    return { status: "UNRESOLVED", reason: "EVIDENCE_UNRESOLVED" };
  }

  const value = evidence.assertion;
  const predicate = requirement.identity.predicate;
  let matches: boolean;

  switch (predicate.relation) {
    case "EXACT_EQUAL":
      matches = Object.is(value, predicate.operand);
      break;
    case "EXACT_NOT_EQUAL":
      matches = !Object.is(value, predicate.operand);
      break;
    case "IN_SET":
      matches = predicate.operand.some((operand) => Object.is(value, operand));
      break;
    case "NOT_IN_SET":
      matches = predicate.operand.every((operand) => !Object.is(value, operand));
      break;
    case "ORDERED_YEAR_COMPARISON": {
      if (!Number.isInteger(value) || !Number.isInteger(predicate.operand)) {
        return { status: "UNRESOLVED", reason: "UNSUPPORTED_RELATION_EVALUATION" };
      }
      const year = value as number;
      if (predicate.direction === "BEFORE") matches = year < predicate.operand;
      else if (predicate.direction === "ON_OR_BEFORE") matches = year <= predicate.operand;
      else if (predicate.direction === "AFTER") matches = year > predicate.operand;
      else if (predicate.direction === "ON_OR_AFTER") matches = year >= predicate.operand;
      else return { status: "UNRESOLVED", reason: "UNSUPPORTED_RELATION_EVALUATION" };
      break;
    }
    case "RAW_FACT_REQUIRED":
      return value === undefined
        ? { status: "UNRESOLVED", reason: "UNSUPPORTED_RELATION_EVALUATION" }
        : { status: "SATISFIED" };
    default:
      return { status: "UNRESOLVED", reason: "UNSUPPORTED_RELATION_EVALUATION" };
  }

  if (matches) return { status: "SATISFIED" };
  return {
    status: "NEGATIVE",
    reason: predicate.relation === "EXACT_NOT_EQUAL" || predicate.relation === "NOT_IN_SET"
      ? "NEGATIVE_RELATION_RESULT"
      : "CONSTRAINT_MISMATCH",
  };
}
