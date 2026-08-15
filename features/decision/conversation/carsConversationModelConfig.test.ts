import { afterEach, describe, expect, it, vi } from "vitest";

import { carsConversationModelAttempts, resolveCarsConversationModel } from "./carsConversationModelConfig";

describe("cars conversation model config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requests gpt-5.5 directly when configuration is missing", () => {
    vi.stubEnv("OPENAI_CARS_CONVERSATION_MODEL", "");
    vi.stubEnv("OPENAI_CARS_CONVERSATION_FALLBACK_MODEL", "");
    expect(resolveCarsConversationModel()).toEqual({ requestedModel: "gpt-5.5" });
    expect(carsConversationModelAttempts()).toEqual(["gpt-5.5"]);
    expect(carsConversationModelAttempts().some((model) => model.includes("gpt-5.6"))).toBe(false);
  });

  it("keeps a secondary model only as a failure fallback", () => {
    vi.stubEnv("OPENAI_CARS_CONVERSATION_MODEL", "gpt-5.5");
    vi.stubEnv("OPENAI_CARS_CONVERSATION_FALLBACK_MODEL", "gpt-5.5-secondary");
    expect(carsConversationModelAttempts()).toEqual(["gpt-5.5", "gpt-5.5-secondary"]);
  });
});
