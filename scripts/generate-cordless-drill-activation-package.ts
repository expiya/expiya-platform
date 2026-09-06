import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../features/catalog-factory/canonical";
import { buildCordlessDrillActivationPackage } from "../features/catalog-factory/cordlessDrillActivationPackage";
async function main(){const directory=path.join(process.cwd(),"outputs/cordless-drill-real-wave-01");await mkdir(directory,{recursive:true});const artifact=buildCordlessDrillActivationPackage();await writeFile(path.join(directory,"activation-package.json"),`${canonicalJson(artifact)}\n`);console.log(artifact.packageDigest);}
void main();
