import { afterEach, describe, expect, it } from "vitest";
import { interpretV31Message } from "./semanticProvider.server";

const originalKey = process.env.OPENAI_API_KEY; const originalDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
afterEach(() => { if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; if (originalDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = originalDisabled; });

describe("V3.1 semantic provider boundary", () => {
  it("falls back deterministically when provider is disabled", async () => {
    process.env.CARS_V31_PROVIDER_DISABLED = "true"; const result = await interpretV31Message({ message: "Yeni telefon almalıyım; iPhone mu Samsung mu?", hasPurchaseIntent: false, hasOpenQuestion: false });
    expect(result.origin).toBe("BOUNDED_FALLBACK"); expect(result.router).toMatchObject({ route: "OFF_TOPIC_REQUEST", decisionMutationAllowed: false, catalogEvaluationRequired: false });
  });
});
