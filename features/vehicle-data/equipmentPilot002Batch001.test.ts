import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createCanonicalTrimId } from "@/features/vehicle-data/equipmentCanonicalIdentity";
import { validateReviewEvents } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentReviewEvent } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const WORK = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(WORK, name), "utf8")) as T;
const digest = (file: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex")}`;
const IBRIDA = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";

describe("EE-PILOT-002 Batch 001 collector artifacts", () => {
  const ledger = read<{ exactVariantId: string; featureCode: string; disposition: string; assertionIds: string[] }[]>("research-ledger.json");
  const assertions = read<EquipmentEvidenceAssertion[]>("assertions.json");
  const trimLinks = read<{ exactVariantId: string; canonicalTrimId: string; powertrainIdentity: string; verificationState: string; reviewState: string }[]>("trim-links.json");

  it("has exactly 102 researched dispositions and no NOT_RESEARCHED row", () => {
    expect(ledger).toHaveLength(102);
    expect(new Set(ledger.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(102);
    expect(ledger.filter((item) => item.disposition === "NOT_RESEARCHED")).toHaveLength(0);
    for (const variantId of [IBRIDA, ELETTRICA]) expect(ledger.filter((item) => item.exactVariantId === variantId).map((item) => item.featureCode).sort()).toEqual([...EQUIPMENT_FEATURE_CODES].sort());
  });

  it("requires an assertion for every conclusive row and never treats silence as absence", () => {
    const assertionIds = new Set(assertions.map((item) => item.assertionId));
    for (const item of ledger) if (item.disposition === "RESEARCHED_CONCLUSIVE") expect(item.assertionIds.every((id) => assertionIds.has(id))).toBe(true);
    expect(assertions.every((item) => item.evidencePolarity === "POSITIVE" && item.availabilityStatus === "STANDARD" && item.provisionMode === "INCLUDED")).toBe(true);
    expect(assertions.some((item) => item.availabilityStatus === "NOT_AVAILABLE" || item.availabilityStatus === "OPTIONAL" || item.availabilityStatus === "PACKAGE_DEPENDENT")).toBe(false);
  });

  it("keeps every collector assertion provisional, exact, located and provenance-bound", () => {
    for (const item of assertions) {
      expect(item.verificationState).toBe("PROVISIONAL");
      expect(item.sourceApplicability).toBe("EXACT_VARIANT");
      expect(item.locator.kind).toBe("HTML_SECTION");
      expect(item.market).toBe("TR");
      expect(item.modelYearFrom).toBe(2026);
      expect(item.modelYearTo).toBe(2026);
      expect([IBRIDA, ELETTRICA]).toContain(item.exactVariantId);
    }
  });

  it("does not cross-project the one powertrain-specific high-beam assertion", () => {
    expect(assertions.some((item) => item.exactVariantId === IBRIDA && item.featureCode === "HIGH_BEAM_ASSIST")).toBe(true);
    expect(assertions.some((item) => item.exactVariantId === ELETTRICA && item.featureCode === "HIGH_BEAM_ASSIST")).toBe(false);
    expect(read<{ featureCode: string; status: string }[]>("trim-comparison.json").find((item) => item.featureCode === "HIGH_BEAM_ASSIST")?.status).toBe("INCONCLUSIVE_FOR_ONE");
  });

  it("uses distinct deterministic trim identities for Ibrida and Elettrica", () => {
    expect(trimLinks).toHaveLength(2);
    expect(new Set(trimLinks.map((item) => item.canonicalTrimId)).size).toBe(2);
    for (const item of trimLinks) {
      const trim = item.exactVariantId === IBRIDA ? "Ibrida 145 PS Speciale+ eDCT6" : "Elettrica 115 kW Speciale+";
      const powertrain = item.exactVariantId === IBRIDA ? "IBRIDA" : "ELETTRICA";
      expect(item.canonicalTrimId).toBe(createCanonicalTrimId({ market: "TR", brand: "Alfa Romeo", modelFamily: "Junior", modelYear: 2026, trimName: "Speciale+", configurationIdentity: `${powertrain}|${trim}` }));
      expect(item.verificationState).toBe("PROVISIONAL");
      expect(item.reviewState).toBe("SECOND_REVIEW_REQUIRED");
    }
  });

  it("ends at independent second review without self-approval", () => {
    const events = read<EquipmentReviewEvent[]>("review-events.json");
    expect(validateReviewEvents(events, assertions)).toEqual([]);
    expect(events.some((item) => item.toState === "SECOND_REVIEW_PASSED" || item.toState === "APPROVED")).toBe(false);
    expect(read<{ lifecycleState: string }>("batch-lifecycle.json").lifecycleState).toBe("SECOND_REVIEW_REQUIRED");
    expect(read<{ lifecycleState: string }>("pilot-lifecycle.json").lifecycleState).toBe("COLLECTING");
  });

  it("verifies all three immutable source checksums", () => {
    const sources = read<{ artifactReference: string; artifactSha256: string }[]>("source-inventory.json");
    expect(sources).toHaveLength(3);
    for (const source of sources) expect(digest(source.artifactReference)).toBe(source.artifactSha256);
  });

  it("keeps packages and catalog quality issues empty", () => {
    expect(read<unknown[]>("package-links.json")).toEqual([]);
    expect(read<unknown[]>("catalog-quality-issues.json")).toEqual([]);
  });
});
