import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { applianceMediaDigest } from "../features/appliances/media/authority";
import type { ApplianceMediaMember, ApplianceMediaRelease } from "../features/appliances/media/types";
import { GOVERNED_PRODUCT_MEDIA_SCHEMA } from "../features/media/governedProductMedia";

type Product = { productId: string; brand?: string; brandId?: string; model?: string; manufacturerModelIdentifier?: string; evidenceRefs?: string[] };
type Source = { sourceId: string; url?: string; canonicalReference?: string; authority?: string; sourceType?: string };
const root = process.cwd(); const generatedAt = new Date().toISOString(); const acquire = process.argv.includes("--acquire");
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(root, file), "utf8")) as T;
const categoryDirectories = readdirSync(path.join(root, "data/production/appliances")).filter(name => statSync(path.join(root, "data/production/appliances", name)).isDirectory());

function sourceFor(product: Product, sources: Source[], assertions: { productId: string; sourceId: string }[] = []): Source | undefined {
  const refs = new Set([...(product.evidenceRefs ?? []), ...assertions.filter(item => item.productId === product.productId).map(item => item.sourceId)]);
  return sources.find(item => refs.has(item.sourceId) && /PRODUCT_PAGE|MANUFACTURER_TR$/u.test(item.authority ?? item.sourceType ?? "") && !/\.pdf(?:$|\?)/iu.test(item.url ?? item.canonicalReference ?? ""))
    ?? sources.find(item => refs.has(item.sourceId));
}

const inventory: { categoryId: string; release: string; artifactSha256: string; product: Product; source: Source }[] = [];
for (const directory of categoryDirectories) {
  const activeFile = `data/production/appliances/${directory}/active.json`; try {
    const active = read<{ releaseVersion?: string; artifactSha256?: string; lifecycle?: string }>(activeFile);
    if (active.lifecycle !== "ACTIVE" || !active.releaseVersion) continue;
    const releaseDirectory = path.join(root, `data/production/appliances/${directory}/releases/${active.releaseVersion}`);
    const artifactName = readdirSync(releaseDirectory).find(name => name === "domain-pack.json" || name === "catalog.json"); if (!artifactName) continue;
    const artifactPath = path.join(releaseDirectory, artifactName); const artifact = read<{ productType?: string; products: Product[]; sources: Source[]; evidenceAssertions?: { productId: string; sourceId: string }[] }>(path.relative(root, artifactPath)); const artifactSha256 = active.artifactSha256 ?? sha(readFileSync(artifactPath));
    for (const product of artifact.products) { const source = sourceFor(product, artifact.sources, artifact.evidenceAssertions); if (!source) throw new Error(`NO_PRIMARY_PRODUCT_SOURCE:${product.productId}`); inventory.push({ categoryId: artifact.productType ?? (directory === "washing-machines" ? "WASHING_MACHINE" : directory.replaceAll("-", "_").toUpperCase()), release: active.releaseVersion, artifactSha256, product, source }); }
  } catch (error) { if (error instanceof Error && error.message.startsWith("NO_PRIMARY")) throw error; }
}

async function inspect(item: typeof inventory[number]): Promise<ApplianceMediaMember> {
  const sourceUrl = item.source.url ?? item.source.canonicalReference!; const brand = item.product.brand ?? item.product.brandId!; const model = item.product.model ?? item.product.manufacturerModelIdentifier!;
  let retrievedAt: string | null = null, sourceMime: string | null = null, candidateMediaUrl: string | null = null, disposition: ApplianceMediaMember["disposition"] = "UNAVAILABLE", blocker = "Official product page was not fetched in this run.", identityEvidence: string[] = [];
  if (acquire) try {
    const response = await fetch(sourceUrl, { redirect: "follow", headers: { "user-agent": "ExpiyaGovernedMediaAudit/1.0 (+exact-product provenance audit)" }, signal: AbortSignal.timeout(15_000) });
    retrievedAt = generatedAt; sourceMime = response.headers.get("content-type"); const html = await response.text();
    const candidates = [...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/giu), ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/giu)].map(match => match[1]);
    candidateMediaUrl = candidates[0] ? new URL(candidates[0].replaceAll("&amp;", "&"), response.url).href : null;
    const normalized = model.replace(/[^a-z0-9]/giu, "").toLocaleLowerCase("en-US"); const body = html.replace(/[^a-z0-9]/giu, "").toLocaleLowerCase("en-US");
    if (!response.ok || !/text\/html/iu.test(sourceMime ?? "")) { blocker = `Official source returned HTTP ${response.status} or a non-HTML response.`; }
    else if (!body.includes(normalized)) { disposition = "IDENTITY_UNPROVEN"; blocker = "The fetched page did not expose the exact normalized model identifier."; }
    else { disposition = candidateMediaUrl ? "DISCOVERED_RIGHTS_UNPROVEN" : "UNAVAILABLE"; blocker = candidateMediaUrl ? "Exact manufacturer page exposed a candidate image, but no explicit reuse permission was established; bytes were not downloaded or hotlinked." : "Exact manufacturer page was confirmed, but it exposed no usable primary image metadata."; identityEvidence = [`Catalog model ${model} is present on the fetched official product page.`]; }
  } catch (error) { blocker = `Official source retrieval failed: ${error instanceof Error ? error.name : "unknown error"}.`; }
  return { exactProductId: item.product.productId, categoryId: item.categoryId, brand, model, parentRelease: item.release, parentArtifactSha256: item.artifactSha256, canonicalProductPage: sourceUrl, sourceUrl, retrievedAt, sourceMime, candidateMediaUrl, disposition, blocker, governance: { schemaVersion: GOVERNED_PRODUCT_MEDIA_SCHEMA, disposition, rightsBasis: null, provider: brand, permissionReference: null, allowedSurfaces: [], requiredLinkTarget: null, requiredDisclosure: null, requiredAttribution: null, cache: { mode: "NO_STORE", expiresAt: null, maxAgeSeconds: null }, retrievedAt, identity: { scope: identityEvidence.length ? "EXACT_PRODUCT" : "UNVERIFIED", evidence: identityEvidence }, revokedAt: null }, localAsset: null, remoteAssetUrl: null, alt: `${brand} ${model} ürün görseli adayı` };
}

async function main(): Promise<void> {
const members: ApplianceMediaMember[] = [];
for (const item of inventory) members.push(await inspect(item));
members.sort((a, b) => a.categoryId.localeCompare(b.categoryId) || a.exactProductId.localeCompare(b.exactProductId));
if (members.length !== 97 || new Set(members.map(item => item.categoryId)).size !== 24) throw new Error(`EXPECTED_97_MEMBERS_24_CATEGORIES:got_${members.length}_${new Set(members.map(item => item.categoryId)).size}`);
const payload = { schemaVersion: "appliances-governed-media-release/v2" as const, releaseId: "APPLIANCES-GOVERNED-MEDIA-DISCOVERY-TR-v0.2", generatedAt, policy: { rightsRequired: true as const, unprovenNotPublished: true as const, mediaAffectsDecision: false as const }, members };
const release: ApplianceMediaRelease = { ...payload, releaseDigest: applianceMediaDigest(payload) }; const outputDirectory = path.join(root, "data/production/appliances/media/releases", release.releaseId); mkdirSync(outputDirectory, { recursive: true });
writeFileSync(path.join(outputDirectory, "release.json"), `${JSON.stringify(release, null, 2)}\n`);
const coverage = Object.values(Object.groupBy(members, item => item.categoryId)).map(group => ({ categoryId: group![0].categoryId, members: group!.length, discoveredRightsUnproven: group!.filter(item => item.disposition === "DISCOVERED_RIGHTS_UNPROVEN").length, identityUnproven: group!.filter(item => item.disposition === "IDENTITY_UNPROVEN").length, unavailable: group!.filter(item => item.disposition === "UNAVAILABLE").length }));
writeFileSync(path.join(outputDirectory, "coverage.json"), `${JSON.stringify({ schemaVersion: "appliances-governed-media-coverage/v2", releaseId: release.releaseId, memberCount: members.length, categoryCount: coverage.length, coverage, releaseDigest: release.releaseDigest }, null, 2)}\n`);
writeFileSync(path.join(outputDirectory, "manifest.json"), `${JSON.stringify({ schemaVersion: "appliances-governed-media-manifest/v2", files: ["release.json", "coverage.json"].map(name => ({ name, sha256: sha(readFileSync(path.join(outputDirectory, name))) })), releaseDigest: release.releaseDigest }, null, 2)}\n`);
console.log(JSON.stringify({ members: members.length, categories: coverage.length, discoveredRightsUnproven: members.filter(item => item.disposition === "DISCOVERED_RIGHTS_UNPROVEN").length, identityUnproven: members.filter(item => item.disposition === "IDENTITY_UNPROVEN").length, unavailable: members.filter(item => item.disposition === "UNAVAILABLE").length, releaseDigest: release.releaseDigest }));
}

void main();
