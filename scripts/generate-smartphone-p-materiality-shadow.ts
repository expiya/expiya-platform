import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityShadow } from "../features/electronics/smartphonePMaterialityShadow";

const output = "data/research/electronics/smartphone-p-materiality-shadow-01";
const result = buildSmartphonePMaterialityShadow();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, releaseDigest: result.manifest.releaseDigest, files: Object.keys(result.serialized).sort() }, null, 2));
