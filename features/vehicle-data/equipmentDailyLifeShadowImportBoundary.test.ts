import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const forbidden = ["app/", "components/", "features/decision/"];
const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = join(directory, entry.name);
  return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/u.test(entry.name) ? [target] : [];
});

describe("equipment daily-life shadow import boundary", () => {
  it("is not imported by public decision, route, UI, ranking, question, action or card modules", () => {
    const root = process.cwd();
    for (const directory of forbidden) {
      for (const file of sourceFiles(join(root, directory))) {
        const source = readFileSync(file, "utf8");
        expect(source, file).not.toContain("equipmentDailyLifeShadowAdapter");
        expect(source, file).not.toContain("equipmentIntentQuestionPolicy");
        expect(source, file).not.toContain("equipmentIntentVocabulary");
        expect(source, file).not.toContain("equipmentShadowMemory");
        expect(source, file).not.toContain("equipmentPublicExplanationAuthority");
      }
    }
  });
});
