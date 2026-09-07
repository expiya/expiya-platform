import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityCurrentProductionIntegration } from "../features/electronics/smartphonePMaterialityCurrentProductionIntegration";

const output = "data/research/electronics/smartphone-p-current-production-integration-01";
const result = buildSmartphonePMaterialityCurrentProductionIntegration();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, packageDigest: result.manifest.packageDigest }, null, 2));
