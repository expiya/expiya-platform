import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("shared XPY stage templates", () => {
  it("are consumed by Cars stage 2 and stage 3 routes", () => {
    for (const path of ["../../app/cars/variant/[exactVariantId]/page.tsx", "../../app/cars/sales-request/[intent]/page.tsx"]) expect(read(path)).toContain("<XpyStagePage");
  });

  it("are consumed by Appliances stage 1, 2 and 3", () => {
    expect(read("../../app/appliances/AppliancesConversation.tsx")).toContain("<XpyStageOneFrame");
    expect(read("../../app/appliances/stage/2/page.tsx")).toContain("<XpyStagePage");
    expect(read("../../app/appliances/stage/3/page.tsx")).toContain("<XpyStagePage");
    expect(read("../../app/appliances/stage/3/page.tsx")).toContain("<XpyStageThreeShell");
  });

  it("keep authority imports out of shared presentation", () => {
    const source = read("../../components/xpy/XpyStageTemplates.tsx");
    expect(source).not.toMatch(/features\/(?:decision|appliances|sales-advisor|sales-request)/u);
    expect(source).not.toMatch(/rank|recommend|authorize|offerGovernance/u);
  });
});
