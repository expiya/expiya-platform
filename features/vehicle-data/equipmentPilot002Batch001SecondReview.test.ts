import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import catalogPointer from "@/data/production/catalog/active.json";
import catalog from "@/data/production/catalog/releases/v0.55.2/catalog.json";
import { createCanonicalTrimId } from "@/features/vehicle-data/equipmentCanonicalIdentity";
import { validateReviewEvents } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_FEATURE_CODES, type EquipmentEvidenceAssertion, type EquipmentReviewEvent } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const WORK = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const IBRIDA = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8";
const ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(WORK, name), "utf8")) as T;
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

type AssertionReview = { assertionId: string; exactVariantId: string; featureCode: string; decision: string; checks: { semanticMapping: string; locator: string; standardAuthority: string; sourcePowertrainIsolation: string; provisionalBoundary: string }; sourceId: string; reviewException: null | { exceptionCode: string; recommendedDisposition: string } };
type TrimReview = { linkId: string; exactVariantId: string; canonicalTrimId: string; powertrainIdentity: string; decision: string; deterministicIdentity: string; distinctPowertrainIdentity: string; supportingLocatorReview: string; verificationStatePreserved: boolean };

describe("EE-PILOT-002 Batch 001 independent assertion-level second review", () => {
  const assertions = read<EquipmentEvidenceAssertion[]>("assertions.json");
  const assertionReviews = read<AssertionReview[]>("assertion-review-results.json");
  const trimReviews = read<TrimReview[]>("trim-link-review-results.json");
  const collectorEvents = read<EquipmentReviewEvent[]>("review-events.json");
  const secondReviewEvents = read<EquipmentReviewEvent[]>("second-review-events.json");

  it("preserves every checksummed collector artifact byte-for-byte", () => {
    const checksums = read<Record<string, string>>("checksums.json");
    for (const [name, expected] of Object.entries(checksums)) expect(sha(readFileSync(path.join(WORK, name)))).toBe(expected);
  });

  it("checksum-verifies all three secret-free immutable source artifacts", () => {
    const statuses = read<{ sourceId: string; checksumResult: string; secretScan: string; domainReview: string; artifactFormatReview: string }[]>("source-review-status.json");
    expect(statuses.map((status) => status.sourceId)).toEqual(["SRC-000083", "SRC-000084", "SRC-000085"]);
    expect(statuses.every((status) => status.checksumResult === "PASSED" && status.secretScan.startsWith("PASSED"))).toBe(true);
    expect(statuses[2]).toMatchObject({ domainReview: "OFFICIAL_DISTRIBUTOR_BACKEND_NON_ALFAROMEO_DOMAIN", artifactFormatReview: "DETERMINISTIC_HTML_RESPONSE_NOT_STRUCTURED_JSON" });
  });

  it("pins the exact v0.55.2 catalog identities and fingerprint", () => {
    expect(catalogPointer).toMatchObject({ active_catalog_release_version: "0.55.2", catalog_payload_hash: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f" });
    expect(sha(readFileSync("data/production/catalog/releases/v0.55.2/catalog.json"))).toBe(catalogPointer.catalog_payload_hash);
    const variants = [IBRIDA, ELETTRICA].map((id) => catalog.records.find((record) => record.variant.id === id)?.variant);
    expect(variants.map((variant) => ({ brand: variant?.brand.value, model: variant?.model.value, trim: variant?.trim.value, modelYear: variant?.modelYear.value }))).toEqual([
      { brand: "Alfa Romeo", model: "Junior", trim: "Ibrida 145 PS Speciale+ eDCT6", modelYear: 2026 },
      { brand: "Alfa Romeo", model: "Junior", trim: "Elettrica 115 kW Speciale+", modelYear: 2026 },
    ]);
  });

  it("finds both exact MY2026 configurations in the immutable price-list response", () => {
    const priceList = readFileSync("data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html", "utf8");
    expect(priceList).toMatch(/2026[\s\S]*JUNIOR ELETTRICA[\s\S]*Speciale\+[\s\S]*Elektrik/u);
    expect(priceList).toMatch(/2026[\s\S]*JUNIOR IBRIDA[\s\S]*SPECIALE\+[\s\S]*&#199;ift Kavramalı Otomatik[\s\S]*Benzinli Hibrit/u);
  });

  it("proves product pages are powertrain-specific with separate Speciale+ sections", () => {
    const ibrida = readFileSync("data/cars/vehicle_evidence/source_snapshots/SRC-000083/2026-08-18/source.html", "utf8");
    const elettrica = readFileSync("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html", "utf8");
    expect(ibrida).toContain("Speciale+");
    expect(ibrida).toContain("Hybrid 145* eDCT6");
    expect(elettrica).toContain("Speciale+");
    expect(elettrica).toContain("Elettrica 115kW");
    expect(elettrica).toContain('id="modal-popup-speciale-plus"');
  });

  it("verifies the complete 102-row ledger distribution and links", () => {
    const ledger = read<{ exactVariantId: string; featureCode: string; disposition: string; assertionIds: string[]; sourceIds: string[]; inconclusiveReasonCodes?: string[] }[]>("research-ledger.json");
    expect(ledger).toHaveLength(102);
    expect(new Set(ledger.map((entry) => `${entry.exactVariantId}|${entry.featureCode}`))).toHaveLength(102);
    expect(ledger.filter((entry) => entry.disposition === "RESEARCHED_CONCLUSIVE")).toHaveLength(47);
    expect(ledger.filter((entry) => entry.disposition === "RESEARCHED_INCONCLUSIVE")).toHaveLength(55);
    expect(ledger.filter((entry) => entry.disposition === "NOT_RESEARCHED")).toHaveLength(0);
    for (const variantId of [IBRIDA, ELETTRICA]) expect(new Set(ledger.filter((entry) => entry.exactVariantId === variantId).map((entry) => entry.featureCode))).toEqual(new Set(EQUIPMENT_FEATURE_CODES));
    expect(ledger.filter((entry) => entry.disposition === "RESEARCHED_CONCLUSIVE").every((entry) => entry.assertionIds.length === 1)).toBe(true);
    expect(ledger.filter((entry) => entry.disposition === "RESEARCHED_INCONCLUSIVE").every((entry) => entry.assertionIds.length === 0 && entry.sourceIds.length === 2 && (entry.inconclusiveReasonCodes?.length ?? 0) > 0)).toBe(true);
  });

  it("reviews all 47 assertions and fails closed only on the Ibrida locator", () => {
    expect(assertions).toHaveLength(47);
    expect(assertionReviews).toHaveLength(47);
    expect(new Set(assertionReviews.map((review) => review.assertionId))).toEqual(new Set(assertions.map((assertion) => assertion.assertionId)));
    expect(assertionReviews.filter((review) => review.decision === "SECOND_REVIEW_PASSED")).toHaveLength(23);
    expect(assertionReviews.filter((review) => review.decision === "CONFLICT_REVIEW_REQUIRED")).toHaveLength(24);
    expect(assertionReviews.filter((review) => review.exactVariantId === IBRIDA).every((review) => review.reviewException?.exceptionCode === "HTML_LOCATOR_DUPLICATE_ELEMENT_ID")).toBe(true);
    expect(assertionReviews.filter((review) => review.exactVariantId === ELETTRICA).every((review) => review.checks.locator === "PASSED_UNIQUE_ELEMENT_AND_ROW" && review.checks.standardAuthority === "PASSED_SPECIALE_PLUS_EQUIPMENT_MODAL")).toBe(true);
  });

  it("confirms all semantic mappings without widening source language", () => {
    const mappings = read<{ assertionId: string; featureCode: string; semanticDecision: string; overclaimFound: boolean }[]>("semantic-mapping-review.json");
    expect(mappings).toHaveLength(47);
    expect(mappings.every((mapping) => mapping.semanticDecision === "PASSED" && !mapping.overclaimFound)).toBe(true);
    expect(mappings.filter((mapping) => mapping.featureCode === "HIGH_BEAM_ASSIST")).toHaveLength(1);
    expect(mappings.some((mapping) => mapping.featureCode === "AUTOMATIC_HIGH_BEAM")).toBe(false);
  });

  it("detects the duplicate Ibrida locator and the unique Elettrica locator", () => {
    const ibrida = readFileSync("data/cars/vehicle_evidence/source_snapshots/SRC-000083/2026-08-18/source.html", "utf8");
    const elettrica = readFileSync("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html", "utf8");
    expect(ibrida.match(/data-modal-window-id="modal-avhpos5auh"/gu)).toHaveLength(2);
    expect(elettrica.match(/id="modal-popup-speciale-plus"/gu)).toHaveLength(1);
    expect(ibrida.indexOf("Adaptif uzun far yardımcısı")).toBeLessThan(ibrida.indexOf('data-modal-window-id="modal-avhpos5auh"'));
  });

  it("reviews both deterministic powertrain-separated trim identities", () => {
    expect(trimReviews).toHaveLength(2);
    expect(trimReviews.filter((review) => review.decision === "SECOND_REVIEW_PASSED")).toHaveLength(1);
    expect(trimReviews.filter((review) => review.decision === "CONFLICT_REVIEW_REQUIRED")).toHaveLength(1);
    expect(new Set(trimReviews.map((review) => review.canonicalTrimId))).toHaveLength(2);
    for (const review of trimReviews) {
      const isIbrida = review.exactVariantId === IBRIDA;
      const trim = isIbrida ? "Ibrida 145 PS Speciale+ eDCT6" : "Elettrica 115 kW Speciale+";
      const powertrain = isIbrida ? "IBRIDA" : "ELETTRICA";
      expect(review.canonicalTrimId).toBe(createCanonicalTrimId({ market: "TR", brand: "Alfa Romeo", modelFamily: "Junior", modelYear: 2026, trimName: "Speciale+", configurationIdentity: `${powertrain}|${trim}` }));
      expect(review).toMatchObject({ deterministicIdentity: "PASSED", distinctPowertrainIdentity: "PASSED", verificationStatePreserved: true });
    }
  });

  it("keeps cross-powertrain evidence isolated and independently regenerates comparison counts", () => {
    expect(assertions.filter((assertion) => assertion.exactVariantId === IBRIDA).every((assertion) => assertion.source.sourceId === "SRC-000083")).toBe(true);
    expect(assertions.filter((assertion) => assertion.exactVariantId === ELETTRICA).every((assertion) => assertion.source.sourceId === "SRC-000084")).toBe(true);
    const pairs = new Map(EQUIPMENT_FEATURE_CODES.map((feature) => [feature, { ibrida: false, elettrica: false }]));
    for (const assertion of assertions) pairs.get(assertion.featureCode)![assertion.exactVariantId === IBRIDA ? "ibrida" : "elettrica"] = true;
    const statuses = [...pairs.values()].map((pair) => pair.ibrida && pair.elettrica ? "CONFIRMED_SAME" : pair.ibrida || pair.elettrica ? "INCONCLUSIVE_FOR_ONE" : "INCONCLUSIVE_FOR_BOTH");
    expect(statuses.filter((status) => status === "CONFIRMED_SAME")).toHaveLength(23);
    expect(statuses.filter((status) => status === "INCONCLUSIVE_FOR_ONE")).toHaveLength(1);
    expect(statuses.filter((status) => status === "INCONCLUSIVE_FOR_BOTH")).toHaveLength(27);
    expect(assertions.some((assertion) => assertion.exactVariantId === ELETTRICA && assertion.featureCode === "HIGH_BEAM_ASSIST")).toBe(false);
  });

  it("appends exactly 49 independent subject decisions with no promotion or owner approval", () => {
    expect(secondReviewEvents).toHaveLength(49);
    expect(new Set(secondReviewEvents.map((event) => `${event.subjectType}|${event.subjectId}`))).toHaveLength(49);
    expect(secondReviewEvents.filter((event) => event.toState === "SECOND_REVIEW_PASSED")).toHaveLength(24);
    expect(secondReviewEvents.filter((event) => event.toState === "CONFLICT_REVIEW_REQUIRED")).toHaveLength(25);
    expect(secondReviewEvents.every((event) => event.actorRole === "EQUIPMENT_REVIEWER_SECONDARY" && event.actorInstanceId === "ACTOR-REVIEWER-CODEX-EQUIPMENT-001" && event.fromState === "SECOND_REVIEW_REQUIRED")).toBe(true);
    expect(secondReviewEvents.some((event) => event.actorInstanceId === "ACTOR-COLLECTOR-CODEX-CATALOG-001" || event.toState === "APPROVED")).toBe(false);
    expect(validateReviewEvents([...collectorEvents, ...secondReviewEvents], assertions)).toEqual([]);
    expect(assertions.every((assertion) => assertion.verificationState === "PROVISIONAL")).toBe(true);
  });

  it("records the fail-closed batch decision and deterministic review serialization", () => {
    const result = read<{ result: string; subjectCounts: { total: number; passed: number; conflictReviewRequired: number }; verificationPromotionAllowed: boolean; ownerApprovalCreated: boolean; activeEquipmentPointerChanged: boolean }>("second-review-results.json");
    expect(result).toMatchObject({ result: "ACCEPTED_WITH_REVIEW_EXCEPTIONS", subjectCounts: { total: 49, passed: 24, conflictReviewRequired: 25 }, verificationPromotionAllowed: false, ownerApprovalCreated: false, activeEquipmentPointerChanged: false });
    for (const name of ["assertion-review-results.json", "trim-link-review-results.json", "semantic-mapping-review.json", "second-review-events.json", "second-review-results.json", "source-review-status.json"]) expect(readFileSync(path.join(WORK, name), "utf8")).toBe(`${JSON.stringify(read(name), null, 2)}\n`);
  });
});
