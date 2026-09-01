import {existsSync,readdirSync,readFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const root=process.cwd();
const filesUnder=(path:string):string[]=>readdirSync(join(root,path)).flatMap(name=>{const relative=`${path}/${name}`;return statSync(join(root,relative)).isDirectory()?filesUnder(relative):[join(root,relative)];});
describe("used-cars delivery consistency",()=>{
  it("resolves every public barrel export target without duplicate declarations",()=>{const index=readFileSync(join(root,"features/used-cars/index.ts"),"utf8");const declarations=index.split("\n").filter(line=>line.startsWith("export "));const targets=[...index.matchAll(/from\s+["'](\.\/[^"']+)["']/gu)].map(match=>match[1]);const missing=targets.filter(target=>!existsSync(join(root,"features/used-cars",`${target.slice(2)}.ts`)));expect(missing).toEqual([]);expect(new Set(declarations).size).toBe(declarations.length);});
  it("keeps the full recursive verified test suite",()=>{const tests=filesUnder("features/used-cars").filter(file=>file.endsWith(".test.ts"));expect(tests.length).toBeGreaterThanOrEqual(73);});
 it("includes the canonical architecture, handoff and launch-control documents",()=>{for(const document of ["expiya-used-cars-product-architecture-v0.1.md","expiya-used-cars-prototype-handoff-v0.1.md","expiya-used-cars-launch-control-report-v0.1.md"])expect(existsSync(join(root,"docs",document))).toBe(true);});
});
