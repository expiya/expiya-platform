import { describe, expect, it } from "vitest";
import { createFileSystemAppliancesArtifactRepository } from "../authority/loader.server";
import { loadActiveBoundedAuthority, type BoundedProductType } from "../bounded/authority.server";
import { runBoundedConversationTurn } from "../bounded/conversation.server";
import { enterAppliancesDepartment } from "../entry.server";
import { MemoryAppliancesConversationStore } from "../persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "../persistence/service";

const categories: readonly BoundedProductType[] = ["FULLY_AUTOMATIC_ESPRESSO_MACHINE", "MANUAL_ESPRESSO_MACHINE", "FILTER_COFFEE_MACHINE", "TURKISH_COFFEE_MACHINE"];
describe("Batch C public runtime authority", () => {
  it.each(categories)("loads, admits and completes deterministic Y/card authorization for %s", async categoryId => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), categoryId);
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.snapshot.pack.products).toHaveLength(3);
    expect(new Set(loaded.snapshot.pack.products.map(product => product.brand)).size).toBeGreaterThanOrEqual(2);
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    const entered = await enterAppliancesDepartment({ repository, productType: categoryId, conversationId: crypto.randomUUID(), now: new Date(0) });
    expect(entered.status).toBe("READY");
    if (entered.status !== "READY") return;
    const store = new MemoryAppliancesConversationStore();
    await commitAppliancesBootstrap({ store, state: entered.state, messageId: "create", payload: { productType: categoryId } });
    const acknowledged = await runBoundedConversationTurn({ store, authority: loaded.snapshot, conversationId: entered.state.conversationId, messageId: "m1", expectedRevision: 1, message: "gerek yok", now: new Date(1) });
    expect(acknowledged.status).toBe("OK");
    if (acknowledged.status !== "OK") return;
    const minimumWidth = Math.min(...loaded.snapshot.pack.products.map(product => Number(product.technicalFacts.widthMm)));
    const narrowed = await runBoundedConversationTurn({ store, authority: loaded.snapshot, conversationId: entered.state.conversationId, messageId: "m2", expectedRevision: acknowledged.state.revision, message: `genişlik en fazla ${minimumWidth} mm`, now: new Date(2) });
    expect(narrowed.status).toBe("OK");
    if (narrowed.status !== "OK") return;
    if (categoryId === "MANUAL_ESPRESSO_MACHINE") expect(narrowed.outcome.kind).toBe("CLARIFY");
    else expect(narrowed.outcome).toMatchObject({ kind: "DECISION_READY", card: { price: { status: "UNAVAILABLE" }, provenance: { catalog: { release: loaded.snapshot.releaseVersion } } } });
  });
});
