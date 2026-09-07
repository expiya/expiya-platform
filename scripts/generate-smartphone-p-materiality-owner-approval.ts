import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityOwnerApproval } from "../features/electronics/smartphonePMaterialityOwnerApproval";

const output = "data/research/electronics/smartphone-p-materiality-owner-approval-01";
const result = buildSmartphonePMaterialityOwnerApproval();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes);
console.log(JSON.stringify({ output, receiptDigest: result.receipt.receiptDigest }, null, 2));
