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

  it("places the needle at the supplied exact relative percentile without visual scale labels", () => {
    const markup = renderToStaticMarkup(<ClassPositionGauge position="MID" percentile={0.25} />);
    expect(markup).toContain('x2="42.745');
    expect(markup).toContain('y2="42.745');
    expect(markup).not.toContain(">Düşük<");
    expect(markup).not.toContain(">Orta<");
    expect(markup).not.toContain(">Yüksek<");
  });
  it("renders neutral technical size positions without red-green quality semantics", () => {
    const markup = renderToStaticMarkup(<ClassPositionGauge position="HIGH" tone="NEUTRAL" />);
    expect(markup).toMatch(/Sınıf içi göreli konum/u);
    expect(markup).toContain("#64748b");
    expect(markup).toContain("#4f46e5");
    expect(markup).not.toContain("#dc2626");
    expect(markup).toMatch(/iyi veya kötü puanı değildir/iu);
  });
});
