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
});
