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
    expect(sha(path.join(root, "data/production/equipment-evidence/active.json"))).toBe("sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed");
    expect(sha(path.join(root, "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts"))).toBe("sha256:9c5971b14716bc503a649f99790655bdddc02f8513a6e13b6f198749f0166fea");
  });
  it("loads the active evidence tiers separately", () => {
    expect(getVerifiedEquipmentAssertions()).toHaveLength(47); expect(getReviewedEquipmentAssociations()).toHaveLength(49); expect(getVerifiedEquipmentTrimLinks()).toHaveLength(4);
    expect(getVerifiedEquipmentAssertions().some((item) => tonaleIds.includes(item.exactVariantId))).toBe(false);
    expect(getReviewedEquipmentAssociations().every((item) => tonaleIds.includes(item.exactVariantId))).toBe(true);
  });
  it("reports exact tier coverage without treating associations as verified", () => {
    expect(loadActiveEquipmentEvidenceStatus()).toMatchObject({ verifiedAssertionCount: 47, reviewedAssociationCount: 49, verifiedTrimLinkCount: 4,
      verifiedAssertionCoveredVariantCount: 2, associationOnlyCoveredVariantCount: 2, uncoveredExactVariantCount: 562,
      totalCatalogVariantCount: 566, availabilityProjectionCount: 47, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
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
