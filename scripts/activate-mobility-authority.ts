import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MOBILITY_PRODUCTS } from "../features/mobility/catalog";
import { MOBILITY_AUTHORITY_DIGEST } from "../features/mobility/domainPack";

const release = "MOBILITY-TR-v0.1-owner-review-candidate";
const manifestPath = resolve(`data/production/mobility/release-candidates/${release}/manifest.json`);
const approvalsPath = resolve("data/production/mobility/approvals.jsonl");
const activePath = resolve("data/production/mobility/active/active.json");

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const approvals = (await readFile(approvalsPath, "utf8")).trim().split("\n").map(line => JSON.parse(line));
  const exactIds = MOBILITY_PRODUCTS.map(product => product.exactProductId);
  if (manifest.release !== release || manifest.authorityDigest !== MOBILITY_AUTHORITY_DIGEST) throw new Error("MOBILITY_AUTHORITY_DIGEST_MISMATCH");
  if (JSON.stringify(manifest.exactProductIds) !== JSON.stringify(exactIds) || exactIds.length !== 10 || new Set(exactIds).size !== 10) throw new Error("MOBILITY_EXACT_PRODUCT_SET_MISMATCH");
  if (!approvals.some(record => record.release === release && record.authorityDigest === MOBILITY_AUTHORITY_DIGEST && record.authorization?.includes("non-force push"))) throw new Error("MOBILITY_OWNER_APPROVAL_MISSING");
  if (manifest.reconciliation?.silentDrops !== 0 || manifest.personaState !== "INTENDED_POSITIONING_SHADOW_ONLY") throw new Error("MOBILITY_GOVERNANCE_BOUNDARY_INVALID");
  const pointer = { schemaVersion: "mobility-active-pointer/v1", release, authorityDigest: MOBILITY_AUTHORITY_DIGEST, manifest: `data/production/mobility/release-candidates/${release}/manifest.json`, productCount: 10, categories: ["ELECTRIC_SCOOTER", "ELECTRIC_BICYCLE", "BICYCLE"] };
  const temporaryPath = resolve(dirname(activePath), `.active.${process.pid}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(pointer, null, 2)}\n`, { flag: "wx" });
  await rename(temporaryPath, activePath);
  console.log(JSON.stringify({ status: "ACTIVATED", release, authorityDigest: MOBILITY_AUTHORITY_DIGEST, productCount: exactIds.length }));
}

main().catch(() => { console.error("MOBILITY_ACTIVATION_FAILED_NO_SECRET_DETAILS"); process.exitCode = 1; });
