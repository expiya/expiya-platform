import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { formatRootBudget, rootQuickReplies, ROOT_ROUTE_DELAY_MS, RootStageOneExperience } from "./RootStageOneExperience";

describe("RootStageOneExperience", () => {
  it("keeps the root entry minimal, keyboard-ready and free of a chat panel", () => {
    const html = renderToStaticMarkup(<RootStageOneExperience suggestions={[{ id: "car", label: "Otomobil arıyorum" }]} adapters={[]}/>);
    expect(html).toContain('id="secretary-message"');
    expect(html).toContain('aria-label="Mesajı gönder"');
    expect(html).toContain("Ne satın almak istiyorsunuz?");
    expect(html).not.toContain("role=\"log\"");
    expect(html).not.toContain("bg-neutral-950");
    expect(html).not.toMatch(/[A-Z]{3,}_[A-Z_]+/u);
  });

  it("uses the governed three-second routing gate and Turkish numeric grouping", () => {
    expect(ROOT_ROUTE_DELAY_MS).toBe(3000);
    expect(formatRootBudget("₺ 0050000")).toBe("50.000");
    expect(formatRootBudget("")).toBe("");
  });

  it("projects only public Domain Pack labels as smart replies", () => {
    expect(rootQuickReplies({ outcome: { questionKey: "usage", choices: [
      { value: "FAMILY_USE", label: "Aile kullanımı" },
      { value: "RAW_KEY", label: "RAW_ENUM_VALUE" },
    ] } })).toEqual([{ questionKey: "usage", value: "FAMILY_USE", label: "Aile kullanımı" }]);
    expect(rootQuickReplies({ choices: { questionKey: "budget", source: "DOMAIN_PACK", options: [{ value: "UNKNOWN", label: "Henüz bilmiyorum" }] } })).toEqual([{ questionKey: "budget", value: "UNKNOWN", label: "Henüz bilmiyorum" }]);
  });

  it("keeps the destructive-looking reset and composer controls accessible", () => {
    const html = renderToStaticMarkup(<RootStageOneExperience suggestions={[]} adapters={[]}/>);
    expect(html).toContain('type="submit"');
    expect(html).toContain('rows="1"');
    expect(html).toContain('maxLength="1000"');
  });
});
