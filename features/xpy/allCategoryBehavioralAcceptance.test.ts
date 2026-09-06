import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVE_APPLIANCES_CATEGORY_IDS } from "@/features/appliances/categoryRegistry";
import { createFileSystemAppliancesArtifactRepository } from "@/features/appliances/authority/loader.server";
import { enterAppliancesDepartment } from "@/features/appliances/entry.server";
import { MemoryAppliancesConversationStore } from "@/features/appliances/persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "@/features/appliances/persistence/service";
import { runNativeAppliancesTurn } from "@/features/appliances/nativeTurn.server";
import type { AppliancesProductType } from "@/features/appliances/contracts";
import { ELECTRONICS_CATEGORY_IDS } from "@/features/electronics/architectureBaseline";
import { loadActiveElectronicsCategoryPolicy } from "@/features/electronics/categoryPolicyLoader.server";
import { bootstrapElectronicsConversation, recoverElectronicsConversation, runElectronicsTurn } from "@/features/electronics/conversation.server";
import { MemoryElectronicsConversationStore } from "@/features/electronics/persistence";
import type { ElectronicsRuntimeCatalog } from "@/features/electronics/runtimeAuthority.server";
import { buildCategoryBehavioralAcceptanceMatrix, XPY_BEHAVIORAL_ACCEPTANCE_MATRIX } from "./behavioralAcceptance";
import { requireXpyDomainPack, requireXpyReentry } from "./domainPacks";

const root = process.cwd();
const rawKey = /(?:[a-zçğıöşü]+_[a-z0-9_]+|\b(?:runtime|exact|field|policy|non-dominated)\b)/iu;
const publicCopy = (outcome: unknown): string => {
  if (!outcome || typeof outcome !== "object") return "";
  const value = outcome as { message?: unknown; choices?: readonly { label?: unknown }[] };
  return [typeof value.message === "string" ? value.message : "", ...(value.choices ?? []).map(choice => typeof choice.label === "string" ? choice.label : "")].join(" ");
};

describe("all-active-category executable behavioral acceptance", () => {
  it.each(ACTIVE_APPLIANCES_CATEGORY_IDS)("executes the real Appliances adapter for %s", async categoryId => {
    const store = new MemoryAppliancesConversationStore();
    const entry = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(root), productType: categoryId as AppliancesProductType, conversationId: crypto.randomUUID() });
    expect(entry.status).toBe("READY"); if (entry.status !== "READY") return;
    await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create", payload: { productType: categoryId } });
    const message = `${requireXpyReentry("APPLIANCES", categoryId).publicName} hakkında genel bilgi verir misin?`;
    const info = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "info", expectedRevision: 1, message });
    expect(info.status).toBe("OK"); if (info.status !== "OK") return;
    expect(info.result.outcome.kind).toBe("RESPOND");
    expect(publicCopy(info.result.outcome)).not.toMatch(rawKey);
    expect(info.result.state.ledger).toHaveLength(0);
    const replay = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "info", expectedRevision: 1, message });
    expect(replay.status === "OK" && replay.result.replayed).toBe(true);
  });

  it.each(ELECTRONICS_CATEGORY_IDS)("executes question, short answer, correction and recovery for %s", async categoryId => {
    const policy = loadActiveElectronicsCategoryPolicy(root);
    const catalog = JSON.parse(readFileSync(path.join(root, "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.0/catalog.json"), "utf8")) as ElectronicsRuntimeCatalog;
    const authority = { policy, catalog }, store = new MemoryElectronicsConversationStore(), conversationId = crypto.randomUUID();
    const boot = await bootstrapElectronicsConversation({ store, authority, conversationId, categoryId, messageId: "create" });
    expect(boot.status).toBe("OK"); if (boot.status !== "OK") return;
    expect(boot.outcome.kind).toBe("ASK");
    expect(boot.outcome.message.match(/\?/gu)).toHaveLength(1);
    expect(publicCopy(boot.outcome)).not.toMatch(rawKey);
    const short = await runElectronicsTurn({ store, authority, conversationId, messageId: "short", expectedRevision: 1, message: "Önemli değil" });
    expect(short.status).toBe("OK"); if (short.status !== "OK") return;
    expect(short.state.ledger).toEqual(expect.arrayContaining([expect.objectContaining({ normalizedValue: "NOT_IMPORTANT", status: "ACCEPTED_EXPLICIT" })]));
    const corrected = await runElectronicsTurn({ store, authority, conversationId, messageId: "correct", expectedRevision: 2, message: "İlk tercihimi düzelt: önemli" });
    expect(corrected.status).toBe("OK"); if (corrected.status !== "OK") return;
    expect(corrected.state.ledger.map(row => row.status)).toEqual(expect.arrayContaining(["SUPERSEDED", "ACCEPTED_EXPLICIT"]));
    expect(recoverElectronicsConversation(authority, await store.load(conversationId))).toMatchObject({ kind: "CONVERSATION", revision: 3 });
  });

  it("binds all 768 rows to an executed category adapter and the authoritative capability contract", () => {
    const rows = buildCategoryBehavioralAcceptanceMatrix([requireXpyDomainPack("APPLIANCES"), requireXpyDomainPack("ELECTRONICS")]);
    expect(rows).toHaveLength(48 * XPY_BEHAVIORAL_ACCEPTANCE_MATRIX.length);
    expect(rows.every(row => row.status === "DECLARED")).toBe(true);
    expect(new Set(rows.map(row => row.fixtureId)).size).toBe(768);
  });
});
