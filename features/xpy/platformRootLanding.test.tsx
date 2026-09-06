import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import RootPage from "@/app/page";
import CarsPage from "@/app/cars/page";
import AppliancesPage from "@/app/appliances/page";

describe("platform root routing", () => {
  it("renders a neutral platform choice without silently selecting Cars", () => {
    const html = renderToStaticMarkup(<RootPage />);

    expect(html).toContain('data-xpy-platform-landing="v2-conversation-first"');
    expect(html).toContain('data-platform-default-department="NONE"');
    expect(html).not.toContain('href="/appliances"');
    expect(html).not.toContain('href="/cars"');
    expect(html).not.toContain('href="/electronics"');
    expect(html).toContain(">Expiya</p>");
    expect(html).toContain("Ne satın almak istiyorsunuz?");
    expect(html).toContain('href="/expiya-nedir"');
    expect(html).not.toContain("İhtiyacınızı anlatın. Sekreter sizi doğru karar deneyimine yönlendirsin.");
    expect(html).not.toContain("Sekreter ürün seçmez; sizi uygun Expiya bölümüne yönlendirir.");
    expect(html).not.toContain("Expiya Sekreter");
    expect(html).not.toContain("Expiya Cars");
    expect(html).not.toContain("/analysis?pilot=v3.8");
    expect(html).not.toContain("XPY yolculuğu");
    expect(html).not.toContain("Experience. Powered by You.</h2>");
  });

  it("renders no lower department, future, or replacement directory", () => {
    const html = renderToStaticMarkup(<RootPage />);
    expect(html).not.toContain("data-platform-department");
    expect(html).not.toContain("Expiya departmanları");
    expect(html).not.toContain("Planlananlar");
    expect(html).not.toContain("İkinci el otomobil");
    expect(html).not.toContain("Klasik otomobil");
    expect(html).not.toContain('href="/ikinciel"');
    expect(html).not.toMatch(/href="\/(?:hotels|events)"/u);
  });

  it("keeps Cars and Appliances on distinct canonical landings with Stage 1 embedded", async () => {
    const cars = renderToStaticMarkup(await CarsPage({ searchParams: Promise.resolve({}) }));
    const appliances = renderToStaticMarkup(await AppliancesPage({ searchParams: Promise.resolve({}) }));

    expect(cars).toContain('data-xpy-department="CARS"');
    expect(cars).toContain("Sizin için doğru arabayı");
    expect(cars).toContain('data-xpy-stage="STAGE_1_DECISION"');
    expect(appliances).toContain('data-xpy-department="APPLIANCES"');
    expect(appliances).toContain("Eviniz için doğru ürünü");
    expect(appliances).toContain('data-xpy-stage="STAGE_1_DECISION"');
    expect(appliances).not.toContain("Görüşmeye başla");
  });

  it("contains no root redirect or client-side department forwarding", () => {
    const source = readFileSync("app/page.tsx", "utf8");

    expect(source).not.toMatch(/\bredirect\s*\(/u);
    expect(source).not.toContain("useRouter");
    expect(source).not.toContain("router.push");
    expect(source).not.toContain('"use client"');
  });
});
