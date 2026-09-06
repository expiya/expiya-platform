import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { V3_CARS_STAGE_ONE_PRESENTATION } from "./carsStageOneAdapters";

describe("active Cars stage-one presentation", () => {
  it("projects v3 recommendations through the universal contract", () => {
    const card = V3_CARS_STAGE_ONE_PRESENTATION.project({ id: "variant-1", title: "Dacia Jogger", image: "/cars/dacia-jogger.jpg", imageStatus: "EXACT", imageAttribution: "Dacia" });
    expect(card).toMatchObject({ schemaVersion: "xpy-stage1-presentation/v1", exactIdentity: { id: "variant-1", brand: "Dacia" }, media: { status: "EXACT" } });
  });
  it.each(["components/cars/CarCard.tsx", "components/cars/V2AuthorizedCarCard.tsx", "components/cars/CarsConversationV3.tsx"])("routes %s cards through XpyDecisionCard", path => {
    expect(readFileSync(path, "utf8")).toContain("XpyDecisionCard");
  });
  it("prevents the reachable legacy Cars route from bypassing the XPY shell", () => {
    const route = readFileSync("app/analysis/page.tsx", "utf8"); const legacy = readFileSync("components/cars/CarsConversation.tsx", "utf8");
    expect(route).toContain("<CarsConversation");
    for (const primitive of ["XpyStageOneFrame", "XpyHeader", "XpyTranscript", "XpyMessageBubble", "XpyLoading", "XpyComposer", "CarCard", "V2AuthorizedCarCard"]) expect(legacy).toContain(primitive);
    expect(legacy).not.toContain('<main className="min-h-screen');
    expect(legacy).not.toContain('<textarea');
  });
  it("keeps the Cars analysis entry on the canonical V3.8 alias without claiming the platform root", () => {
    const home = readFileSync("app/page.tsx", "utf8");
    const analysis = readFileSync("app/analysis/page.tsx", "utf8");
    expect(home).toContain("ROOT_DEPARTMENTS");
    expect(home).toContain("href={department.href}");
    expect(home).not.toContain("/analysis?pilot=v3.8&query=");
    expect(analysis).toContain('if (pilotValue !== "1") redirect(`/analysis?pilot=v3.8');
    expect(analysis.indexOf('pilotValue !== "1"')).toBeLessThan(analysis.indexOf("if (!isPublicCarsConversationEnabled"));
  });
});
