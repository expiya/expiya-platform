import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AppliancesStageTwoExperience } from "./AppliancesStageTwoExperience";

describe("AŞAMA 2 recovery UI",()=>{
  it("fails a raw/legacy locator closed and routes the person back to AŞAMA 1",()=>{const html=renderToStaticMarkup(<AppliancesStageTwoExperience handoff=""/>);expect(html).toContain("AŞAMA 2 yalnız güncel karar kartındaki");expect(html).toContain('href="/appliances#asama-1"');expect(html).not.toContain("/api/appliances/conversation");});
  it("keeps the action cards single-column on mobile, expands progressively, and preserves touch targets",()=>{const source=readFileSync(new URL("./AppliancesStageTwoExperience.tsx",import.meta.url),"utf8");expect(source).toContain('sm:grid-cols-2 lg:grid-cols-3');expect(source).toContain('min-h-11');expect(source).toContain('disabled:cursor-not-allowed');});
  it("explains the decision-only scope without exposing a direct or sample authority path",()=>{const source=readFileSync(new URL("./AppliancesStageTwoExperience.tsx",import.meta.url),"utf8");expect(source).toContain("AŞAMA 1’de seçildi");expect(source).toContain("Ürün seçimini değiştirmez");expect(source).not.toContain("{p.configuration}");expect(source).not.toContain("Ücretli rapor");});
});
