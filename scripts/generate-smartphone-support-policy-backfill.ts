import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphoneSupportPolicyBackfill } from "../features/electronics/smartphoneSupportPolicyBackfill";

const output = "data/research/electronics/smartphone-support-policy-backfill-01";
const result = buildSmartphoneSupportPolicyBackfill();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, releaseDigest: result.manifest.releaseDigest }, null, 2));
