import { describe, expect, it } from "vitest";
import { createDevPaidComparisonHandoff, openDevPaidComparisonHandoff } from "./devFixture.server";

describe("paid comparison local fixture handoff", () => {
  it("binds the selected exact variant and catalog authority", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const token = createDevPaidComparisonHandoff({ exactVariantId: "variant-1", bodyStyle: "SUV", catalogRelease: "0.55.4", catalogFingerprint: "sha256:test", now });
    const opened = openDevPaidComparisonHandoff(token, new Date("2026-08-29T12:10:00.000Z"));
    expect(opened.handoff).toMatchObject({ selectedExactVariantId: "variant-1", catalogRelease: "0.55.4", catalogFingerprint: "sha256:test" });
  });

  it("rejects modification and expiry", () => {
    const now = new Date("2026-08-29T12:00:00.000Z");
    const token = createDevPaidComparisonHandoff({ exactVariantId: "variant-1", bodyStyle: "SUV", catalogRelease: "0.55.4", catalogFingerprint: "sha256:test", now });
    expect(() => openDevPaidComparisonHandoff(`${token}x`, now)).toThrow("PAID_COMPARISON_DEV_FIXTURE_INVALID");
    expect(() => openDevPaidComparisonHandoff(token, new Date("2026-08-29T14:00:01.000Z"))).toThrow("PAID_COMPARISON_DEV_FIXTURE_STALE");
  });
});
