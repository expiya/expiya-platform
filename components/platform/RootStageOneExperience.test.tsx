import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RootStageOneExperience } from "./RootStageOneExperience";

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
});
