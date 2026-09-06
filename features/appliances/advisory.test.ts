import { describe, expect, it } from "vitest";
import { appliancesAdvisoryPlan } from "./advisory";
import { APPLIANCES_PRODUCT_TYPES, type AppliancesConversationState, type AppliancesProductType } from "./contracts";
import { appliancesXInterruption } from "./xpyAssistant";
import { createFileSystemAppliancesArtifactRepository } from "./authority/loader.server";
import { enterAppliancesDepartment } from "./entry.server";
import { MemoryAppliancesConversationStore } from "./persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "./persistence/service";
import { runNativeAppliancesTurn } from "./nativeTurn.server";

const labels: Readonly<Record<AppliancesProductType, string>> = {
  WASHING_MACHINE: "Çamaşır makinesi", DRYER: "Kurutma makinesi", REFRIGERATOR: "Buzdolabı",
  DISHWASHER: "Bulaşık makinesi", VACUUM: "Süpürge", ROBOT_VACUUM: "Robot süpürge",
  FREEZER:"Derin dondurucu", BUILT_IN_OVEN:"Ankastre fırın", FREESTANDING_COOKER:"Solo fırınlı ocak", HOB:"Ankastre ocak", RANGE_HOOD:"Davlumbaz",
  COUNTERTOP_MICROWAVE_OVEN:"Tezgâh üstü mikrodalga", BUILT_IN_MICROWAVE_OVEN:"Ankastre mikrodalga", AIR_PURIFIER:"Hava temizleyici",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE:"Tam otomatik espresso makinesi", MANUAL_ESPRESSO_MACHINE:"Manuel espresso makinesi", FILTER_COFFEE_MACHINE:"Filtre kahve makinesi", TURKISH_COFFEE_MACHINE:"Türk kahvesi makinesi",
  AIR_FRYER:"Airfryer", BLENDER:"Blender", FOOD_PROCESSOR:"Mutfak robotu", ELECTRIC_STORAGE_WATER_HEATER:"Elektrikli termosifon", INSTANTANEOUS_ELECTRIC_WATER_HEATER:"Elektrikli şofben",
  SPLIT_AIR_CONDITIONER:"Ev tipi split klima",
};

const choices: Readonly<Record<AppliancesProductType, string>> = {
  WASHING_MACHINE: "2 kişiyiz", DRYER: "8 kg", REFRIGERATOR: "Dondurucu altta olsun",
  DISHWASHER: "Otomatik kapı açma zorunlu", VACUUM: "Evcil hayvan başlığı zorunlu", ROBOT_VACUUM: "Otomatik toz boşaltma zorunlu",
  FREEZER:"gerek yok", BUILT_IN_OVEN:"gerek yok", FREESTANDING_COOKER:"gerek yok", HOB:"gerek yok", RANGE_HOOD:"gerek yok",
  COUNTERTOP_MICROWAVE_OVEN:"gerek yok", BUILT_IN_MICROWAVE_OVEN:"gerek yok", AIR_PURIFIER:"gerek yok",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE:"gerek yok", MANUAL_ESPRESSO_MACHINE:"gerek yok", FILTER_COFFEE_MACHINE:"gerek yok", TURKISH_COFFEE_MACHINE:"gerek yok",
  AIR_FRYER:"gerek yok", BLENDER:"gerek yok", FOOD_PROCESSOR:"gerek yok", ELECTRIC_STORAGE_WATER_HEATER:"Yetkili servis elektrik tesisat ve montaj koşullarını doğruladı", INSTANTANEOUS_ELECTRIC_WATER_HEATER:"Yetkili servis elektrik tesisat ve montaj koşullarını doğruladı",
  SPLIT_AIR_CONDITIONER:"Yetkili iklimlendirme uzmanı exact çift için oda ısı yükü elektrik soğutucu borulama drenaj ve montaj koşullarını doğruladı",
};

const state = (productType: AppliancesProductType): AppliancesConversationState => ({
  conversationId: crypto.randomUUID(), schemaVersion: "appliances-conversation/v1", revision: 1, departmentId: "APPLIANCES", productType,
  pinnedCatalogRelease: "test", pinnedCatalogDigest: "test", pinnedSemanticVersion: "test", pinnedSemanticDigest: "test",
  intentState: "PRODUCT_TYPE_RESOLVED", ledger: [], askedQuestionKeys: [], personaSignals: [], ended: false,
  createdAt: "2026-09-04T00:00:00.000Z", updatedAt: "2026-09-04T00:00:00.000Z",
});

describe("Appliances X advisory parity", () => {
  it.each(APPLIANCES_PRODUCT_TYPES)("uses safe pack-owned orientation and a material non-installation start for %s", productType => {
    const plan = appliancesAdvisoryPlan(productType);
    expect(plan.advisory).toMatchObject({ kind: "DOMAIN_ORIENTATION", source: "DOMAIN_PACK", contextMutation: "NONE" });
    expect(plan.question.match(/\?/gu)).toHaveLength(1);
    if (!productType.endsWith("WATER_HEATER")) expect(plan.questionKey).not.toMatch(/installation|\.fit$|budget/iu);
    expect(JSON.stringify(plan)).not.toMatch(/semantic key|authority|taxonomy|candidate|exact/iu);
    expect(`${plan.advisory.message} ${plan.intentQuestion}`).toMatch(/Tabii[\s\S]*yalnızca bilgi[\s\S]*kendi kullanımın/iu);
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("keeps pure education X-only for %s", productType => {
    const initial = state(productType);
    const turn = appliancesXInterruption(initial, "info", `${labels[productType]} hakkında genel bilgi verir misin?`);
    expect(turn?.outcome).toMatchObject({ kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" });
    expect(turn?.events).toEqual([]);
    expect(turn?.state.ledger).toEqual(initial.ledger);
    expect(turn?.state.lastQuestionKey).toBeUndefined();
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("answers general buyer guidance before any personal planner field for %s", productType => {
    const initial = state(productType);
    const turn = appliancesXInterruption(initial, "guidance", `${labels[productType]} alırken en çok neye dikat etmek gerekir?`);
    expect(turn?.outcome).toMatchObject({ kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" });
    expect(turn?.events).toEqual([]);
    expect(turn?.state.ledger).toEqual([]);
    expect(turn?.state.lastQuestionKey).toBeUndefined();
    if (turn?.outcome.kind === "RESPOND") {
      expect(turn.outcome.message).toMatch(/Tabii.*yalnızca bilgi.*kendi kullanımın/iu);
      expect(turn.outcome.message).not.toMatch(/Uygulamadan uzaktan kontrol özelliği istiyor musun|kesin genişlik sınırı|kaç kg.*ihtiyacın var/iu);
    }
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("keeps general buyer guidance X-only through the native runtime for %s", async productType => {
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    const store = new MemoryAppliancesConversationStore();
    const entry = await enterAppliancesDepartment({ repository, productType, conversationId: crypto.randomUUID() });
    if (entry.status !== "READY") throw new Error(entry.status);
    await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create-guidance", payload: { productType } });
    const turn = await runNativeAppliancesTurn({
      store,
      conversationId: entry.state.conversationId,
      messageId: "guidance",
      expectedRevision: 1,
      message: `${labels[productType]} alırken en çok neye dikat etmek gerekir?`,
    });
    expect(turn.status).toBe("OK");
    if (turn.status !== "OK") return;
    expect(turn.result.outcome).toMatchObject({ kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", contextMutation: "NONE" });
    expect(turn.result.state.ledger).toEqual([]);
    expect(turn.result.state.lastQuestionKey).toBeUndefined();
    if (turn.result.outcome.kind === "RESPOND") expect(turn.result.outcome.message).toMatch(/Tabii.*yalnızca bilgi.*kendi kullanımın/iu);
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("combines X orientation with exactly one P question for mixed education and purchase in %s", productType => {
    const initial = state(productType);
    const turn = appliancesXInterruption(initial, "mixed", `${labels[productType]} hakkında genel bilgi istiyorum ve satın almak istiyorum`);
    expect(turn?.outcome).toMatchObject({ kind: "ASK", advisory: { contextMutation: "NONE" } });
    expect(turn?.events).toEqual([]);
    expect(turn?.state.ledger).toEqual([]);
    if (turn?.outcome.kind === "ASK") expect(turn.outcome.message.match(/\?/gu)).toHaveLength(1);
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("accepts a novice turn and a structured option through the native runtime for %s", async productType => {
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    const store = new MemoryAppliancesConversationStore();
    const entry = await enterAppliancesDepartment({ repository, productType, conversationId: crypto.randomUUID() });
    if (entry.status !== "READY") throw new Error(entry.status);
    await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create", payload: { productType } });
    const novice = productType === "DRYER" ? "urutma makinleri hakkında hiç bilgim yok. yardımcı ol." : `${labels[productType]} hakkında hiçbir şey bilmiyorum, nerden baslamaliyim`;
    const first = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "novice", expectedRevision: 1, message: novice });
    expect(first.status).toBe("OK"); if (first.status !== "OK") return;
    expect(first.result.outcome).toMatchObject({ kind: "ASK", advisory: { source: "DOMAIN_PACK", contextMutation: "NONE" } });
    expect(first.result.state.ledger).toEqual([]);
    expect(first.result.state.lastQuestionKey).toBe("xpy.advisory.purchaseInterest");
    if (first.result.outcome.kind !== "ASK") return;
    const optedIn = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "opt-in", expectedRevision: first.result.state.revision, message: "client display text is ignored", choice: { questionKey: first.result.outcome.questionKey, values: ["Kendi kullanımım için ürün seçmek istiyorum"] } });
    expect(optedIn.status).toBe("OK"); if (optedIn.status !== "OK" || optedIn.result.outcome.kind !== "ASK") return;
    expect(optedIn.result.state.ledger).toEqual([]);
    expect(optedIn.result.outcome.questionKey).toBe(appliancesAdvisoryPlan(productType).questionKey);
    const second = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "choice", expectedRevision: optedIn.result.state.revision, message: "client display text is ignored", choice: { questionKey: optedIn.result.outcome.questionKey, values: [choices[productType]] } });
    expect(second.status).toBe("OK");
    if (second.status === "OK") expect(second.result.state.ledger.length).toBeGreaterThan(0);
  });

  it.each(APPLIANCES_PRODUCT_TYPES)("accepts the equivalent free-text answer through the native runtime for %s", async productType => {
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    const store = new MemoryAppliancesConversationStore();
    const entry = await enterAppliancesDepartment({ repository, productType, conversationId: crypto.randomUUID() });
    if (entry.status !== "READY") throw new Error(entry.status);
    await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create", payload: { productType } });
    const first = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "novice", expectedRevision: 1, message: `${labels[productType]} seçmeyi bilmiorum, yardm edermisin` });
    expect(first.status).toBe("OK"); if (first.status !== "OK") return;
    const optedIn = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "opt-in", expectedRevision: first.result.state.revision, message: "Kendi kullanımım için ürün seçmek istiyorum" });
    expect(optedIn.status).toBe("OK"); if (optedIn.status !== "OK") return;
    const typed = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: "typed", expectedRevision: optedIn.result.state.revision, message: choices[productType] });
    expect(typed.status).toBe("OK");
    if (typed.status === "OK") expect(typed.result.state.ledger.length).toBeGreaterThan(0);
  });
});
