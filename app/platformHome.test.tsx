import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import PlatformHome, { metadata } from "./page";

describe("Expiya platform landing", () => {
  it("offers Cars as the active domain and marks future domains as upcoming", () => {
    const html = renderToStaticMarkup(<PlatformHome />);
    expect(html).toContain("Ne satın almak istiyorsunuz?");
    expect(html).toContain("Bireysel satın alma platformu");
    expect(html).toContain('href="/cars"');
    expect(html).toContain("Otomobil");
    expect(html).toContain("Elektronik");
    expect(html).toContain("Ev aletleri");
    expect(html).toContain("Otel");
    expect(html).toContain("Kurs");
    expect(html).toContain("Konut");
    expect(html).not.toContain("Bu karar deneyimi hazırlanıyor");
  });

  it("publishes platform metadata at the root canonical URL", () => {
    expect(metadata.title).toBe("Expiya — Bireysel Satın Alma Platformu");
    expect(metadata.alternates).toEqual({ canonical: "/" });
  });
});
