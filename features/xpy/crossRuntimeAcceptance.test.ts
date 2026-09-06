import { afterEach, describe, expect, it } from "vitest";
import { runV3Turn } from "@/features/decision/v3/engine.server";
import { createFileSystemAppliancesArtifactRepository } from "@/features/appliances/authority/loader.server";
import { enterAppliancesDepartment } from "@/features/appliances/entry.server";
import { MemoryAppliancesConversationStore } from "@/features/appliances/persistence/memoryStore.testSupport";
import { commitAppliancesBootstrap } from "@/features/appliances/persistence/service";
import { runNativeAppliancesTurn } from "@/features/appliances/nativeTurn.server";
import type { AppliancesProductType } from "@/features/appliances/contracts";

type Family = "NOVICE" | "INFORMATION" | "CATEGORY_GUIDANCE" | "MIXED" | "OFF_TOPIC";
type StructuralOutcome = { readonly advisory: boolean; readonly decisionWrites: number; readonly question: "INTENT" | "MATERIAL" | "NONE" };
const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

const applianceLabels: Readonly<Record<AppliancesProductType, string>> = {
  WASHING_MACHINE: "çamaşır makinesi", DRYER: "kurutma makinesi", REFRIGERATOR: "buzdolabı",
  DISHWASHER: "bulaşık makinesi", VACUUM: "süpürge", ROBOT_VACUUM: "robot süpürge",
  FREEZER:"derin dondurucu", BUILT_IN_OVEN:"ankastre fırın", FREESTANDING_COOKER:"solo fırınlı ocak", HOB:"ankastre ocak", RANGE_HOOD:"davlumbaz",
  COUNTERTOP_MICROWAVE_OVEN:"tezgâh üstü mikrodalga", BUILT_IN_MICROWAVE_OVEN:"ankastre mikrodalga", AIR_PURIFIER:"hava temizleyici",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE:"tam otomatik espresso makinesi", MANUAL_ESPRESSO_MACHINE:"manuel espresso makinesi", FILTER_COFFEE_MACHINE:"filtre kahve makinesi", TURKISH_COFFEE_MACHINE:"Türk kahvesi makinesi",
  AIR_FRYER:"airfryer", BLENDER:"blender", FOOD_PROCESSOR:"mutfak robotu",
  ELECTRIC_STORAGE_WATER_HEATER:"elektrikli termosifon", INSTANTANEOUS_ELECTRIC_WATER_HEATER:"elektrikli şofben",
  SPLIT_AIR_CONDITIONER:"ev tipi split klima",
};

const expected: Readonly<Record<Family, StructuralOutcome>> = {
  NOVICE: { advisory: true, decisionWrites: 0, question: "INTENT" },
  INFORMATION: { advisory: false, decisionWrites: 0, question: "NONE" },
  CATEGORY_GUIDANCE: { advisory: false, decisionWrites: 0, question: "NONE" },
  MIXED: { advisory: true, decisionWrites: 0, question: "MATERIAL" },
  OFF_TOPIC: { advisory: false, decisionWrites: 0, question: "NONE" },
};

const message = (label: string, family: Family) => family === "NOVICE" ? `${label} hakkında hiçbir şey bilmiyorum, yardımcı ol`
  : family === "INFORMATION" ? `${label} hakkında genel bilgi verir misin?`
    : family === "CATEGORY_GUIDANCE" ? `${label} alırken en çok neye dikat etmek gerekir?`
    : family === "MIXED" ? `${label} hakkında genel bilgi istiyorum ve satın almak istiyorum`
      : "Bugün hava nasıl?";

async function cars(family: Family): Promise<StructuralOutcome> {
  process.env.CARS_V31_PROVIDER_DISABLED = "true";
  const output = await runV3Turn({ conversationId: `cross-cars-${family}`, messageId: "1", message: message("arabalar", family), expectedRevision: 0 });
  return { advisory: Boolean(output.advisory), decisionWrites: output.state.ledger.length, question: output.state.lastQuestionKey === "purchaseInterest" ? "INTENT" : output.state.lastQuestionKey ? "MATERIAL" : "NONE" };
}

async function appliance(productType: AppliancesProductType, family: Family): Promise<StructuralOutcome> {
  const store = new MemoryAppliancesConversationStore();
  const entry = await enterAppliancesDepartment({ repository: createFileSystemAppliancesArtifactRepository(process.cwd()), productType, conversationId: crypto.randomUUID() });
  if (entry.status !== "READY") throw new Error(entry.status);
  await commitAppliancesBootstrap({ store, state: entry.state, messageId: "create", payload: { productType } });
  const turn = await runNativeAppliancesTurn({ store, conversationId: entry.state.conversationId, messageId: family, expectedRevision: 1, message: message(applianceLabels[productType], family) });
  if (turn.status !== "OK") throw new Error(turn.status);
  return { advisory: "advisory" in turn.result.outcome && Boolean(turn.result.outcome.advisory), decisionWrites: turn.result.state.ledger.length, question: turn.result.state.lastQuestionKey === "xpy.advisory.purchaseInterest" ? "INTENT" : turn.result.state.lastQuestionKey ? "MATERIAL" : "NONE" };
}

describe("cross-runtime XPY structural acceptance", () => {
  it.each(["NOVICE", "INFORMATION", "CATEGORY_GUIDANCE", "MIXED", "OFF_TOPIC"] as const)("keeps %s ownership parity across Cars and three appliance engines", async family => {
    const outcomes = await Promise.all([cars(family), appliance("DRYER", family), appliance("REFRIGERATOR", family), appliance("ROBOT_VACUUM", family)]);
    expect(outcomes).toEqual(Array.from({ length: 4 }, () => expected[family]));
  });
});
