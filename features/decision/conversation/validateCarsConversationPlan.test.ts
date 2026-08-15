import { describe, expect, it } from "vitest";

import { carsConversationTurnPlanSchema } from "./carsConversationPlanSchema";
import { emptyConversationTrace } from "./carsRequirementLedger";
import { interpretLatestUserAct } from "./carsSocialIntent";
import { validateCarsConversationPlan } from "./validateCarsConversationPlan";
import { DEFAULT_CARS_CONVERSATION_MODEL, resolveCarsConversationModel } from "./carsConversationModelConfig";

function validPlan(overrides: Record<string, unknown> = {}) {
  return carsConversationTurnPlanSchema.parse({
    latestMessage: {
      primaryAct: "GREETING",
      interpretation: "Selamlama",
      callsForSocialResponseFirst: true,
      answersActiveQuestion: false,
    },
    proposedMemoryChanges: { newFacts: [], corrections: [], confirmedAnswers: [] },
    move: "SOCIAL_RESPONSE",
    question: null,
    readiness: { humanReady: false, reason: "social opening" },
    recommendationAction: "NONE",
    options: [],
    assistantMessage: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?",
    ...overrides,
  });
}

describe("natural advisor plan validation", () => {
  it("rejects a schema-valid greeting that starts vehicle discovery", () => {
    const plan = {
      ...validPlan(),
      move: "ASK_ONE_QUESTION" as const,
      question: {
        purpose: "PRIMARY_USAGE" as const,
        text: "Aracı en çok hangi senaryoda kullanacaksınız?",
        whyMaterialNow: "discovery",
      },
      assistantMessage: "Merhaba! Size uygun aracı birlikte daraltalım. Aracı en çok hangi senaryoda kullanacaksınız?",
      plannerModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
    };
    expect(validateCarsConversationPlan({
      plan,
      memory: emptyConversationTrace(),
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "Merhaba" }]),
      latestUserText: "Merhaba",
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).toBe("GREETING_THEN_DISCOVERY");
  });

  it("accepts a social greeting without discovery", () => {
    const plan = { ...validPlan(), plannerModel: "gpt-5.5", requestedModel: "gpt-5.5" };
    expect(validateCarsConversationPlan({
      plan,
      memory: emptyConversationTrace(),
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "Merhaba" }]),
      latestUserText: "Merhaba",
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).toBeUndefined();
  });

  it("rejects vague continuity and capability greetings", () => {
    const continuity = {
      ...validPlan({
        latestMessage: {
          primaryAct: "RETURN_TO_TOPIC",
          interpretation: "return",
          callsForSocialResponseFirst: false,
          answersActiveQuestion: false,
        },
        assistantMessage: "Son söylediğiniz noktayı kaçırmadım. İsterseniz oradan devam ederiz.",
      }),
      plannerModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
    };
    expect(validateCarsConversationPlan({
      plan: continuity,
      memory: { ...emptyConversationTrace(), vehicleIntentEstablished: true },
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "Neyse, arabaya dönelim." }], {
        ...emptyConversationTrace(),
        vehicleIntentEstablished: true,
      }),
      latestUserText: "Neyse, arabaya dönelim.",
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).toBe("VAGUE_CONTINUITY");

    const capability = {
      ...validPlan({
        latestMessage: {
          primaryAct: "CAPABILITY_QUESTION",
          interpretation: "capability",
          callsForSocialResponseFirst: false,
          answersActiveQuestion: false,
        },
        assistantMessage: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?",
      }),
      plannerModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
    };
    expect(validateCarsConversationPlan({
      plan: capability,
      memory: emptyConversationTrace(),
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "Ne yapabildiğini merak ettim." }]),
      latestUserText: "Ne yapabildiğini merak ettim.",
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).toBe("CAPABILITY_THEN_GREETING");
  });

  it("rejects a capability answer that promises listing evaluation", () => {
    const plan = {
      ...validPlan({
        latestMessage: {
          primaryAct: "CAPABILITY_QUESTION",
          interpretation: "capability",
          callsForSocialResponseFirst: false,
          answersActiveQuestion: false,
        },
        assistantMessage: "İkinci el ilanındaki riskleri yorumlarım ve mevcut ilanları değerlendiririm.",
      }),
      plannerModel: "gpt-5.5",
      requestedModel: "gpt-5.5",
    };
    expect(validateCarsConversationPlan({
      plan,
      memory: emptyConversationTrace(),
      latestAct: interpretLatestUserAct([{ id: "1", role: "user", content: "Ne yapabildiğini merak ettim." }]),
      latestUserText: "Ne yapabildiğini merak ettim.",
      recommendationMayBeOffered: false,
      candidateMayBeRevealed: false,
    })).toBe("CAPABILITY_UNSUPPORTED_PROMISE");
  });

  it("requests gpt-5.5 by default without exposing a public model name", () => {
    expect(DEFAULT_CARS_CONVERSATION_MODEL).toBe("gpt-5.5");
    expect(resolveCarsConversationModel().requestedModel).toBe("gpt-5.5");
    expect(Object.keys(process.env).some((key) => key.startsWith("NEXT_PUBLIC_") && key.includes("CARS_CONVERSATION_MODEL"))).toBe(false);
  });
});
