import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PlatformHome, { metadata } from "./page";

describe("Expiya platform landing", () => {
  it("offers Cars as the active domain and marks future domains as upcoming", () => {
    const html = renderToStaticMarkup(<PlatformHome />);
    expect(html).toContain("Ne seçiyorsun?");
    expect(html).toContain('href="/cars"');
    expect(html).toContain("Otomobiller");
    expect(html).toContain("Ev aletleri");
    expect(html.match(/Yakında/g)).toHaveLength(4);
  });

  it("publishes platform metadata at the root canonical URL", () => {
    expect(metadata.title).toBe("Expiya — Karar Platformu");
    expect(metadata.alternates).toEqual({ canonical: "/" });
  });
});
