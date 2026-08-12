import { describe, expect, it } from "vitest";

import type { CarsOrchestrationInput } from "@/types/carsOrchestration";

import { orchestrateCarsDecision } from "./orchestrateCarsDecision";

type MutableDependencies = {
  -readonly [Key in keyof CarsOrchestrationInput["dependencies"]]: CarsOrchestrationInput["dependencies"][Key];
};

function dependencies(input: CarsOrchestrationInput): MutableDependencies {
  return input.dependencies as MutableDependencies;
}

function completeInput(): CarsOrchestrationInput {
  return {
    requestId: "request-1",
    contextReference: "context-1",
    dependencies: {
      classification: {
        status: "CLASSIFIED",
        decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
      },
      materialityAssessments: [],
      rejectionAssessments: [],
      limitedSupportAssessment: { outcome: "NOT_PERMITTED", limitations: [] },
      domainFactResolution: {
        status: "RESOLVED",
        resolutions: [],
        requirements: [],
        limitations: [],
        errors: [],
      },
      evidence: {
        status: "AVAILABLE",
        linkage: {
          ok: true,
          value: {
            optionIds: [],
            requirementResolution: {
              status: "RESOLVED",
              resolutions: [],
              requirements: [],
              limitations: [],
              errors: [],
            },
            assertions: [],
            requirementLinks: [],
            conflicts: [],
            optionMatches: [],
          },
        },
      },
      domainAssessment: {
        policyId: "cars-policy",
        decisionType: "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        evaluableOptionIds: [],
        outcome: "SUFFICIENT",
        missingDomainRequirements: [],
        evidenceLimitations: [],
        relevantConflicts: [],
        diagnostics: [],
      },
    },
  };
}

function expectReason(input: CarsOrchestrationInput, code: string, status = "UNRESOLVED") {
  const result = orchestrateCarsDecision(input);
  expect(result.status).toBe(status);
  expect(result.reasons.map((item) => item.code)).toEqual([code]);
  return result;
}

describe("orchestrateCarsDecision", () => {
  it("fails closed when classification is missing", () => {
    const input = completeInput();
    delete (input.dependencies as { classification?: unknown }).classification;
    expectReason(input, "CLASSIFICATION_MISSING");
  });

  it.each([
    ["AMBIGUOUS", "CLASSIFICATION_AMBIGUOUS", "ADDITIONAL_CONTEXT_REQUIRED"],
    ["UNSUPPORTED", "CLASSIFICATION_UNSUPPORTED", "UNRESOLVED"],
    ["FAILED", "CLASSIFICATION_FAILED", "FAILED"],
  ] as const)("fails closed for %s classification", (status, code, resultStatus) => {
    const input = completeInput();
    dependencies(input).classification = { status };
    expectReason(input, code, resultStatus);
  });

  it("fails closed when Type B identity is missing or unresolved", () => {
    const missing = completeInput();
    dependencies(missing).classification = {
      status: "CLASSIFIED",
      decisionType: "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
    };
    expectReason(missing, "TYPE_B_IDENTITY_MISSING");
    dependencies(missing).typeBIdentity = { status: "UNRESOLVED" };
    expectReason(missing, "TYPE_B_IDENTITY_UNRESOLVED");
  });

  it("fails closed when materiality is missing, unresolved, or invalid", () => {
    const missing = completeInput();
    delete (missing.dependencies as { materialityAssessments?: unknown }).materialityAssessments;
    expectReason(missing, "MATERIALITY_MISSING");

    const unresolved = completeInput();
    dependencies(unresolved).materialityAssessments = [{
      requirementId: "r-1", outcome: "UNRESOLVED", supportingCandidateIds: [], limitations: [],
    }];
    expectReason(unresolved, "MATERIALITY_UNRESOLVED");

    const invalid = completeInput();
    dependencies(invalid).materialityAssessments = [
      { requirementId: "r-1", outcome: "MATERIAL", supportingCandidateIds: [], limitations: [] },
      { requirementId: "r-1", outcome: "NOT_MATERIAL", supportingCandidateIds: [], limitations: [] },
    ];
    expectReason(invalid, "MATERIALITY_INVALID", "FAILED");
  });

  it("fails closed when rejection relevance is missing or unresolved", () => {
    const missing = completeInput();
    delete (missing.dependencies as { rejectionAssessments?: unknown }).rejectionAssessments;
    expectReason(missing, "REJECTION_RELEVANCE_MISSING");
    const unresolved = completeInput();
    dependencies(unresolved).rejectionAssessments = [{
      candidateId: "candidate-1", outcome: "UNRESOLVED", affectedRequirementIds: [], limitations: [],
    }];
    expectReason(unresolved, "REJECTION_RELEVANCE_UNRESOLVED");
  });

  it("fails closed when limited support is missing or unresolved", () => {
    const missing = completeInput();
    delete (missing.dependencies as { limitedSupportAssessment?: unknown }).limitedSupportAssessment;
    expectReason(missing, "LIMITED_SUPPORT_MISSING");
    const unresolved = completeInput();
    dependencies(unresolved).limitedSupportAssessment = { outcome: "UNRESOLVED", limitations: [] };
    expectReason(unresolved, "LIMITED_SUPPORT_UNRESOLVED");
  });

  it("fails closed when domain binding is missing, unresolved, or failed", () => {
    const missing = completeInput();
    delete (missing.dependencies as { domainFactResolution?: unknown }).domainFactResolution;
    expectReason(missing, "DOMAIN_BINDING_MISSING");
    const unresolved = completeInput();
    dependencies(unresolved).domainFactResolution = {
      status: "UNRESOLVED", resolutions: [], requirements: [], limitations: ["unknown"], errors: [],
    };
    expectReason(unresolved, "DOMAIN_BINDING_UNRESOLVED");
    const failed = completeInput();
    dependencies(failed).domainFactResolution = {
      status: "FAILED", resolutions: [], requirements: [], limitations: [], errors: [],
    };
    expectReason(failed, "DOMAIN_BINDING_FAILED", "FAILED");
  });

  it("fails closed when evidence is missing, unavailable, or invalid", () => {
    const missing = completeInput();
    delete (missing.dependencies as { evidence?: unknown }).evidence;
    expectReason(missing, "EVIDENCE_DEPENDENCY_MISSING");
    const unavailable = completeInput();
    dependencies(unavailable).evidence = { status: "UNAVAILABLE" };
    expectReason(unavailable, "EVIDENCE_PROVIDER_UNAVAILABLE");
    const invalid = completeInput();
    dependencies(invalid).evidence = {
      status: "AVAILABLE",
      linkage: { ok: false, errors: [{ code: "UNKNOWN_LINK_ASSERTION", referenceId: "e-1:r-1" }] },
    };
    expectReason(invalid, "EVIDENCE_LINKAGE_INVALID");
  });

  it("fails closed for unresolved conflicts and unsupported evaluation", () => {
    const conflict = completeInput();
    dependencies(conflict).domainAssessment = {
      ...conflict.dependencies.domainAssessment!,
      outcome: "UNRESOLVED",
      relevantConflicts: ["conflict-1"],
    };
    expectReason(conflict, "CONFLICT_UNRESOLVED");

    const unsupported = completeInput();
    dependencies(unsupported).domainAssessment = {
      ...unsupported.dependencies.domainAssessment!,
      outcome: "UNRESOLVED",
      diagnostics: [{ requirementId: "r-1", evidenceIds: [], reason: "UNSUPPORTED_RELATION_EVALUATION" }],
    };
    expectReason(unsupported, "EVALUATION_UNSUPPORTED");
  });

  it("blocks negative diagnostics regardless of a sufficient domain snapshot", () => {
    const input = completeInput();
    dependencies(input).domainAssessment = {
      ...input.dependencies.domainAssessment!,
      diagnostics: [{ requirementId: "r-1", evidenceIds: ["e-1"], reason: "CONSTRAINT_MISMATCH" }],
    };
    expectReason(input, "NEGATIVE_DIAGNOSTIC_UNRESOLVED");
  });

  it("keeps the terminal Scope A path unresolved", () => {
    const result = expectReason(completeInput(), "SCOPE_A_AUTHORIZATION_BLOCKED");
    expect(result.lineage.stoppedAt).toBe("AUTHORIZATION");
  });

  it("does not mutate input and is deterministic", () => {
    const input = completeInput();
    const before = structuredClone(input);
    const first = orchestrateCarsDecision(input);
    const second = orchestrateCarsDecision(structuredClone(input));
    expect(input).toEqual(before);
    expect(first).toEqual(second);
  });

  it("keeps reason references and stage lineage ordering stable", () => {
    const input = completeInput();
    dependencies(input).evidence = {
      status: "AVAILABLE",
      linkage: {
        ok: false,
        errors: [
          { code: "UNKNOWN_LINK_REQUIREMENT", referenceId: "z" },
          { code: "UNKNOWN_LINK_ASSERTION", referenceId: "a" },
        ],
      },
    };
    const result = orchestrateCarsDecision(input);
    expect(result.reasons[0].referenceIds).toEqual([
      "UNKNOWN_LINK_ASSERTION:a",
      "UNKNOWN_LINK_REQUIREMENT:z",
    ]);
    expect(result.lineage.inspectedStages).toEqual([
      "CLASSIFICATION", "MATERIALITY", "REJECTION_RELEVANCE", "LIMITED_SUPPORT", "DOMAIN_BINDING", "EVIDENCE",
    ]);
  });
});
