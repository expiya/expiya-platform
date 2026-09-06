import fixture from "./fixtures/governed-candidates.json";
import { describe, expect, it } from "vitest";
import { digest, normalizeCandidateIdentity, runCatalogIngestionFactory, sha256 } from ".";
import type { DiscoveryCandidateInput, DiscoverySnapshot } from "./contracts";

const validInput = fixture as {
  runId: string;
  createdAt: string;
  snapshots: DiscoverySnapshot[];
  candidates: DiscoveryCandidateInput[];
};

describe("department-neutral catalog ingestion factory", () => {
  it("normalizes exact identity and deterministically deduplicates candidates", () => {
    const result = runCatalogIngestionFactory(validInput);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      candidateIds: ["DISCOVERY-001", "VERIFIED-001"],
      gate: "DECISION_READY",
      identity: { identityKey: "electronics::headphones::exampleco::model x::AB123" },
    });
    expect(result.candidates[0]?.claims[0]?.evidenceAuthority).toBe("MANUFACTURER_VERIFIED");
    expect(result.manifest).toMatchObject({
      departmentScope: ["electronics"],
      inputCandidateCount: 2,
      deduplicatedCandidateCount: 1,
      activePointersChanged: false,
      productionEligibilityGranted: false,
      authorityBoundary: "NON_PRODUCTION_CANDIDATE_PREPARATION_ONLY",
    });
    const reversed = runCatalogIngestionFactory({ ...validInput, snapshots: [...validInput.snapshots].reverse(), candidates: [...validInput.candidates].reverse() });
    expect(reversed.status).toBe("READY");
    if (reversed.status === "READY") {
      expect(reversed.manifest.candidateDigest).toBe(result.manifest.candidateDigest);
      expect(reversed.manifest.manufacturerEvidenceQueueDigest).toBe(result.manifest.manufacturerEvidenceQueueDigest);
    }
  });

  it("requires explicit manufacturer-backed decision facts to cross the final gate", () => {
    const identityOnly = { ...validInput.candidates[1]!, claims: [] };
    const result = runCatalogIngestionFactory({ ...validInput, candidates: [identityOnly] });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.candidates[0]).toMatchObject({ gate: "IDENTITY_VERIFIED", blockingReasons: ["DECISION_MATERIAL_CLAIMS_REQUIRED"] });
    expect(result.manufacturerEvidenceQueue[0]?.missingClaimIds).toEqual(["DECISION_MATERIAL_CLAIMS_NOT_DECLARED"]);
  });

  it("keeps Amazon bestseller discovery at DISCOVERY_ONLY and queues manufacturer evidence", () => {
    const result = runCatalogIngestionFactory({ ...validInput, candidates: [validInput.candidates[0]!] });
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.candidates[0]?.gate).toBe("DISCOVERY_ONLY");
    expect(result.manufacturerEvidenceQueue).toEqual([{ identityKey: "electronics::headphones::exampleco::model x::AB123", candidateIds: ["DISCOVERY-001"], requestedEvidence: "EXACT_MANUFACTURER_IDENTITY", missingClaimIds: [], status: "OPEN" }]);
  });

  it("fails closed when Amazon is presented as technical, price, popularity, affiliate, or production authority", () => {
    const amazonClaim: DiscoveryCandidateInput = {
      ...validInput.candidates[0]!,
      claims: [{ claimId: "amazon-rank", field: "popularityRanking", value: 1, evidenceSnapshotIds: ["AMAZON-DISCOVERY-001"], decisionMaterial: true }],
    };
    const result = runCatalogIngestionFactory({ ...validInput, candidates: [amazonClaim] });
    expect(result).toMatchObject({ status: "FAILED_CLOSED" });
    if (result.status === "FAILED_CLOSED") {
      expect(result.errors).toContain("FORBIDDEN_AUTHORITY_CLAIM:DISCOVERY-001:amazon-rank");
      expect(result.errors).toContain("DECISION_CLAIM_USES_DISCOVERY_SOURCE:DISCOVERY-001:amazon-rank");
    }
  });

  it("fails closed on snapshot tampering or unknown evidence references", () => {
    const tampered = { ...validInput.snapshots[0]!, content: "changed" };
    const candidate = { ...validInput.candidates[0]!, discoverySnapshotIds: ["MISSING"] };
    const result = runCatalogIngestionFactory({ ...validInput, snapshots: [tampered], candidates: [candidate] });
    expect(result.status).toBe("FAILED_CLOSED");
    if (result.status === "FAILED_CLOSED") {
      expect(result.errors).toContain("SNAPSHOT_CONTENT_DIGEST_MISMATCH:AMAZON-DISCOVERY-001");
      expect(result.errors).toContain("UNKNOWN_SNAPSHOT_REFERENCE:DISCOVERY-001:MISSING");
    }
  });

  it("uses canonical, stable digests and validates the fixture content digests", () => {
    expect(digest({ b: [2, 1], a: true })).toBe(digest({ a: true, b: [1, 2] }));
    for (const snapshot of validInput.snapshots) expect(snapshot.contentDigest).toBe(sha256(snapshot.content));
    expect(normalizeCandidateIdentity(validInput.candidates[0]!.identity).manufacturerPartNumber).toBe("AB123");
  });

  it.each(["Electronics", "Appliances", "Baby", "Cars", "Mobility"])("does not encode department-specific identity rules for %s", (department) => {
    const identity = normalizeCandidateIdentity({
      department,
      category: " Shared Category ",
      manufacturer: "Maker",
      model: "Model",
      gtin: " 0123-456 ",
    });
    expect(identity.identityKey).toBe(`${department.toLocaleLowerCase("tr-TR")}::shared category::maker::model::0123456`);
  });

  it("labels non-decision marketplace observations as discovery signals", () => {
    const discoveryObservation: DiscoveryCandidateInput = {
      ...validInput.candidates[0]!,
      claims: [{ claimId: "listing-title", field: "observedListingTitle", value: "ExampleCo Model X", evidenceSnapshotIds: ["AMAZON-DISCOVERY-001"], decisionMaterial: false }],
    };
    const result = runCatalogIngestionFactory({ ...validInput, candidates: [discoveryObservation] });
    expect(result.status).toBe("READY");
    if (result.status === "READY") expect(result.candidates[0]?.claims[0]?.evidenceAuthority).toBe("DISCOVERY_SIGNAL_ONLY");
  });
});
