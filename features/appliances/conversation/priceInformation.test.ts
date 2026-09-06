import { beforeAll, describe, expect, it } from "vitest";
import { createFileSystemAppliancesArtifactRepository } from "../authority/loader.server";
import type { AppliancesProductType } from "../contracts";
import { enterAppliancesDepartment } from "../entry.server";
import { MemoryAppliancesConversationStore } from "../persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "../persistence/service";
import { loadRecommendationAuthority, type RecommendationAuthority } from "../recommendation/current.server";
import { isAppliancesPriceInformationRequest, isSoftCheapPreferenceWithoutMaximum, runAppliancesPriceInformationTurn } from "./priceInformation.server";

const now = new Date("2026-09-03T06:00:00Z");
let bundle: RecommendationAuthority;
beforeAll(async () => { bundle = await loadRecommendationAuthority(process.cwd(), now); });

async function stateFor(productType: AppliancesProductType) {
  const store = new MemoryAppliancesConversationStore();
  const entry = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()), productType, now });
  if (entry.status !== "READY") throw new Error(entry.status);
  const state = { ...entry.state, revision: 1, lastQuestionKey: productType === "WASHING_MACHINE" ? "appliances.wm.remoteControl.requirement" : undefined };
  await commitAppliancesBootstrap({ store, state, messageId: "create", payload: "create" });
  return { store, state };
}

describe("shared Appliances price-information precedence", () => {
  it("distinguishes direct questions, soft cheap language and explicit maximums", () => {
    expect(isAppliancesPriceInformationRequest("katalogdaki en ucuz hangisi?")).toBe(true);
    expect(isSoftCheapPreferenceWithoutMaximum("en ucuz model olsun")).toBe(true);
    expect(isSoftCheapPreferenceWithoutMaximum("mümkün olduğunca uygun fiyatlı olsun")).toBe(true);
    expect(isSoftCheapPreferenceWithoutMaximum("üst sınırım 20.000 TL")).toBe(false);
    expect(isSoftCheapPreferenceWithoutMaximum("bütçemi karar filtresi yap, üst sınırım 20 bin")).toBe(false);
  });

  it("preserves pending state, replay and payload conflict for a WM price answer", async () => {
    const { store, state } = await stateFor("WASHING_MACHINE");
    const input = { store, conversationId: state.conversationId, messageId: "price", expectedRevision: 1, message: "katalogdaki en ucuz hangisi?", now, washingMachineAuthority: bundle };
    const first = await runAppliancesPriceInformationTurn(input);
    expect(first).toMatchObject({ status: "OK", state: { revision: 2, lastQuestionKey: "appliances.wm.remoteControl.requirement", ledger: [] }, outcome: { kind: "RESPOND", contextMutation: "NONE" } });
    expect(await runAppliancesPriceInformationTurn(input)).toMatchObject({ status: "OK", replayed: true });
    expect(await runAppliancesPriceInformationTurn({ ...input, message: "en düşük fiyat ne kadar?" })).toEqual({ status: "MESSAGE_PAYLOAD_CONFLICT" });
  });

  it.each(["DRYER", "REFRIGERATOR", "DISHWASHER", "VACUUM", "ROBOT_VACUUM"] as const)("returns bounded unavailable information for %s", async (productType) => {
    const { store, state } = await stateFor(productType);
    const result = await runAppliancesPriceInformationTurn({ store, conversationId: state.conversationId, messageId: "price", expectedRevision: 1, message: "katalogdaki en ucuz hangisi?", now });
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" }, state: { ledger: [], budgetMode: "NEEDS_ONLY" } });
    if (result?.status === "OK" && "message" in result.outcome) expect(result.outcome.message).toContain("doğrulanmış güncel fiyat projeksiyonu bu sürümde yok");
  });

  it("fails closed as a bounded RESPOND when WM prices are stale", async () => {
    const stale = await loadRecommendationAuthority(process.cwd(), new Date("2026-09-05T06:00:00Z"));
    const { store, state } = await stateFor("WASHING_MACHINE");
    const result = await runAppliancesPriceInformationTurn({ store, conversationId: state.conversationId, messageId: "stale", expectedRevision: 1, message: "en ucuz hangisi?", now, washingMachineAuthority: stale });
    expect(result).toMatchObject({ status: "OK", outcome: { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" } });
    if (result?.status === "OK" && "message" in result.outcome) expect(result.outcome.message).toContain("güncel ve kullanılabilir değil");
  });
});
