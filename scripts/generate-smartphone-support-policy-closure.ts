import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphoneSupportPolicyClosure } from "../features/electronics/smartphoneSupportPolicyClosure";

const output = "data/research/electronics/smartphone-support-policy-closure-02";
const result = buildSmartphoneSupportPolicyClosure();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, releaseDigest: result.manifest.releaseDigest }, null, 2));
