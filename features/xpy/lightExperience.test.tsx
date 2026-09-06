import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpyStageOneFrame } from "@/components/xpy/XpyPresentation";
import { APPLIANCES_EXPERIENCE, CARS_EXPERIENCE, ELECTRONICS_EXPERIENCE } from "./visualPacks";

describe("shared light XPY experience", () => {
  it.each([CARS_EXPERIENCE, APPLIANCES_EXPERIENCE, ELECTRONICS_EXPERIENCE])("gives $departmentId the common light shell", (adapter) => {
    const html = renderToStaticMarkup(<XpyStageOneFrame adapter={adapter} embedded><p>Görüşme</p></XpyStageOneFrame>);
    expect(html).toContain("xpy-light");
    expect(html).toContain("bg-[#f8f8f6]");
    expect(html).not.toContain("bg-stone-900");
  });

  it("keeps the theme override centralized in the shared shell", () => {
    const shell = readFileSync("components/xpy/XpyPresentation.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");
    expect(shell.match(/xpy-light/gu)).toHaveLength(2);
    expect(css).toContain(".xpy-light [role=\"log\"]");
  });
});
