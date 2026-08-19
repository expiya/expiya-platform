import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { assertEquipmentSubjectContentFingerprint, calculateEquipmentSubjectContentFingerprint, validateEquipmentSubjectSuccessors } from "./equipmentSubjectFingerprint";

const root = path.join(process.cwd(), "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const r1 = path.join(root, "corrections/EE-PILOT-002-SCALE-WAVE-001-R1");
const load = (file: string) => JSON.parse(fs.readFileSync(path.join(r1, file), "utf8"));
const activePointer = path.join(process.cwd(), "data/production/equipment-evidence/active.json");

describe("equipment subject content fingerprint policy", () => {
  it("is stable across key order, Unicode equivalence and lifecycle-only changes", () => {
    const a = calculateEquipmentSubjectContentFingerprint({ label: "Şerit", nested: { b: 2, a: 1 }, reviewState: "A", createdAt: "2026-01-01", subjectId: "one" });
    const b = calculateEquipmentSubjectContentFingerprint({ nested: { a: 1, b: 2 }, label: "S\u0327erit", reviewState: "B", createdAt: "2027-01-01", subjectId: "two" });
    expect(a).toBe(b);
    const semanticA = calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", availability: "STANDARD" });
    const semanticB = calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", availability: "STANDARD" });
    expect(semanticA).toBe(semanticB);
    expect(calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v2", availability: "STANDARD" })).not.toBe(semanticA);
    expect(calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", availability: "OPTIONAL" })).not.toBe(semanticA);
    expect(calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", availability: "STANDARD", sourceChecksum: "sha256:b" })).not.toBe(calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", availability: "STANDARD", sourceChecksum: "sha256:a" }));
  });

  it("rejects invalid fingerprints and invalid successor graphs", () => {
    expect(() => assertEquipmentSubjectContentFingerprint(" ")).toThrow("EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_INVALID");
    expect(() => validateEquipmentSubjectSuccessors([{ subjectId: "new", supersedesSubjectId: "missing", scopeKey: "v:f" }])).toThrow("EQUIPMENT_SUBJECT_SUPERSESSION_TARGET_MISSING");
    expect(() => validateEquipmentSubjectSuccessors([{ subjectId: "old", scopeKey: "v:f" }, { subjectId: "a", supersedesSubjectId: "old", scopeKey: "v:f" }, { subjectId: "b", supersedesSubjectId: "old", scopeKey: "v:f" }])).toThrow("EQUIPMENT_SUBJECT_MULTIPLE_TERMINAL_SUCCESSORS");
  });
});

describe("EE-PILOT-002-SCALE-WAVE-001-R1", () => {
  it("contains only the 65 BYD/Nissan assertion and 2 trim-link successors", () => {
    const assertions = load("assertion-successors.json").assertions;
    const trimLinks = load("trim-link-successors.json").trimLinks;
    const review = load("independent-review-index.json").subjects;
    expect(assertions).toHaveLength(65);
    expect(trimLinks).toHaveLength(2);
    expect(review).toHaveLength(67);
    expect(assertions.filter((item: { exactVariantId: string }) => item.exactVariantId === "6cb56615-37ef-51a8-9202-a73e59d4e14b")).toHaveLength(33);
    expect(assertions.filter((item: { exactVariantId: string }) => item.exactVariantId === "90e65f94-6fdb-5eea-ad7e-0b4e18435427")).toHaveLength(32);
    expect(review.some((item: { exactVariantId: string }) => item.exactVariantId === "19951113-2e40-5526-b568-2ae1984c27e0")).toBe(false);
    expect(assertions.every((item: { contentFingerprint: string; verificationState: string; supersedesAssertionId?: string }) => /^sha256:[a-f0-9]{64}$/.test(item.contentFingerprint) && item.verificationState === "PROVISIONAL" && Boolean(item.supersedesAssertionId))).toBe(true);
    expect(trimLinks.every((item: { supersedesTrimLinkId?: string; reviewState: string }) => Boolean(item.supersedesTrimLinkId) && item.reviewState === "SECOND_REVIEW_REQUIRED")).toBe(true);
  });

  it("creates two collector events per subject without review pass", () => {
    const events = load("collector-review-events.json").events;
    expect(events).toHaveLength(134);
    expect(events.every((item: { actorRole: string; toState: string }) => item.actorRole === "EQUIPMENT_COLLECTOR_PRIMARY" && ["COLLECTED", "SECOND_REVIEW_REQUIRED"].includes(item.toState))).toBe(true);
    expect(events.some((item: { toState: string }) => item.toState === "SECOND_REVIEW_PASSED")).toBe(false);
  });

  it("preserves originals and leaves Volvo fail-closed", () => {
    expect(load("original-immutability.json").status).toBe("BYTE_IDENTICAL");
    const handoff = load("volvo-catalog-evidence-audit-handoff/handoff.json");
    expect(handoff.status).toBe("AUDIT_NOT_STARTED");
    expect(handoff.affectedEvidence.assertionIds).toHaveLength(2);
    expect(handoff.affectedEvidence.associationIds).toHaveLength(24);
    expect(handoff.affectedEvidence.trimLinkIds).toHaveLength(1);
    expect(handoff.semanticMappingRisk.featureCodes).toEqual(["ISOFIX_REAR_OUTER", "FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE"]);
  });

  it("does not modify the active Equipment pointer", () => {
    const digest = `sha256:${createHash("sha256").update(fs.readFileSync(activePointer)).digest("hex")}`;
    expect(digest).toBe("sha256:39eae2723b0ca4bc38589bc25157326f084ed36f8fa4b6a946c7542d8ea4c98a");
  });
});
