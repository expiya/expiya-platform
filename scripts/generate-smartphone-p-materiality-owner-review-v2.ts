import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityOwnerReviewV2 } from "../features/electronics/smartphonePMaterialityOwnerReviewV2";

const output = "data/research/electronics/smartphone-p-materiality-owner-review-v2-01";
const result = buildSmartphonePMaterialityOwnerReviewV2();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, packageDigest: result.manifest.packageDigest }, null, 2));
