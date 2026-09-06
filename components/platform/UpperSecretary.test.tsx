import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SECRETARY_NAVIGATION_DELAY_MS } from "./UpperSecretary";

describe("UpperSecretary cancellable navigation", () => {
  const source = readFileSync(path.join(process.cwd(), "components/platform/UpperSecretary.tsx"), "utf8");
  it("uses a visible three-second cancellable accessible countdown", () => {
    expect(SECRETARY_NAVIGATION_DELAY_MS).toBe(3_000);
    expect(source).toContain("Durdur ve burada kal");
    expect(source).toContain('role="status"');
    expect(source).toContain("motion-reduce:transition-none");
  });
  it("cancels timers and commits the bounded handoff only at completion", () => {
    expect(source).toContain("window.clearTimeout(timeout)");
    expect(source).toContain("window.clearInterval(interval)");
    expect(source).toContain("window.cancelAnimationFrame(frame)");
    expect(source.indexOf("saveSecretaryPendingMessage(sessionStorage")).toBeLessThan(source.indexOf("router.push(pendingRoute.destination)"));
  });
  it("renders accessible, wrapping clarification buttons and keeps free-text correction", () => {
    expect(source).toContain('aria-label="Yönlendirme seçenekleri"');
    expect(source).toContain("flex-wrap");
    expect(source).toContain("selectChoice(choice)");
    expect(source).toContain("if (choices.length) setChoices([])");
  });
  it("shows one passive registry example only as a placeholder and pauses it during input", () => {
    expect(source).toContain('placeholder={frozen ? "" : suggestions[suggestionIndex]?.label');
    expect(source).toContain("messageFocused || draft || frozen");
    expect(source).toContain("onFocus={() => setMessageFocused(true)}");
    expect(source).not.toContain('aria-label="Örnek aramalar"');
    expect(source).not.toContain("Önceki örnek aramalar");
    expect(source).not.toContain("Sonraki örnek aramalar");
    expect(source).not.toContain(">Tüm alanlar</Link>");
  });
});
