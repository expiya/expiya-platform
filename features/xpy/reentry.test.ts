import { describe, expect, it, vi } from "vitest";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { createV3ConversationState } from "@/features/decision/v3/engine.server";
import { runNativeCarsStateTurn } from "@/features/decision/v3/nativeXpy.server";
import { interpretPlatformAssistant } from "./assistant";
import { requireXpyReentry } from "./domainPacks";
import { planPlatformLifecycle } from "./planner";

describe("domain-aware shared X re-entry", () => {
  const domains: readonly (readonly ["CARS" | "APPLIANCES", string])[] = [["CARS", "NEW_CAR"], ...APPLIANCES_PRODUCT_TYPES.map(category => ["APPLIANCES" as const, category] as const)];
  it.each(domains)("renders category-correct redirect for %s/%s", (department, category) => {
    const config = requireXpyReentry(department, category);
    const assistant = interpretPlatformAssistant("Bugün hava nasıl?", true, config);
    const plan = planPlatformLifecycle({ message: "Bugün hava nasıl?", pendingQuestionKey: "pending", assistant });
    expect(assistant).toMatchObject({ intent: "OFF_TOPIC", preservePendingQuestion: true });
    expect(assistant.directResponse).toContain(config.decisionJourneyPurpose);
    expect(plan).toMatchObject({ kind: "RESPOND_WITHOUT_DECISION", preserveQuestionKey: "pending" });
  });

  it("propagates to a newly registered pack using data only", () => {
    const assistant = interpretPlatformAssistant("Film öner", false, { publicName: "test ürünü", decisionJourneyPurpose: "test ürünü karar desteği", reentryPrompt: "Test yolculuğuna dönelim.", informationalTerms: ["özellik"] });
    expect(assistant.directResponse).toBe("Bu oturum test ürünü karar desteği için ayrılmış durumda. Test yolculuğuna dönelim.");
  });

  it("does not classify an in-domain informational question as off-topic", () => {
    expect(interpretPlatformAssistant("Batarya ömrü nedir?", true, requireXpyReentry("CARS", "NEW_CAR")).intent).toBe("INFORMATION");
  });

  it("commits redirect without invoking Cars Y and preserves the pending question", async () => {
    const state = { ...createV3ConversationState("reentry"), lastQuestionKey: "fuelType" };
    const decide = vi.fn();
    const output = await runNativeCarsStateTurn({ conversationId: "reentry", messageId: "m", message: "Bugün hava nasıl?", expectedRevision: 0, state }, state, decide);
    expect(decide).not.toHaveBeenCalled();
    expect(output.state).toMatchObject({ revision: 1, lastQuestionKey: "fuelType", ledger: [] });
    expect(output.recommendations).toBeUndefined();
  });
});
