import { describe, expect, it } from "vitest";
import { classifyAnalystProviderFailure } from "./provider.server";

describe("Semantic Analyst provider diagnostics", () => {
  it.each([
    [true, {}, "TIMEOUT"],
    [false, { status: 401 }, "AUTH"],
    [false, { status: 429 }, "RATE_LIMIT"],
    [false, { status: 400 }, "REQUEST"],
    [false, { status: 503 }, "UPSTREAM"],
    [false, new Error("redacted"), "UNKNOWN"],
  ] as const)("classifies failures without serializing error details", (aborted, error, expected) => {
    expect(classifyAnalystProviderFailure(error, aborted)).toBe(expected);
  });
});
