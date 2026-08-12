import { afterEach, describe, expect, it, vi } from "vitest";

import { getOpenAIClient } from "./openai";

describe("getOpenAIClient", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("defers missing credential failure until runtime use", () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    expect(() => getOpenAIClient()).toThrow(/credentials are unavailable/iu);
  });
});
