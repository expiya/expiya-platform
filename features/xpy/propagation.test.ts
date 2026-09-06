import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { classifyQuestionDeferral, nextUnaskedQuestion, preservePendingQuestion } from "./lifecycle";

describe("XPY global propagation", () => {
  it.each(["CARS", ...APPLIANCES_PRODUCT_TYPES])("X preserves a pending P question for %s informational interruptions", () => {
    const prior = { domain: "test", lastQuestionKey: "material-question" };
    expect(preservePendingQuestion(prior, { domain: "test", lastQuestionKey: undefined }).lastQuestionKey).toBe("material-question");
  });

  it.each(["CARS", ...APPLIANCES_PRODUCT_TYPES])("P applies deferral and dedupe once for %s", () => {
    expect(classifyQuestionDeferral("bilmiyorum")).toBe("UNKNOWN");
    expect(nextUnaskedQuestion([{ key: "asked" }, { key: "deferred" }, { key: "next" }], ["asked"], ["deferred"])?.key).toBe("next");
  });
});

