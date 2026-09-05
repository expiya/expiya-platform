import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(root, "data/research/electronics/all-category-program-01", name), "utf8"));

describe("electronics all-category bounded candidate", () => {
  it("preserves the activated 68-product / 24-category / 18-headphones authority", () => {
    const ledger = read<any>("progress-ledger.json");
    expect(ledger.catalogAuthority).toMatchObject({ productCount: 68, categoryCount: 24, headphonesCount: 18 });
    expect(ledger.categories).toHaveLength(24);
    expect(ledger.categories.reduce((sum: number, row: any) => sum + row.productCount, 0)).toBe(68);
  });

  it("records Amazon API unavailability once without blocking technical or XPY readiness", () => {
    const status = read<any>("amazon-channel-status.json");
    const ledger = read<any>("progress-ledger.json");
    expect(status).toMatchObject({ status: "BLOCKED_EXTERNAL_ACQUISITION_CHANNEL", recordedOnce: true, attemptedInThisRun: false });
    expect(ledger.statuses).toEqual({ TECHNICAL_CATALOG_READY: true, XPY_READY: true, AMAZON_COVERAGE_INCOMPLETE: true });
  });

  it("maintains a complete 24x16 matrix and terminal disposition for every retained observation", () => {
    const matrix = read<any[]>("category-24x16-matrix.json");
    const packs = read<any[]>("domain-packs.json");
    expect(matrix).toHaveLength(24 * 16);
    expect(new Set(matrix.map((cell) => cell.categoryId)).size).toBe(24);
    for (const pack of packs) {
      expect(pack.observations).toHaveLength(pack.retainedObservationCount);
      expect(pack.observations.every((row: any) => row.terminalState.startsWith("RETAINED_"))).toBe(true);
    }
  });

  it("asks only questions backed by a fact on the current candidate", () => {
    const packs = read<any[]>("domain-packs.json");
    for (const observation of packs.flatMap((pack) => pack.observations)) {
      const factKeys = new Set(observation.facts.map((fact: any) => fact.key));
      expect(observation.materialQuestions.every((question: any) => factKeys.has(question.evidenceFactKey))).toBe(true);
      expect(observation.materialQuestions.every((question: any) => question.askOnlyWhenCandidatesDiffer)).toBe(true);
    }
  });

  it("keeps Amazon commerce effects disabled and approval consolidated", () => {
    const packs = read<any[]>("domain-packs.json");
    const approval = read<any>("consolidated-owner-approval-package.json");
    expect(packs.flatMap((pack) => pack.observations).every((row: any) => row.commerce === "DISABLED_NO_APPROVED_OFFER_BINDING")).toBe(true);
    expect(approval.decision).toBe("PENDING_ONE_CONSOLIDATED_DIGEST_SPECIFIC_OWNER_APPROVAL");
    expect(approval.counts.matrixCells).toBe(384);
  });
});
