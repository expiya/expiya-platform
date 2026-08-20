import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ID = "EPEA-OAM-034AF597CB25EE09DF8F";
const directory = join(process.cwd(), "data/production/equipment-public-explanation-authority/governance/owner-approval-manifests", ID);
const authorityRoot = join(process.cwd(), "data/production/equipment-public-explanation-authority/release-candidates");
const dailyLifePath = join(process.cwd(), "data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate/equipment-daily-life.json");
const read = <T>(file: string): T => JSON.parse(readFileSync(join(directory, file), "utf8")) as T;
const sha = (bytes: string | Buffer) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sortValue = (value: unknown): unknown => Array.isArray(value) ? value.map(sortValue) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue((value as Record<string, unknown>)[key])])) : value;
const canonical = (value: unknown) => `${JSON.stringify(sortValue(value), null, 2)}\n`;

describe("equipment public explanation composite owner manifest preparation", () => {
  const manifest = read<Record<string, unknown>>("approval-manifest.json");
  const inventory = read<{ exactVariants: unknown[]; controlledDailyLifeEntries: unknown[]; authorizedPositiveAssertionIds: unknown[]; authorizedNegativeAssertionIds: unknown[]; excludedPublicClaimCounts: Record<string, number> }>("subject-inventory.json");

  it("is canonical, checksum-bound and has no owner approval event", () => {
    const { manifestChecksum, ...payload } = manifest;
    expect(manifestChecksum).toBe("sha256:cf20aa4f49c5f6bf2959fec9802fc84731f49925162ba2dbf0dd405d4c206f78");
    expect(sha(canonical(payload))).toBe(manifestChecksum);
    expect(readFileSync(join(directory, "approval-manifest.json"), "utf8")).toBe(canonical(manifest));
    expect(manifest).toMatchObject({ manifestId: ID, ownerActorId: "EQUIPMENT_OWNER_001", ownerApprovalEvent: null,
      activationPerformed: false, publicIntegrationPerformed: false });
  });

  it("binds the approved legal, consent and composite package only", () => {
    expect(manifest).toMatchObject({
      legalReview: { disposition: "LEGAL_AND_COPY_APPROVED", consentDisposition: "NO_ADDITIONAL_CONSENT_REQUIRED", checksumBoundOnly: true },
      equipmentDailyLife: { release: "v1.0.1-catalog-v0.55.4-2026-08-20-candidate", checksum: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233" },
      publicExplanationAuthority: { release: "v0.1.2-catalog-v0.55.4-2026-08-20-candidate", checksum: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd",
        compositeBindingChecksum: "sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222" }
    });
    expect(manifest.historicalCandidatesExcludedFromApproval).toEqual(["v0.1.0-catalog-v0.55.4-2026-08-20-candidate", "v0.1.1-catalog-v0.55.4-2026-08-20-candidate"]);
    expect(manifest.supersessionRelationPreserved).toBe("SUPERSEDED_PENDING_CORRECTED_LEGAL_REVIEW");
  });

  it("keeps the exact pilot and no-claim scope bounded", () => {
    expect(inventory.exactVariants).toHaveLength(2);
    expect(inventory.controlledDailyLifeEntries).toHaveLength(51);
    expect(inventory.authorizedPositiveAssertionIds).toHaveLength(62);
    expect(inventory.authorizedNegativeAssertionIds).toHaveLength(3);
    expect(Object.values(inventory.excludedPublicClaimCounts).every((count) => count === 0)).toBe(true);
    expect(manifest).toMatchObject({ pilotScope: { confirmedIncludedCount: 62, verifiedAbsenceCount: 3, otherExactVariantCount: 0 },
      authorityBoundaries: { globalFilteringAllowed: false, globalRankingAllowed: false, equipmentQuestionGenerationAllowed: false,
        candidateOrOfferOrderingImpact: "NONE", publicIntegrationPerformed: false, activationPerformed: false } });
  });

  it("recomputes every package checksum and preserves immutable predecessors", () => {
    const checksums = read<Record<string, string>>("checksums.json");
    for (const [file, expected] of Object.entries(checksums)) expect(sha(readFileSync(join(directory, file))), file).toBe(expected);
    expect(sha(readFileSync(join(authorityRoot, "v0.1.0-catalog-v0.55.4-2026-08-20-candidate/authority.json")))).toBe("sha256:4de37ff6200751c6e5b08911125a7ceb9176f6179bd567cced9b7fe9ae6c94e8");
    expect(sha(readFileSync(join(authorityRoot, "v0.1.1-catalog-v0.55.4-2026-08-20-candidate/authority.json")))).toBe("sha256:4811c5b12359346411efd137706935ffd2ace90bad0d1c88796f118e9bed7a4c");
    expect(sha(readFileSync(join(authorityRoot, "v0.1.2-catalog-v0.55.4-2026-08-20-candidate/authority.json")))).toBe("sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd");
    expect(sha(readFileSync(dailyLifePath))).toBe("sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233");
  });

  it("uses the active registered equipment owner only for manifest preparation", () => {
    expect(manifest.ownerActorRegistryBinding).toMatchObject({ role: "EQUIPMENT_OWNER_APPROVER", scope: "EQUIPMENT_EVIDENCE_ONLY", status: "ACTIVE" });
    expect(manifest.nextAuthorizedStep).toBe("OWNER_APPROVAL_EVENT_AND_IMMUTABLE_MATERIALIZATION_PREPARATION_ONLY");
  });
});
