import { mkdirSync, writeFileSync } from "node:fs";
import { buildSmartphonePMaterialityActivationReceipt } from "../features/electronics/smartphonePMaterialityActivationReceipt";

const output = "data/production/electronics/governance/activation-events/WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-01";
const result = buildSmartphonePMaterialityActivationReceipt();
mkdirSync(output, { recursive: true });
for (const [name, bytes] of Object.entries(result.serialized)) writeFileSync(`${output}/${name}`, bytes, { flag: "wx" });
console.log(JSON.stringify({ status: result.receipt.status, receiptDigest: result.receipt.receiptDigest, productionEffect: result.receipt.productionEffect }, null, 2));
