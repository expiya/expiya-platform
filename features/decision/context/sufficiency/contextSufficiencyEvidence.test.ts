import { describe, expect, it } from "vitest";

import type {
  ContextConfirmationEvidence,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

import {
  findConfirmationForCandidate,
  findMaterialityAssessment,
  isInferenceConfirmed,
} from "./contextSufficiencyEvidence";

describe("contextSufficiencyEvidence", () => {
  const materialityAssessments: MaterialityAssessment[] = [
    {
      requirementId: "material-priorities",
      outcome: "MATERIAL",
      supportingCandidateIds: ["candidate-1"],
      limitations: [],
    },
    {
      requirementId: "material-preferences",
      outcome: "NOT_MATERIAL",
      supportingCandidateIds: [],
      limitations: [],
    },
  ];

  const confirmations: ContextConfirmationEvidence[] = [
    {
      inferredCandidateId: "candidate-2",
      confirmed: true,
      confirmationSource: "EXPLICIT_USER",
    },
    {
      inferredCandidateId: "candidate-3",
      confirmed: false,
      confirmationSource: "EXPLICIT_USER",
    },
  ];

  it("finds materiality assessment by requirement identity", () => {
    expect(
      findMaterialityAssessment(
        materialityAssessments,
        "material-priorities",
      ),
    ).toEqual(materialityAssessments[0]);
  });

  it("returns null when no materiality assessment exists", () => {
    expect(
      findMaterialityAssessment(
        materialityAssessments,
        "material-constraints",
      ),
    ).toBeNull();
  });

  it("finds confirmation evidence by inferred candidate identity", () => {
    expect(
      findConfirmationForCandidate(
        confirmations,
        "candidate-2",
      ),
    ).toEqual(confirmations[0]);
  });

  it("returns null when confirmation evidence is absent", () => {
    expect(
      findConfirmationForCandidate(
        confirmations,
        "candidate-99",
      ),
    ).toBeNull();
  });

  it("treats explicitly confirmed inference as confirmed", () => {
    expect(
      isInferenceConfirmed(
        confirmations,
        "candidate-2",
      ),
    ).toBe(true);
  });

  it("does not treat rejected confirmation as confirmed", () => {
    expect(
      isInferenceConfirmed(
        confirmations,
        "candidate-3",
      ),
    ).toBe(false);
  });

  it("does not treat missing confirmation as confirmed", () => {
    expect(
      isInferenceConfirmed(
        confirmations,
        "candidate-99",
      ),
    ).toBe(false);
  });
});
