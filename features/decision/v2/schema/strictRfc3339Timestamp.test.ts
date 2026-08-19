import { describe, expect, it } from "vitest";
import { isStrictRfc3339Timestamp, parseStrictRfc3339Instant, strictRfc3339TimestampSchema, validateCatalogTemporalInvariant } from "./strictRfc3339Timestamp";

describe("strict RFC 3339 timestamp policy", () => {
  it.each(["2026-08-20T12:00:00.000Z", "2026-08-20T12:00:00Z", "2026-08-20T15:00:00.000+03:00", "2026-08-20T09:00:00-03:00"])("accepts %s", (value) => expect(strictRfc3339TimestampSchema.safeParse(value).success).toBe(true));
  it.each(["2026-08-20T15:00:00", "2026-08-19 15:00:00+03:00", "2026/08/19T15:00:00+03:00", "2026-13-19T15:00:00+03:00", "2026-02-30T15:00:00+03:00", "2026-08-20T24:00:00+03:00", "2026-08-20T15:60:00+03:00", "2026-08-20T15:00:60+03:00", "2026-08-20T15:00:00+3:00", "2026-08-20T15:00:00+0300", "2026-08-20T15:00:00+24:00", "2026-08-20T15:00:00+03:60", "2026-08-20T15:00:00+03:00 ", "x2026-08-20T15:00:00+03:00", "NaN"])("rejects %s", (value) => expect(isStrictRfc3339Timestamp(value)).toBe(false));
  it("treats Z and +03:00 representations of the same instant as equal", () => expect(parseStrictRfc3339Instant("2026-08-20T12:00:00.000Z")).toBe(parseStrictRfc3339Instant("2026-08-20T15:00:00.000+03:00")));
  it("validates temporal ordering by instant rather than lexicographic form", () => {
    expect(validateCatalogTemporalInvariant({ stagingAt: "2026-08-20T12:00:00Z", approvalAt: "2026-08-20T15:00:00+03:00", effectiveAt: "2026-08-20T12:01:00Z", activatedAt: "2026-08-20T15:02:00+03:00", evaluationAt: "2026-08-20T12:03:00Z" })).toEqual([]);
    expect(validateCatalogTemporalInvariant({ stagingAt: "2026-08-20T12:01:00Z", approvalAt: "2026-08-20T12:00:00Z", effectiveAt: "2026-08-20T12:02:00Z", activatedAt: "2026-08-20T12:03:00Z", evaluationAt: "2026-08-20T12:04:00Z" })).toContain("TEMPORAL_INVARIANT_VIOLATION");
  });
});
