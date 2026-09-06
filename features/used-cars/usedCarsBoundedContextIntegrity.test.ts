import {readdirSync,readFileSync,statSync} from "node:fs";
import {join,relative} from "node:path";
import {describe,expect,it} from "vitest";

const root=process.cwd();
function filesUnder(path:string):string[]{const absolute=join(root,path);return readdirSync(absolute).flatMap(name=>{const entry=join(absolute,name);return statSync(entry).isDirectory()?filesUnder(relative(root,entry)):[entry];}).filter(file=>/\.(ts|tsx)$/u.test(file));}
const content=(file:string)=>readFileSync(file,"utf8");

describe("used-cars bounded-context integrity",()=>{
 it("does not import zero-car decision, catalog or UI internals",()=>{const forbidden=/from\s+["'](?:@\/|(?:\.\.\/)+)(?:features\/(?:decision|vehicle-data)|data\/|components\/cars)/u;const violations=filesUnder("features/used-cars").filter(file=>forbidden.test(content(file)));expect(violations).toEqual([]);});
 it("does not inject used-cars modules into protected zero-car domains",()=>{const protectedRoots=["features/decision","features/vehicle-data","components/cars","data/production"];const violations=protectedRoots.flatMap(filesUnder).filter(file=>/features\/used-cars|components\/used-cars|\/ikinciel/u.test(content(file)));expect(violations).toEqual([]);});
 it("keeps the staging design outside executable migrations",()=>{const migrationReferences=filesUnder("features/used-cars").filter(file=>/database\/migrations\/.*used.?cars/iu.test(content(file)));expect(migrationReferences).toEqual([]);});
});
