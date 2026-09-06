import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  cappedEvidenceClassScore,
  validateEvidenceClassAssertion,
  type PersonaEvidenceClassAssertion,
} from "./evidenceClassPolicy";

const assertion = (
  overrides: Partial<PersonaEvidenceClassAssertion> = {},
): PersonaEvidenceClassAssertion => ({
  assertionId: "a",
  evidenceClass: "INTENDED_POSITIONING",
  assertionScope: "PRODUCT_FAMILY_PERSONA",
  trait: "DESIGN_LED",
  contribution: 0.25,
  sourceIds: ["s"],
  sourceLineageIds: ["l"],
  independentSourceCount: 0,
  sourceType: "MANUFACTURER_CONTROLLED",
  technicalOrPerformanceClaim: false,
  ...overrides,
});

describe("Persona evidence-class policy", () => {
  it("bounds intended positioning and forbids technical or variant claims", () => {
    expect(validateEvidenceClassAssertion(assertion())).toEqual([]);
    expect(
      validateEvidenceClassAssertion(
        assertion({ contribution: 0.5, assertionScope: "VARIANT_PERSONA", technicalOrPerformanceClaim: true }),
      ),
    ).toContain("EVIDENCE_CLASS_CONTRIBUTION_EXCEEDS_MAX");
  });

  it("admits one editorial observation at no more than 0.50", () => {
    expect(
      validateEvidenceClassAssertion(
        assertion({
          evidenceClass: "EDITORIALLY_OBSERVED",
          sourceType: "INDEPENDENT_EDITORIAL",
          independentSourceCount: 1,
          contribution: 0.5,
        }),
      ),
    ).toEqual([]);
  });

  it("requires two independent sources or governed user aggregation for corroboration", () => {
    expect(
      validateEvidenceClassAssertion(
        assertion({
          evidenceClass: "INDEPENDENTLY_CORROBORATED",
          sourceType: "INDEPENDENT_EDITORIAL",
          independentSourceCount: 1,
          contribution: 0.75,
        }),
      ),
    ).toContain("CORROBORATION_THRESHOLD_NOT_MET");
    expect(
      validateEvidenceClassAssertion(
        assertion({
          evidenceClass: "INDEPENDENTLY_CORROBORATED",
          sourceType: "AGGREGATED_USER_THEME",
          userThemeSample: { reviews: 20, platforms: 2, independentAuthors: 20, personalData: "EXCLUDED" },
          contribution: 0.75,
        }),
      ),
    ).toEqual([]);
  });

  it("deduplicates the same trait and shared lineage before applying the 0.75 cap", () => {
    expect(
      cappedEvidenceClassScore([
        assertion(),
        assertion({ assertionId: "b", trait: "PLAYFUL", sourceLineageIds: ["l"] }),
        assertion({
          assertionId: "c",
          trait: "PROFESSIONAL",
          sourceIds: ["s2"],
          sourceLineageIds: ["l2"],
          contribution: 0.25,
        }),
      ]),
    ).toBe(0.5);
  });

  it("keeps the generated owner-review package complete and inactive", () => {
    const packageDirectory = path.join(
      process.cwd(),
      "data/production/personas/universal/evidence-class-admission/XPY-PERSONA-EVIDENCE-CLASS-ADMISSION-01",
    );
    const ownerReview = JSON.parse(
      readFileSync(path.join(packageDirectory, "owner-review-package.json"), "utf8"),
    );
    const sourceAudit = JSON.parse(
      readFileSync(path.join(packageDirectory, "source-audit-108.json"), "utf8"),
    );
    const traces = JSON.parse(readFileSync(path.join(packageDirectory, "trace-previews.json"), "utf8"));

    expect(ownerReview.projections).toHaveLength(169);
    expect(ownerReview.coverage).toMatchObject({ processed: 169, governed: 4, unknown: 165, conflicted: 0 });
    expect(sourceAudit).toHaveLength(108);
    expect(ownerReview.ownerApproval).toMatchObject({ state: "PENDING", activationState: "NOT_ACTIVE" });
    expect(traces).toHaveLength(7);
    for (const trace of traces) {
      expect(trace).toMatchObject({
        membershipIdentical: true,
        catalogOrderIndependent: true,
        singleSelectionAuthorized: false,
      });
    }
  });

  it("binds owner approval to the exact package without granting activation", () => {
    const approvalDirectory = path.join(
      process.cwd(),
      "data/production/personas/universal/evidence-class-admission/XPY-PERSONA-EVIDENCE-CLASS-ADMISSION-01/owner-approval",
    );
    const event = JSON.parse(
      readFileSync(path.join(approvalDirectory, "owner-approval-event.json"), "utf8"),
    );
    const status = JSON.parse(
      readFileSync(path.join(approvalDirectory, "owner-approved-status.json"), "utf8"),
    );

    expect(event).toMatchObject({
      approvedPayloadDigest: "sha256:85bb241c57b995c95b7118b022c2272cf541a189c7c6f451839e7d7a7ba67610",
      authority: "POLICY_AND_SHADOW_PROJECTION_ONLY",
      rankingActivationAuthorized: false,
      catalogMembershipMutationAuthorized: false,
      domainPackBindingAuthorized: false,
      deploymentAuthorized: false,
    });
    expect(status).toMatchObject({
      approvalState: "APPROVED_SHADOW_AUTHORITY_NOT_ACTIVE",
      activationState: "NOT_ACTIVE",
      governedProducts: 4,
      unknownProducts: 165,
      conflictedProducts: 0,
      rankingChanged: false,
      catalogMembershipChanged: false,
      activePointerChanged: false,
      deploymentPerformed: false,
    });
  });
});
