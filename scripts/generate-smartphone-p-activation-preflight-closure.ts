import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityActivationPreflightClosure } from "../features/electronics/smartphonePMaterialityActivationPreflightClosure";

const result = buildSmartphonePMaterialityActivationPreflightClosure();
mkdirSync(result.output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${result.output}/${name}`, bytes);
console.log(JSON.stringify({ output: result.output, packageDigest: result.manifest.packageDigest, preflightDigest: (result.artifacts["preflight.json"] as { preflightDigest: string }).preflightDigest }, null, 2));
