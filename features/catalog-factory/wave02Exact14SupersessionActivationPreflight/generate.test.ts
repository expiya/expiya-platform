import { describe, expect, it } from "vitest";
import { generateWave02Exact14SupersessionActivationPreflight } from "./generate";

describe("Exact-14 supersession activation preflight", () => {
  it("passes deterministically without activating", async () => {
    const first = await generateWave02Exact14SupersessionActivationPreflight(), second = await generateWave02Exact14SupersessionActivationPreflight();
    expect(first).toEqual(second);
    expect(first.preflight.status).toBe("PASS_NOT_ACTIVATED");
    expect(Object.values(first.preflight.gates).every(Boolean)).toBe(true);
    expect(first.preflight.proposed.totals).toEqual({ before: 80, additions: 14, active: 94 });
    expect(Object.values(first.preflight.scope).filter(value => typeof value === "boolean").every(value => value === false)).toBe(true);
  });

  it("binds CAS and byte-identical rollback to old exact-15 pointer", async () => {
    const result = await generateWave02Exact14SupersessionActivationPreflight();
    expect(result.proposedPointer.compareAndSwap).toMatchObject({ expectedPointerSha256: "f8d7aad75c5eb0610e6a782ffa0a70b67a55e2ec08d12fe71972bb3d738a799a", expectedOverlayDigest: "8961121fdb13872fe2d153dc9db35aa600c72ab11771d79f25e64d9b8924a643" });
    expect(result.rollback.proof).toEqual({ bytesRoundTrip: true, digestRoundTrip: true });
    expect(result.activationTemplate).toMatchObject({ status: "TEMPLATE_NOT_EXECUTED", runtimeEffect: 0, databaseMigration: "NONE", deployment: false, push: false });
  });
});
