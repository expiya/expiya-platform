import path from "node:path";
import { executeHeadphonesActivation } from "../features/electronics/headphonesCatalogActivation";

async function main() {
  const baseCatalogPath = process.env.ELECTRONICS_BASE_CATALOG ?? path.join(process.cwd(), "data/production/electronics/runtime/releases/ELECTRONICS-RUNTIME-CATALOG-TR-v1.0/catalog.json");
  console.log(JSON.stringify(await executeHeadphonesActivation(process.cwd(), baseCatalogPath), null, 2));
}

void main();
