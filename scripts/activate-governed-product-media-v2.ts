import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applianceMediaDigest } from "../features/appliances/media/authority";
import { buildOwnedRepresentativeGovernance } from "../features/media/governedProductMedia";
import type { ApplianceMediaMember, ApplianceMediaRelease } from "../features/appliances/media/types";

type LegacyMember = Omit<ApplianceMediaMember, "disposition" | "governance" | "remoteAssetUrl" | "localAsset"> & {
  readonly disposition: string;
  readonly localAsset: null;
};
type LegacyRelease = { readonly members: readonly LegacyMember[] };

const root = process.cwd();
const releaseId = "APPLIANCES-GOVERNED-MEDIA-TR-v0.2";
const generatedAt = "2026-09-05T12:00:00+03:00";
const oldFile = path.join(root, "data/production/appliances/media/releases/APPLIANCES-GOVERNED-MEDIA-TR-v0.1/release.json");
const assetPath = "/appliances/representative/owned-category-catalog.svg";
const assetFile = path.join(root, "public", assetPath.slice(1));
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

async function main() {
  const legacy = JSON.parse(await readFile(oldFile, "utf8")) as LegacyRelease;
  const assetHash = sha(await readFile(assetFile));
  const members: ApplianceMediaMember[] = legacy.members.map((item) => ({
    exactProductId: item.exactProductId, categoryId: item.categoryId, brand: item.brand, model: item.model,
    parentRelease: item.parentRelease, parentArtifactSha256: item.parentArtifactSha256,
    canonicalProductPage: item.canonicalProductPage, sourceUrl: item.sourceUrl, retrievedAt: item.retrievedAt,
    sourceMime: item.sourceMime, candidateMediaUrl: item.candidateMediaUrl,
    disposition: "OWNED_REPRESENTATIVE", blocker: null,
    governance: buildOwnedRepresentativeGovernance({
      provider: "Expiya",
      permissionReference: "repo:public/appliances/representative/owned-category-catalog.svg",
      evidence: [`Generic ${item.categoryId} presentation fallback; artwork does not assert ${item.brand} ${item.model} appearance.`],
    }),
    localAsset: { path: assetPath, mime: "image/svg+xml", width: 1200, height: 900, byteSha256: assetHash },
    remoteAssetUrl: null,
    alt: `${item.brand} ${item.model} için temsilî ev ürünü illüstrasyonu`,
  }));
  const payload = { schemaVersion: "appliances-governed-media-release/v2" as const, releaseId, generatedAt, policy: { rightsRequired: true as const, unprovenNotPublished: true as const, mediaAffectsDecision: false as const }, members };
  const release: ApplianceMediaRelease = { ...payload, releaseDigest: applianceMediaDigest(payload) };
  const output = path.join(root, "data/production/appliances/media/releases", releaseId); await mkdir(output, { recursive: true });
  const releaseRaw = `${JSON.stringify(release, null, 2)}\n`;
  const byCategory = Object.entries(Object.groupBy(members, member => member.categoryId)).map(([categoryId, rows]) => ({ categoryId, products: rows!.length, exactLicensed: 0, modelFamilyLicensed: 0, affiliateApiTransient: 0, ownedRepresentative: rows!.length, discoveredRightsUnproven: 0, identityUnproven: 0, unavailable: 0 }));
  const coverageRaw = `${JSON.stringify({ schemaVersion: "appliances-governed-media-coverage/v2", releaseId, before: { exactLicensed: 0, modelFamilyLicensed: 0, affiliateApiTransient: 0, ownedRepresentative: 0, discoveredRightsUnproven: 73, identityUnproven: 14, unavailable: 10 }, after: { exactLicensed: 0, modelFamilyLicensed: 0, affiliateApiTransient: 0, ownedRepresentative: 97, discoveredRightsUnproven: 0, identityUnproven: 0, unavailable: 0 }, categories: byCategory, releaseDigest: release.releaseDigest }, null, 2)}\n`;
  await writeFile(path.join(output, "release.json"), releaseRaw);
  await writeFile(path.join(output, "coverage.json"), coverageRaw);
  const manifestRaw = `${JSON.stringify({ schemaVersion: "appliances-governed-media-manifest/v2", releaseDigest: release.releaseDigest, files: [{ name: "release.json", sha256: sha(releaseRaw) }, { name: "coverage.json", sha256: sha(coverageRaw) }], ownedAssets: [{ path: assetPath, sha256: assetHash }] }, null, 2)}\n`;
  await writeFile(path.join(output, "manifest.json"), manifestRaw);
  await writeFile(path.join(root, "data/production/appliances/media/active.json"), `${JSON.stringify({ schemaVersion: "appliances-governed-media-active/v2", releaseFile: `releases/${releaseId}/release.json`, releaseDigest: release.releaseDigest }, null, 2)}\n`);
  console.log(JSON.stringify({ products: members.length, categories: byCategory.length, disposition: "OWNED_REPRESENTATIVE", releaseDigest: release.releaseDigest }));
}

void main();
