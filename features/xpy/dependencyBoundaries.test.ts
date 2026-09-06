import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("XPY forbidden dependencies", () => {
  const source = readFileSync(new URL("./nativeRuntime.ts", import.meta.url), "utf8");

  it("keeps the shared runtime independent of Cars and Appliances", () => {
    expect(source).not.toMatch(/features\/(?:decision|appliances)/u);
  });

  it("allows only the transaction boundary to commit", () => {
    expect(source.match(/transaction\.commit/g)).toHaveLength(2);
    expect(source).not.toMatch(/x\.commit|p\.commit|y\.commit/u);
  });

  it("passes Y the validated envelope rather than the raw X proposal", () => {
    expect(source).toContain("port.y.decide(loaded.state, validated, plan)");
  });

  it("keeps the Appliances HTTP route transport-only", () => {
    const route = readFileSync(new URL("../../app/api/appliances/conversation/route.ts", import.meta.url), "utf8");
    expect(route).toContain("handleNativeAppliancesConversationRequest(request)");
    expect(route).not.toMatch(/run(?:BrandConstraint|AppliancesQuestionDeferral|AppliancesPriceInformation|AppliancesBudgetControl|DryerConversation|RefrigeratorConversation|BoundedConversation|AppliancesConversation)Turn/u);
    expect(route).not.toMatch(/loadActive(?:Dryer|Refrigerator|Bounded|Appliances)Authority/u);
  });

  it("keeps Cars question policy free of offer and transaction authority", () => {
    const policy = readFileSync(new URL("../decision/v3/carsQuestionPolicy.ts", import.meta.url), "utf8");
    expect(policy).not.toMatch(/offerGovernance|createV31Offer|revealV31Offer|transaction|commit/u);
  });
});
