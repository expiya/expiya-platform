import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { PostgresPaidReportSalesHandoffRepository } from "./salesHandoff.server";

describe("paid report sales handoff", () => {
  it("issues an opaque short-lived token only for a paid report vehicle", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ order_id: "order", quote_id: "quote", conversation_id: "conversation", decision_id: "decision", catalog_release_version: "1", catalog_fingerprint: "fp", approved_needs: [] }] })
      .mockResolvedValueOnce({});
    const token = await new PostgresPaidReportSalesHandoffRepository({ query }).issue({ accessTokenHash: "a".repeat(64), exactVariantId: "variant", intent: "REQUEST_QUOTE", now: new Date("2026-08-29T10:00:00Z") });
    expect(token).toMatch(/^p3r_[A-Za-z0-9_-]{43}$/u);
    expect(query.mock.calls[0]?.[1]).toEqual(["a".repeat(64), "variant"]);
    expect(query.mock.calls[1]?.[1]?.[0]).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(query.mock.calls[1]?.[1])).not.toContain(token);
    expect(query.mock.calls[1]?.[1]?.at(-1)).toBe("2026-08-29T10:30:00.000Z");
  });
});
