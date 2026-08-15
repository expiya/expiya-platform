import { describe, expect, it } from "vitest";

import { extractModelEndpoints } from "./collect-hyundai-brand-batch";

describe("extractModelEndpoints", () => {
  it("extracts the visible label and official PAPI model id", () => {
    const html = `<span class="accordion__btn-inner">i20 - Yerli Üretim</span>
      <script type="application/hydration-marker" data-app-name="ModelPriceTable">
        {"papiUrl":"https://org-eu-www.hyundai.com/eu","modelId":"SW|S6||"}
      </script>`;
    expect(extractModelEndpoints(html)).toEqual([{ pageLabel: "i20 - Yerli Üretim", modelId: "SW|S6||" }]);
  });

  it("ignores unrelated hydration markers", () => {
    expect(extractModelEndpoints('<script data-app-name="Other">{}</script>')).toEqual([]);
  });
});
