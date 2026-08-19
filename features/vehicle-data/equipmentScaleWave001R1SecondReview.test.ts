import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001/corrections/EE-PILOT-002-SCALE-WAVE-001-R1");
const load = (file: string) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

describe("EE-PILOT-002-SCALE-WAVE-001-R1 independent review", () => {
  it("reviews exactly 65 assertions and 2 trim links", () => {
    const result = load("second-review/independent-review-results.json");
    expect(result.finalDisposition).toBe("ACCEPTED_FINGERPRINT_CORRECTED_EVIDENCE");
    expect([result.passedAssertions, result.conflictAssertions, result.passedTrimLinks, result.conflictTrimLinks]).toEqual([65, 0, 2, 0]);
    expect(result.distributions).toEqual({ BYD: { assertionsPassed: 33, trimLinksPassed: 1 }, Nissan: { assertionsPassed: 32, trimLinksPassed: 1 }, Volvo: { reviewSubjects: 0, successors: 0 } });
  });

  it("independently matches all fingerprints and preserves semantic content", () => {
    const fingerprints = load("second-review/fingerprint-recomputation.json");
    expect(fingerprints.records).toHaveLength(67);
    expect(fingerprints.records.every((item: { stored: string; computed: string; semanticEqual: boolean }) => item.stored === item.computed && item.semanticEqual)).toBe(true);
    expect(Object.values(fingerprints.adversarialFixtures).every(Boolean)).toBe(true);
  });

  it("appends one independent lifecycle decision per subject with independent actor", () => {
    const events = load("second-review/independent-review-events.json");
    expect(events).toHaveLength(67);
    expect(new Set(events.map((item: { eventId: string }) => item.eventId)).size).toBe(67);
    expect(events.every((item: { actorRole: string; actorInstanceId: string; fromState: string; toState: string }) => item.actorRole === "EQUIPMENT_REVIEWER_SECONDARY" && item.actorInstanceId === "ACTOR-REVIEWER-CODEX-EQUIPMENT-001" && item.fromState === "SECOND_REVIEW_REQUIRED" && item.toState === "SECOND_REVIEW_PASSED")).toBe(true);
  });

  it("keeps Volvo isolated and preserves the active pointer", () => {
    const volvo = load("second-review/volvo-isolation-review.json");
    expect([volvo.reviewSubjectCount, volvo.successorCount, volvo.productionCandidate]).toEqual([0, 0, false]);
    expect(load("second-review/independent-review-results.json").activePointerSha256).toBe("sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed");
  });
});
