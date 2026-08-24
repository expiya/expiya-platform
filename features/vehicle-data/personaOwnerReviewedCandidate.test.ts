import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { personaOwnerReviewedCandidateChecksum, personaOwnerReviewedCandidateSchema } from "./personaOwnerReviewedCandidate";

const root = path.join(process.cwd(), "data/production/personas/evidence/owner-reviewed/release-candidates/v3.9.0-catalog-v0.55.4-2026-08-24-evidence-sufficient-only");
const raw = readFileSync(path.join(root, "owner-reviewed-candidate.json"), "utf8");
const candidate = personaOwnerReviewedCandidateSchema.parse(JSON.parse(raw) as unknown);
const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8")) as { payloadSha256: string };

describe("persona V3.9 evidence-sufficient owner-reviewed candidate", () => {
  it("preserves complete catalog identity while keeping activation disabled", () => {
    expect(candidate.families).toHaveLength(385);
    expect(candidate.variants).toHaveLength(549);
    expect(candidate.activationPerformed).toBe(false);
  });

  it("binds the reviewed payload to its manifest checksum", () => {
    expect(personaOwnerReviewedCandidateChecksum(raw)).toBe(manifest.payloadSha256);
  });

  it("uses BaseScore plus a persona contribution capped at 0.75", () => {
    expect(candidate.scorePolicy).toEqual({ formula: "BASE_SCORE_PLUS_CAPPED_PERSONA", personaScoreCap: 0.75, decisionUse: "BOUNDED_SOFT_RANKING_ONLY" });
  });

  it("approves exact catalog architecture or regional corroboration only", () => {
    const approved = candidate.claims.filter((claim) => claim.decision === "APPROVE");
    expect(approved).toHaveLength(247);
    expect(approved.every((claim) => claim.decisionBasis === "EXACT_CATALOG_ARCHITECTURE" || claim.decisionBasis === "REGIONAL_PROFESSIONAL_CORROBORATION")).toBe(true);
  });

  it("defers every research-required claim", () => {
    const researchRequired = candidate.claims.filter((claim) => claim.decisionBasis === "REGIONAL_CORROBORATION_REQUIRED");
    expect(researchRequired).toHaveLength(353);
    expect(researchRequired.every((claim) => claim.decision === "DEFER_RESEARCH")).toBe(true);
  });
});
