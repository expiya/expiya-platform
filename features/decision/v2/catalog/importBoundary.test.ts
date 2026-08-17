import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

async function sourceFiles(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(fullPath) : entry.name.endsWith(".ts") ? [fullPath] : [];
  }));
  return nested.flat();
}

describe("V2 raw catalog import boundary", () => {
  it("allows raw production catalog access only inside the catalog boundary", async () => {
    const v2Root = path.join(process.cwd(), "features/decision/v2");
    const files = (await sourceFiles(v2Root)).filter((file) => !file.includes(`${path.sep}catalog${path.sep}`) && !file.includes(`${path.sep}schema${path.sep}`) && !file.endsWith(`${path.sep}layers${path.sep}productionAdapter.server.ts`));
    const violations: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (/data\/production\/catalog|activeCatalog\.generated|productionCatalogRelease/u.test(source)) violations.push(path.relative(v2Root, file));
    }
    expect(violations).toEqual([]);
  });

  it("keeps the V2 usage layer isolated from V1 and adjacent resolvers", async () => {
    const usageRoot = path.join(process.cwd(), "features/decision/v2/usage");
    const files = await sourceFiles(usageRoot);
    const violations: string[] = [];
    const forbidden = /data\/production|activeCatalog\.generated|features\/decision\/(?!v2\/)|facet|conversation\/|persona|technical-daily-life/iu;
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const imports = source.split("\n").filter((line) => /^import\s/u.test(line)).join("\n");
      if (forbidden.test(imports)) violations.push(path.relative(usageRoot, file));
    }
    expect(violations).toEqual([]);
  });

  it("keeps the V2 filter pipeline on snapshot/domain inputs only", async () => {
    const filterRoot = path.join(process.cwd(), "features/decision/v2/filter");
    const files = await sourceFiles(filterRoot);
    const violations: string[] = [];
    const forbidden = /data\/production|activeCatalog\.generated|features\/decision\/(?!v2\/)|facet|conversation\/|planner|persona|technical-daily-life/iu;
    for (const file of files) {
      const source = await readFile(file, "utf8");
      const imports = source.split("\n").filter((line) => /^import\s/u.test(line)).join("\n");
      if (forbidden.test(imports)) violations.push(path.relative(filterRoot, file));
    }
    expect(violations).toEqual([]);
  });

  it("keeps the V2 affordability layer isolated from raw catalog and V1", async () => {
    const root = path.join(process.cwd(), "features/decision/v2/affordability");
    const files = await sourceFiles(root); const violations: string[] = [];
    const forbidden = /data\/production|activeCatalog\.generated|features\/decision\/(?!v2\/)|conversation\/|planner|persona|technical-daily-life/iu;
    for (const file of files) { const source = await readFile(file, "utf8"); const imports = source.split("\n").filter((line) => /^import\s/u.test(line)).join("\n"); if (forbidden.test(imports)) violations.push(path.relative(root, file)); }
    expect(violations).toEqual([]);
  });

  it("keeps ranking, conflict, action and layer policies isolated from production files and V1", async () => {
    const roots = ["ranking", "conflict", "action", "layers"].map((folder) => path.join(process.cwd(), "features/decision/v2", folder)); const violations: string[] = [];
    const forbidden = /data\/production|activeCatalog\.generated|features\/decision\/(?!v2\/)|production\/.*persona|production\/.*daily|technical-daily-life/iu;
    for (const root of roots) for (const file of await sourceFiles(root)) { if (file.endsWith(`${path.sep}productionAdapter.test.ts`)) continue; const source = await readFile(file, "utf8"); const imports = source.split("\n").filter((line) => /^import\s/u.test(line)).join("\n"); if (forbidden.test(imports)) violations.push(path.relative(process.cwd(), file)); }
    expect(violations).toEqual([]);
  });

  it("keeps production composition independent from V1 decision authorities", async () => {
    const root = path.join(process.cwd(), "features/decision/v2/composition"); const violations: string[] = [];
    const forbidden = /features\/decision\/(?:conversation|runtime|orchestration)|carsHeldAuthorization|facet/iu;
    for (const file of await sourceFiles(root)) { const source = await readFile(file, "utf8"); const imports = source.split("\n").filter((line) => /^import\s/u.test(line)).join("\n"); if (forbidden.test(imports)) violations.push(path.relative(root, file)); }
    expect(violations).toEqual([]);
  });
});
