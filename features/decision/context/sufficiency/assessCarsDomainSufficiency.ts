import type {
  CarsDomainEvidenceAssertion,
  ValidatedCarsDomainEvidenceLinkageInput,
} from "@/types/carsDomainEvidence";
import type { CarsDomainFactRequirement } from "@/types/carsDomainFactRequirement";
import type {
  CarsDecisionType,
  CarsDomainSufficiencyAssessment,
  CarsDomainSufficiencyDiagnostic,
  CarsSufficiencyPolicy,
} from "@/types/contextSufficiency";

import { evaluateCarsDomainFactRequirement } from "./evaluateCarsDomainFactRequirement";

export interface AssessCarsDomainSufficiencyInput {
  readonly decisionType: CarsDecisionType;
  readonly policy: CarsSufficiencyPolicy;
  readonly evidenceInput: ValidatedCarsDomainEvidenceLinkageInput;
}

function diagnosticKey(item: CarsDomainSufficiencyDiagnostic): string {
  return [item.requirementId, item.optionId ?? "", item.reason, ...item.evidenceIds].join("\u0000");
}

function assertionsConflict(assertions: readonly CarsDomainEvidenceAssertion[]): boolean {
  if (assertions.length < 2) return false;
  const first = assertions[0].assertion;
  return assertions.slice(1).some((item) => !Object.is(item.assertion, first));
}

export function assessCarsDomainSufficiency(
  input: AssessCarsDomainSufficiencyInput,
): CarsDomainSufficiencyAssessment {
  const { evidenceInput } = input;
  const assertions = new Map(evidenceInput.assertions.map((item) => [item.evidenceId, item] as const));
  const linksByRequirement = new Map<string, string[]>();
  for (const link of evidenceInput.requirementLinks) {
    const ids = linksByRequirement.get(link.requirementId) ?? [];
    ids.push(link.evidenceId);
    linksByRequirement.set(link.requirementId, ids);
  }

  const diagnostics: CarsDomainSufficiencyDiagnostic[] = [];
  const missing = new Set<string>();
  const evaluableOptions = new Set(evidenceInput.optionIds);
  let hasUnresolved = evidenceInput.requirementResolution.status !== "RESOLVED";
  let hasInsufficient = false;

  for (const resolution of evidenceInput.requirementResolution.resolutions) {
    if (resolution.status !== "RESOLVED") {
      diagnostics.push({
        requirementId: resolution.parentPolicyRequirementId,
        evidenceIds: [],
        reason: "UNRESOLVED_REQUIREMENT_RESOLUTION",
      });
      hasUnresolved = true;
    }
  }

  const unresolvedConflictIds = evidenceInput.conflicts
    .filter((conflict) => conflict.resolutionStatus === "UNRESOLVED")
    .map((conflict) => conflict.conflictId)
    .sort();
  const unresolvedConflictEvidence = new Set(
    evidenceInput.conflicts
      .filter((conflict) => conflict.resolutionStatus === "UNRESOLVED")
      .flatMap((conflict) => conflict.evidenceIds),
  );

  function assessCoverage(requirement: CarsDomainFactRequirement, optionId: string): void {
    const linked = (linksByRequirement.get(requirement.id) ?? [])
      .flatMap((id) => {
        const assertion = assertions.get(id);
        return assertion?.optionId === optionId ? [assertion] : [];
      });
    const evidenceIds = linked.map((item) => item.evidenceId).sort();
    const authoritative = linked.filter((item) =>
      item.provenance === "AUTHORITATIVE_SOURCE" && item.source !== undefined,
    );

    if (linked.some((item) => unresolvedConflictEvidence.has(item.evidenceId))) {
      diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "UNRESOLVED_CONFLICT" });
      evaluableOptions.delete(optionId);
      hasUnresolved = true;
      return;
    }
    if (linked.length === 0 || authoritative.length === 0) {
      diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "MISSING_AUTHORITATIVE_EVIDENCE" });
      evaluableOptions.delete(optionId);
      hasUnresolved = true;
      return;
    }
    if (authoritative.some((item) => item.availability === "UNRESOLVED")) {
      diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "EVIDENCE_UNRESOLVED" });
      evaluableOptions.delete(optionId);
      hasUnresolved = true;
      return;
    }

    if (new Set(authoritative.map((item) => item.availability)).size > 1) {
      diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "EVIDENCE_UNRESOLVED" });
      evaluableOptions.delete(optionId);
      hasUnresolved = true;
      return;
    }

    const available = authoritative.filter((item) => item.availability === "AVAILABLE");
    if (assertionsConflict(available)) {
      diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "EVIDENCE_UNRESOLVED" });
      evaluableOptions.delete(optionId);
      hasUnresolved = true;
      return;
    }
    if (available.length === 0) {
      if (authoritative.some((item) => item.availability === "MISSING")) {
        diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "MISSING_AUTHORITATIVE_EVIDENCE" });
        missing.add(requirement.id);
        evaluableOptions.delete(optionId);
        hasInsufficient = true;
      } else {
        diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds, reason: "EVIDENCE_UNRESOLVED" });
        evaluableOptions.delete(optionId);
        hasUnresolved = true;
      }
      return;
    }

    for (const item of available) {
      const evaluation = evaluateCarsDomainFactRequirement(requirement, item);
      if (evaluation.status === "UNRESOLVED") {
        diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds: [item.evidenceId], reason: evaluation.reason });
        evaluableOptions.delete(optionId);
        hasUnresolved = true;
      } else if (evaluation.status === "NEGATIVE") {
        diagnostics.push({ requirementId: requirement.id, optionId, evidenceIds: [item.evidenceId], reason: evaluation.reason });
      }
    }
  }

  for (const requirement of evidenceInput.requirementResolution.requirements) {
    for (const optionId of requirement.identity.optionIds) assessCoverage(requirement, optionId);
  }

  diagnostics.sort((left, right) => diagnosticKey(left).localeCompare(diagnosticKey(right)));
  const evidenceLimitations = [...new Set(evidenceInput.assertions.flatMap((item) => item.limitations))].sort();
  const outcome = hasUnresolved ? "UNRESOLVED" : hasInsufficient ? "INSUFFICIENT" : "SUFFICIENT";

  return {
    policyId: input.policy.policyId,
    decisionType: input.decisionType,
    evaluableOptionIds: evidenceInput.optionIds.filter((id) => evaluableOptions.has(id)),
    outcome,
    missingDomainRequirements: [...missing].sort(),
    evidenceLimitations,
    relevantConflicts: unresolvedConflictIds,
    diagnostics,
  };
}
