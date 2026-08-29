import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClassPositionGauge } from "./SalesAdvisorExperience";

describe("ClassPositionGauge", () => {
  it.each(["LOW", "MID", "HIGH"] as const)("renders an accessible %s gauge with the soft three-color scale", (position) => {
    const markup = renderToStaticMarkup(<ClassPositionGauge position={position} />);
    expect(markup).toContain("role=\"img\"");
    expect(markup).toMatch(/Sınıf içi göreli seviye/u);
    expect(markup).toContain("#dc2626");
    expect(markup).toContain("#f59e0b");
    expect(markup).toContain("#16a34a");
  });
});
