import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { paidComparisonSampleReport } from "@/features/paid-comparison/sampleReport";
import type { PaidComparisonAdvisorReport } from "@/features/paid-comparison/advisor";
import { PaidReportAdvisor } from "./PaidReportAdvisor";

describe("PaidReportAdvisor", () => {
  it("explains the three-vehicle scope and disables chat in a sample report", () => {
    const html = renderToStaticMarkup(<PaidReportAdvisor report={paidComparisonSampleReport as PaidComparisonAdvisorReport} sample onSalesAction={vi.fn()} />);
    expect(html).toContain("Karşılaştırma danışmanı"); expect(html).toContain("Yalnız raporundaki üç araç"); expect(html).toContain("Örnek raporda kullanılamaz"); expect(html).toContain("0/10");
  });
});
