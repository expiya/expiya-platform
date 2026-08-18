import { describe, expect, it, vi } from "vitest";

import { createOpenAIStructuredProviderTransport, readCarsDecisionV2ProviderConfig } from "./openaiTransport.server";

describe("OpenAI structured provider output budgets", () => {
  it("uses bounded defaults and validates overrides", () => {
    expect(readCarsDecisionV2ProviderConfig({})).toMatchObject({ interpretationMaxOutputTokens: 2048, realizationMaxOutputTokens: 1024 });
    expect(() => readCarsDecisionV2ProviderConfig({ OPENAI_CARS_DECISION_V2_INTERPRETATION_MAX_OUTPUT_TOKENS: "0" })).toThrow("V2_PROVIDER_INTERPRETATION_OUTPUT_BUDGET_INVALID");
  });

  it("passes task-specific max output tokens to the Responses API", async () => {
    const parse = vi.fn(async (request: unknown, options?: unknown) => { void request; void options; return { output_parsed: { ok: true } }; });
    const transport = createOpenAIStructuredProviderTransport({ responses: { parse } } as never, readCarsDecisionV2ProviderConfig({}));
    await transport.execute({ task: "INTERPRET", payload: {}, signal: new AbortController().signal });
    await transport.execute({ task: "REALIZE", payload: {}, signal: new AbortController().signal });
    expect(parse.mock.calls[0]?.[0]).toMatchObject({ max_output_tokens: 2048 });
    expect(parse.mock.calls[1]?.[0]).toMatchObject({ max_output_tokens: 1024 });
  });

  it("separates exhausted credit from temporary rate limiting", async () => {
    const exhausted = Object.assign(new Error("hidden billing detail"), { status: 429, code: "credit_balance_exhausted" });
    const parse = vi.fn(async () => { throw exhausted; });
    const transport = createOpenAIStructuredProviderTransport({ responses: { parse } } as never, readCarsDecisionV2ProviderConfig({}));
    await expect(transport.execute({ task: "INTERPRET", payload: {}, signal: new AbortController().signal })).rejects.toThrow("V2_PROVIDER_CREDIT_EXHAUSTED");
  });
});
