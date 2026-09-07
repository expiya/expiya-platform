import { describe, expect, it } from "vitest";
import { auditWave02Exact15UnifiedRuntimeConsumer } from "./audit";

describe("Wave-02 exact-15 unified runtime consumer", () => {
  it("fails closed on semantic exact-identity duplication", async () => {
    const result = await auditWave02Exact15UnifiedRuntimeConsumer();
    expect(result.status).toBe("BLOCKED_EXACT_IDENTITY_DUPLICATE_FAIL_CLOSED");
    expect(result.identityAudit).toMatchObject({ proposedAdditions: 15, uniqueProductIds: 15, semanticCollisionCount: 1, safeUniqueAdditions: 14 });
    expect(result.identityAudit.collisions[0]).toMatchObject({ categoryId: "REFRIGERATOR", addition: { model: "GC-B569NLLM" }, existing: { model: "GC-B569NLLM" } });
  });

  it("does not silently reduce or mutate the approved overlay", async () => {
    const first = await auditWave02Exact15UnifiedRuntimeConsumer(), second = await auditWave02Exact15UnifiedRuntimeConsumer();
    expect(first).toEqual(second);
    expect(first.blockingDecision).toMatchObject({ partialApplicationForbidden: true, exact15ApprovalCannotAuthorize14PlusAlias: true, activeOverlayMustRemainRuntimeUnconsumed: true });
    expect(first.runtimeReady).toBe(false);
    expect(first.integrationManifest).toBeNull();
    expect(first.pushPreviewApprovalSentence).toBeNull();
    expect(Object.values(first.preservation).filter(value => typeof value === "boolean").every(value => value === false)).toBe(true);
  });
});
