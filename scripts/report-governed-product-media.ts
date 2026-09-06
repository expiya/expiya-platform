import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { activeCatalogPayload, activeCatalogReleaseVersion } from "../data/production/catalog/activeCatalog.generated";
import catalogPointer from "../data/production/catalog/active.json";
import officialMedia from "../data/production/media/official-vehicle-media.json";
import wikimediaMedia from "../data/production/media/wikimedia-vehicle-media.json";
import { productionVehicleMediaAssets } from "../data/production/vehicleMediaAssets";
import { resolveVehicleImage } from "../features/vehicle-data/resolveVehicleImage";
import type { ProductionCatalogReleasePayload } from "../features/vehicle-data/productionCatalogRelease";
import type { VehicleMediaAsset } from "../types/vehicleMedia";

const root = process.cwd();
const generatedAt = "2026-09-05T12:00:00+03:00";
const stable = (value: unknown): string => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}` : JSON.stringify(value);
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const normalize = (value: string | undefined) => value?.trim().toLocaleUpperCase("tr-TR");

function legacyOfficialMatch(asset: VehicleMediaAsset, identity: { variantId: string; brand: string; model: string; generation?: string; bodyStyle: string; modelYear: number }) {
  if (normalize(asset.brand) !== normalize(identity.brand) || normalize(asset.model) !== normalize(identity.model)) return false;
  if (asset.modelYearFrom && identity.modelYear < asset.modelYearFrom) return false;
  if (asset.modelYearTo && identity.modelYear > asset.modelYearTo) return false;
  if (asset.scope === "VARIANT") return asset.variantId === identity.variantId;
  if (asset.scope === "GENERATION_BODY") return normalize(asset.generation) === normalize(identity.generation) && normalize(asset.bodyStyle) === normalize(identity.bodyStyle);
  if (asset.scope === "MODEL_BODY") return normalize(asset.bodyStyle) === normalize(identity.bodyStyle);
  return true;
}

function counts(rows: readonly string[]) {
  const grouped = Object.groupBy(rows, value => value);
  return Object.fromEntries(["EXACT_LICENSED", "MODEL_FAMILY_LICENSED", "AFFILIATE_API_TRANSIENT", "OWNED_REPRESENTATIVE", "DISCOVERED_RIGHTS_UNPROVEN", "IDENTITY_UNPROVEN", "UNAVAILABLE"].map(key => [key, grouped[key]?.length ?? 0]));
}

async function main() {
  const payload = activeCatalogPayload as unknown as ProductionCatalogReleasePayload;
  const official = officialMedia.assets as unknown as readonly VehicleMediaAsset[];
  const wikimedia = wikimediaMedia.assets as unknown as readonly VehicleMediaAsset[];
  const before: string[] = [], after: string[] = [];
  const inventory: { variantId: string; brand: string; model: string; bodyStyle: string; beforeDisposition: string; afterDisposition: string; runtimeAssetId: string | null }[] = [];
  for (const { variant } of payload.records) {
    const identity = { variantId: variant.id, brand: variant.brand.value, model: variant.model.value, generation: variant.generation?.value, bodyStyle: variant.bodyStyle.value, modelYear: variant.modelYear.value };
    const resolved = resolveVehicleImage(identity, productionVehicleMediaAssets);
    const beforeDisposition = resolved.assetId !== "owned-representative:vehicle"
      ? resolved.status === "EXACT" ? "EXACT_LICENSED" : "MODEL_FAMILY_LICENSED"
      : official.some(asset => legacyOfficialMatch(asset, identity)) ? "DISCOVERED_RIGHTS_UNPROVEN"
      : wikimedia.some(asset => legacyOfficialMatch(asset, identity)) ? "IDENTITY_UNPROVEN" : "UNAVAILABLE";
    const afterDisposition = resolved.assetId !== "owned-representative:vehicle" ? beforeDisposition : "OWNED_REPRESENTATIVE";
    before.push(beforeDisposition); after.push(afterDisposition);
    inventory.push({ variantId: variant.id, brand: variant.brand.value, model: variant.model.value, bodyStyle: variant.bodyStyle.value, beforeDisposition, afterDisposition, runtimeAssetId: resolved.assetId ?? null });
  }
  const fallbackBytes = await readFile(path.join(root, "public/cars/owned-representative.svg"));
  const manifestCore = {
    schemaVersion: "governed-vehicle-media-active/v1", generatedAt,
    catalogRelease: `v${activeCatalogReleaseVersion}`, catalogFingerprint: catalogPointer.catalog_payload_hash,
    admittedAssetCount: productionVehicleMediaAssets.length,
    admittedAssetsDigest: `sha256:${sha(stable(productionVehicleMediaAssets.map(asset => ({ id: asset.id, fileHash: asset.fileHash, scope: asset.scope, licenseUrl: asset.licenseUrl, identityVerification: asset.identityVerification }))))}`,
    fallback: { disposition: "OWNED_REPRESENTATIVE", path: "/cars/owned-representative.svg", byteSha256: sha(fallbackBytes), disclosure: "Temsilî illüstrasyon; önerilen aracın birebir fotoğrafı değildir." },
    discoveryOnlyRegistry: { file: "official-vehicle-media.json", reason: "Manufacturer page publication plus catalog-owner direction is not a reusable display license." },
  };
  const manifest = { ...manifestCore, manifestDigest: `sha256:${sha(stable(manifestCore))}` };
  await writeFile(path.join(root, "data/production/media/governed-active.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const applianceV1 = JSON.parse(await readFile(path.join(root, "data/production/appliances/media/releases/APPLIANCES-GOVERNED-MEDIA-TR-v0.1/release.json"), "utf8")) as { members: { categoryId: string; disposition: string }[] };
  const applianceV2 = JSON.parse(await readFile(path.join(root, "data/production/appliances/media/releases/APPLIANCES-GOVERNED-MEDIA-TR-v0.2/release.json"), "utf8")) as { members: { categoryId: string; disposition: string }[]; releaseDigest: string };
  const categories = [...new Set(applianceV2.members.map(item => item.categoryId))].sort().map(categoryId => {
    const oldRows = applianceV1.members.filter(item => item.categoryId === categoryId);
    const newRows = applianceV2.members.filter(item => item.categoryId === categoryId);
    return { categoryId, products: newRows.length, before: counts(oldRows.map(item => item.disposition === "BLOCKED_RIGHTS" ? "DISCOVERED_RIGHTS_UNPROVEN" : item.disposition === "BLOCKED_IDENTITY" ? "IDENTITY_UNPROVEN" : "UNAVAILABLE")), after: counts(newRows.map(item => item.disposition)) };
  });
  const coverageCore = {
    schemaVersion: "governed-product-media-coverage/v1", workUnit: "WU-XPY-GOVERNED-PRODUCT-MEDIA-ACTIVATION-01", generatedAt,
    verdict: "ACTIVATED_WITH_OWNED_REPRESENTATIVE_FALLBACKS_EXACT_ACCESS_PENDING",
    cars: { variants: payload.records.length, before: counts(before), after: counts(after), inventory },
    appliances: { products: applianceV2.members.length, categories: categories.length, before: counts(applianceV1.members.map(item => item.disposition === "BLOCKED_RIGHTS" ? "DISCOVERED_RIGHTS_UNPROVEN" : item.disposition === "BLOCKED_IDENTITY" ? "IDENTITY_UNPROVEN" : "UNAVAILABLE")), after: counts(applianceV2.members.map(item => item.disposition)), perCategory: categories, releaseDigest: applianceV2.releaseDigest },
    decisionBoundary: { technicalFactsChanged: false, xpyAuthorityChanged: false, rankingsChanged: false, affiliateNeutralityChanged: false },
    externalAccessRequired: [
      "Amazon Associates final acceptance, Creators API application credentials and Partner Tag for amazon.com.tr.",
      "Provider contract/feed access explicitly granting Expiya display rights for manufacturer, dealer, Hepsiburada or Trendyol product media.",
      "For press/media kits: the licensor terms or written permission reference that expressly covers Expiya's commercial product-promotion surfaces.",
    ],
  };
  const coverage = { ...coverageCore, reportDigest: `sha256:${sha(stable(coverageCore))}` };
  const output = path.join(root, "data/governance/product-media"); await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
  await writeFile(path.join(output, "README.md"), `# Governed product media activation\n\nVerdict: activated with owned representative fallbacks; exact licensed/API access is still pending.\n\n- Cars: ${payload.records.length} variants; ${coverage.cars.after.MODEL_FAMILY_LICENSED} model-family licensed, ${coverage.cars.after.OWNED_REPRESENTATIVE} owned representative, ${coverage.cars.after.EXACT_LICENSED} exact licensed.\n- Appliances: ${applianceV2.members.length} products in ${categories.length} categories; ${coverage.appliances.after.OWNED_REPRESENTATIVE} owned representative, ${coverage.appliances.after.EXACT_LICENSED} exact licensed.\n- Manufacturer product-page images without permission metadata remain discovery-only. Existing Cars and Appliances source ledgers retain those URLs only as acquisition candidates.\n- Trendyol, Hepsiburada, and other public marketplace pages are discovery/offer sources only; no image reuse right is inferred from public display.\n- Amazon images must come from Creators API/PA API or a permitted feed, link directly to the relevant Amazon product page, retain required disclosures, and remain URL-only with a maximum 24-hour image-link cache.\n- Media remains presentation-only and does not alter XPY authority, technical facts, ranking, price logic, or affiliate neutrality.\n\nOfficial Amazon references reviewed:\n\n- Associates Program IP License: https://affiliate-program.amazon.com/help/operating/policies\n- Creators API registration and acceptance: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api\n- Affiliate disclosure requirements: https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98\n\nExact counts, all 549 Cars variants, and every Appliances category are in \`coverage.json\`.\n`);
  console.log(JSON.stringify({ cars: { variants: coverage.cars.variants, before: coverage.cars.before, after: coverage.cars.after }, appliances: { products: coverage.appliances.products, categories: coverage.appliances.categories, before: coverage.appliances.before, after: coverage.appliances.after }, reportDigest: coverage.reportDigest }));
}

void main();
