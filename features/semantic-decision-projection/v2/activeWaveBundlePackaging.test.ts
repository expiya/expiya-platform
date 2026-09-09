import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("active P-materiality Vercel bundle characterization", () => {
  it("uses a static generated module outside every Vercel ignored authority directory", async () => {
    const [ignore, loader, generated] = await Promise.all([
      readFile(".vercelignore", "utf8"),
      readFile("features/semantic-decision-projection/v2/activeWaveLoader.server.ts", "utf8"),
      readFile("features/semantic-decision-projection/v2/activeWaveBundle.generated.ts", "utf8"),
    ]);
    expect(ignore).toContain("outputs/");
    expect(ignore).not.toMatch(/^features\/semantic-decision-projection/mu);
    expect(loader).toContain('from "./activeWaveBundle.generated"');
    expect(generated).toContain("SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0");
  });
});
