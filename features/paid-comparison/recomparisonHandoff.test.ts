import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PostgresPaidRecomparisonHandoffRepository } from "./recomparisonHandoff.server";

describe("paid report recomparison handoff", () => {
  it("issues an opaque two-hour handoff only from an active vehicle entitlement", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [{ order_id: "order", conversation_id: "conversation", catalog_release_version: "release", catalog_fingerprint: "sha256:catalog", approved_needs: [] }] }).mockResolvedValueOnce({});
    const token = await new PostgresPaidRecomparisonHandoffRepository({ query }).issue({ accessTokenHash: "a".repeat(64), exactVariantId: "variant", now: new Date("2026-08-30T10:00:00Z") });
    expect(token).toMatch(/^p2r_[A-Za-z0-9_-]{43}$/u);
    expect(query.mock.calls[0]?.[1]).toEqual(["a".repeat(64), "variant"]);
    expect(query.mock.calls[1]?.[1]?.[0]).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(query.mock.calls[1]?.[1])).not.toContain(token);
    expect(query.mock.calls[1]?.[1]?.at(-1)).toBe("2026-08-30T12:00:00.000Z");
  });
});
