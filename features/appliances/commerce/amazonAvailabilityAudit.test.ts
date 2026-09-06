import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type Status = "EXACT_ACTIVE_LISTING_CONFIRMED" | "EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE" | "AMBIGUOUS_OR_FAMILY_ONLY" | "NOT_FOUND" | "BLOCKED_OR_UNVERIFIABLE";
type Row = { readonly productId: string; readonly categoryId: string; readonly status: Status; readonly asin: string | null; readonly observedAmazonUrl: string | null; readonly exactMatchEvidence: readonly string[] };

const root = process.cwd();
const audit = JSON.parse(readFileSync(path.join(root, "data/research/appliances-amazon-commerce-readiness-01/availability-audit.json"), "utf8")) as { auditDigest: string; overall: Record<Status, number>; categories: readonly { categoryId: string; productCount: number }[]; rows: readonly Row[]; scopeAuthority: { commerceSnapshotDigest: string }; hypothesisVerdict: { verdict: string } };
const pointer = JSON.parse(readFileSync(path.join(root, "data/production/appliances/commerce/current.json"), "utf8")) as { snapshotFile: string; snapshotDigest: string };
const snapshot = JSON.parse(readFileSync(path.join(root, "data/production/appliances/commerce", pointer.snapshotFile), "utf8")) as { productScope: readonly { exactProductId: string; categoryId: string }[] };

describe("97-product Amazon availability audit", () => {
  it("covers every active exact product and all 24 categories once", () => {
    expect(audit.rows).toHaveLength(97);
    expect(audit.categories).toHaveLength(24);
    expect(new Set(audit.rows.map(row => row.productId)).size).toBe(97);
    expect(audit.scopeAuthority.commerceSnapshotDigest).toBe(pointer.snapshotDigest);
    expect(audit.auditDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(audit.rows.map(row => `${row.categoryId}:${row.productId}`).sort()).toEqual(snapshot.productScope.map(row => `${row.categoryId}:${row.exactProductId}`).sort());
  });

  it("uses only bounded statuses and preserves explicit uncertainty", () => {
    expect(audit.overall).toEqual({ EXACT_ACTIVE_LISTING_CONFIRMED: 10, EXACT_LISTING_SEEN_CURRENTLY_UNAVAILABLE: 11, AMBIGUOUS_OR_FAMILY_ONLY: 15, NOT_FOUND: 61, BLOCKED_OR_UNVERIFIABLE: 0 });
    expect(Object.values(audit.overall).reduce((sum, value) => sum + value, 0)).toBe(97);
    expect(audit.hypothesisVerdict.verdict).toBe("REJECTED");
  });

  it("requires a canonical ASIN target and exact evidence for confirmed rows", () => {
    const exactRows = audit.rows.filter(row => row.status.startsWith("EXACT_"));
    expect(exactRows).toHaveLength(21);
    for (const row of exactRows) {
      expect(row.asin).toMatch(/^[A-Z0-9]{10}$/u);
      expect(row.observedAmazonUrl).toBe(`https://www.amazon.com.tr/dp/${row.asin}`);
      expect(row.exactMatchEvidence.length).toBeGreaterThanOrEqual(2);
    }
  });
});
