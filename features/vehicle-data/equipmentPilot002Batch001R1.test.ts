import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateEquipmentEvidenceLocatorAgainstArtifact, validateReviewEvents } from "./equipmentCollectionProtocol";
import { projectEquipmentEvidence } from "./projectEquipmentEvidence";
import { validateAssertionSupersessions, validateTrimLinkSupersessions } from "./validateEquipmentEvidenceLayer";
import type { EquipmentEvidenceAssertion, EquipmentReviewEvent, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), BASE = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001";
const R1 = path.join(BASE, "corrections/EE-PILOT-002-CYCLE-001-R1");
const IBRIDA = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const fileSha = (file: string) => createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");
const original = read<EquipmentEvidenceAssertion[]>(`${BASE}/assertions.json`), successors = read<EquipmentEvidenceAssertion[]>(`${R1}/assertions.json`);
const originalLinks = read<EquipmentTrimVariantLink[]>(`${BASE}/trim-links.json`), successorLinks = read<EquipmentTrimVariantLink[]>(`${R1}/trim-links.json`);

const verified = (id: string, overrides: Partial<EquipmentEvidenceAssertion> = {}): EquipmentEvidenceAssertion => ({ ...original.find((item) => item.exactVariantId === IBRIDA)!, assertionId: id, verificationState: "VERIFIED", ...overrides });

describe("EE-PILOT-002 Batch 001-R1 immutable correction", () => {
  it("keeps original batch artifacts and Elettrica snapshot byte-identical", () => {
    expect(fileSha(`${BASE}/assertions.json`)).toBe("d71484a96009d93756ba7843393bb441c88cea798a32ab240edb0ee41407bb35");
    expect(fileSha(`${BASE}/trim-links.json`)).toBe("79abb10279f25128ce95c441f1d8f64d71c111e98ef41c8f58f71aae94bba41f");
    expect(fileSha(`${BASE}/research-ledger.json`)).toBe("22f0491ab3f5e9920378c36bd9a255546dfc7ca1d46c17b910bbb5d25f8b41af");
    expect(fileSha("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html")).toBe("a97340845586845dfd6e6f84f5e2d0a351c6910678c544d860357ec631dc338b");
  });

  it("recollects exactly 24 Ibrida features with one-to-one successor scope", () => {
    const ledger = read<{ exactVariantId: string; featureCode: string; originalAssertionId: string; replacementAssertionId: string; disposition: string }[]>(`${R1}/research-ledger.json`);
    expect(ledger).toHaveLength(24); expect(successors).toHaveLength(24);
    expect(ledger.every((item) => item.exactVariantId === IBRIDA && item.disposition === "RESEARCHED_CONCLUSIVE")).toBe(true);
    expect(successors.every((item) => item.exactVariantId === IBRIDA && item.verificationState === "PROVISIONAL" && item.supersedesAssertionId)).toBe(true);
    expect(validateAssertionSupersessions([...original, ...successors])).toEqual([]);
    expect(successors.some((item) => item.exactVariantId === ELETTRICA)).toBe(false);
  });

  it("rejects missing, self, scope-mismatched, cyclic and multiple assertion successors", () => {
    expect(validateAssertionSupersessions([verified("A", { supersedesAssertionId: "MISSING" })]).map((x) => x.code)).toContain("ASSERTION_SUPERSESSION_TARGET_MISSING");
    expect(validateAssertionSupersessions([verified("A", { supersedesAssertionId: "A" })]).map((x) => x.code)).toContain("ASSERTION_SUPERSESSION_SELF_REFERENCE");
    expect(validateAssertionSupersessions([verified("A"), verified("B", { featureCode: "REAR_VIEW_CAMERA", supersedesAssertionId: "A" })]).map((x) => x.code)).toContain("ASSERTION_SUPERSESSION_SCOPE_MISMATCH");
    expect(validateAssertionSupersessions([verified("A", { supersedesAssertionId: "B" }), verified("B", { supersedesAssertionId: "A" })]).map((x) => x.code)).toContain("ASSERTION_SUPERSESSION_CYCLE");
    expect(validateAssertionSupersessions([verified("A"), verified("B", { supersedesAssertionId: "A" }), verified("C", { supersedesAssertionId: "A" })]).map((x) => x.code)).toContain("ASSERTION_MULTIPLE_ACTIVE_SUCCESSORS");
  });

  it("keeps a provisional terminal successor fail-closed and uses it only after verification", () => {
    const predecessor = verified("A"), provisional = verified("B", { supersedesAssertionId: "A", verificationState: "PROVISIONAL" });
    const input = { variant: { exactVariantId: IBRIDA, modelYear: 2026, market: "TR" as const }, featureCode: predecessor.featureCode, packageLinks: [], trimLinks: [] };
    expect(projectEquipmentEvidence({ ...input, assertions: [predecessor, provisional] })).toBeUndefined();
    expect(projectEquipmentEvidence({ ...input, assertions: [provisional, predecessor] })).toBeUndefined();
    expect(projectEquipmentEvidence({ ...input, assertions: [predecessor, { ...provisional, verificationState: "VERIFIED" }] })?.assertionIds).toEqual(["B"]);
  });

  it("enforces trim-link supersession scope, cycle and single-successor rules", () => {
    expect(successorLinks).toHaveLength(1); expect(validateTrimLinkSupersessions([...originalLinks, ...successorLinks])).toEqual([]);
    const base = originalLinks.find((item) => item.exactVariantId === IBRIDA)!;
    expect(validateTrimLinkSupersessions([{ ...base, linkId: "B", supersedesTrimLinkId: "MISSING" }]).map((x) => x.code)).toContain("TRIM_LINK_SUPERSESSION_TARGET_MISSING");
    expect(validateTrimLinkSupersessions([base, { ...base, linkId: "B", canonicalTrimId: "OTHER", supersedesTrimLinkId: base.linkId }]).map((x) => x.code)).toContain("TRIM_LINK_SUPERSESSION_SCOPE_MISMATCH");
    expect(validateTrimLinkSupersessions([{ ...base, linkId: "A", supersedesTrimLinkId: "B" }, { ...base, linkId: "B", supersedesTrimLinkId: "A" }]).map((x) => x.code)).toContain("TRIM_LINK_SUPERSESSION_CYCLE");
    expect(validateTrimLinkSupersessions([base, { ...base, linkId: "B", supersedesTrimLinkId: base.linkId }, { ...base, linkId: "C", supersedesTrimLinkId: base.linkId }]).map((x) => x.code)).toContain("TRIM_LINK_MULTIPLE_ACTIVE_SUCCESSORS");
  });

  it("fails the duplicate legacy DOM id and resolves every structured locator exactly", () => {
    const raw = readFileSync(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html"), "utf8");
    expect(validateEquipmentEvidenceLocatorAgainstArtifact({ kind: "HTML_SECTION", elementReference: "#modal-avhpos5auh" }, raw)).toEqual(["HTML_LOCATOR_NOT_UNIQUE"]);
    const derived = readFileSync(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json"), "utf8");
    for (const item of successors) expect(validateEquipmentEvidenceLocatorAgainstArtifact(item.locator, derived, (item.locator as { recordPath: string }).recordPath.split(".").at(-1) ? JSON.parse(derived).equipmentByFeature[item.featureCode] : undefined)).toEqual([]);
    expect(validateEquipmentEvidenceLocatorAgainstArtifact({ kind: "STRUCTURED_RECORD", recordPath: "$.equipmentByFeature.MISSING" }, derived)).toEqual(["HTML_LOCATOR_NOT_FOUND"]);
  });

  it("creates only collector review events and leaves 25 subjects awaiting second review", () => {
    const events = read<EquipmentReviewEvent[]>(`${R1}/review-events.json`);
    expect(events).toHaveLength(50); expect(new Set(events.map((item) => `${item.subjectType}|${item.subjectId}`)).size).toBe(25);
    expect(validateReviewEvents(events, successors)).toEqual([]);
    expect(events.every((item) => item.actorRole === "EQUIPMENT_COLLECTOR_PRIMARY" && item.toState !== "SECOND_REVIEW_PASSED" && item.toState !== "APPROVED")).toBe(true);
  });

  it("pins raw and derived checksums and documents the official backend linkage", () => {
    const inventory = read<Record<string, unknown>[]>(`${R1}/source-inventory.json`);
    expect(fileSha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html")).toBe("3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955");
    expect(fileSha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json")).toBe("7c4b9f8e7de95cfda4569b09f01bd0e362113b6a677a872ffea701e98cc09515");
    expect(inventory.find((item) => item.sourceId === "SRC-000085")).toMatchObject({ governanceStatus: "OFFICIAL_BACKEND_LINK_CONFIRMED" });
  });
});
