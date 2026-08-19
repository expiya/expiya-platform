import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getReviewedEquipmentAssociations, getVerifiedEquipmentAssertions, getVerifiedEquipmentTrimLinks, loadActiveEquipmentEvidenceStatus } from "./equipmentEvidenceResolver";

const root = process.cwd();
const release = path.join(root, "data/production/equipment-evidence/releases/v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18");
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(release, file), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
const tonaleIds = ["54bbe431-a3c2-56d0-8177-cefdf0330bcb", "f12f742b-111c-54de-a006-61361fb1ae04"];

describe("atomic reviewed-association equipment activation", () => {
  it("activates the authorized pointer and generated module hashes", () => {
    expect(sha(path.join(root, "data/production/equipment-evidence/active.json"))).toBe("sha256:101803fb4195c8cfe724715ece539d5ba88fb797f6a0194657b2166043feee4b");
    expect(sha(path.join(root, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts"))).toBe("sha256:e282e22700252fd0fe9b45d36be2c2c4953beb916367e8e390dbbb1977466396");
  });
  it("loads the active evidence tiers separately", () => {
    expect(getVerifiedEquipmentAssertions()).toHaveLength(112); expect(getReviewedEquipmentAssociations()).toHaveLength(49); expect(getVerifiedEquipmentTrimLinks()).toHaveLength(6);
    expect(getVerifiedEquipmentAssertions().some((item) => tonaleIds.includes(item.exactVariantId))).toBe(false);
    expect(getReviewedEquipmentAssociations().every((item) => tonaleIds.includes(item.exactVariantId))).toBe(true);
  });
  it("reports exact tier coverage without treating associations as verified", () => {
    expect(loadActiveEquipmentEvidenceStatus()).toMatchObject({ verifiedAssertionCount: 112, reviewedAssociationCount: 49, verifiedTrimLinkCount: 6,
      verifiedAssertionCoveredVariantCount: 4, associationOnlyCoveredVariantCount: 2, uncoveredExactVariantCount: 543,
      totalCatalogVariantCount: 549, availabilityProjectionCount: 112, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
  });
  it("keeps Tonale availability projections and all decision effects at zero", () => {
    const dry = read<Record<string, unknown>>("decision-neutrality-dry-run.json");
    expect(dry).toMatchObject({ status: "PASSED", tonaleAvailabilityProjectionCount: 0, hardFilter: false, ranking: false, questionGeneration: false, userFacingConfirmedFact: false, publicOutputImpact: "NONE" });
  });
  it("preserves rollback hashes and immutable release selection", () => {
    const result = read<Record<string, unknown>>("activation-result.json");
    expect(result).toMatchObject({ status: "ACTIVATED", rollbackReleaseId: "v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18", rollbackPointerChecksum: "sha256:aec85d8f92c51ef3e5126a9f0dcf7db19bad3b9cb31a8851b58c2ef833950765", rollbackGeneratedModuleChecksum: "sha256:e18f0eca09a69e44badb3716d91fedcf56e3be9cecb8eff9a555c5ffc0a02d95" });
  });
});
