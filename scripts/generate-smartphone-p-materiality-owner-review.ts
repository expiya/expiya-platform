import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityOwnerReview } from "../features/electronics/smartphonePMaterialityOwnerReview";

const output = "data/research/electronics/smartphone-p-materiality-owner-review-01";
const result = buildSmartphonePMaterialityOwnerReview();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, packageDigest: result.manifest.packageDigest }, null, 2));
