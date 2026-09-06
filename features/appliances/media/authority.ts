import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { isGovernedMediaUsableOn, validateGovernedProductMedia, type GovernedMediaSurface } from "@/features/media/governedProductMedia";
import type { ApplianceMediaProjection, ApplianceMediaRelease } from "./types";

const disposition = z.enum(["EXACT_LICENSED", "MODEL_FAMILY_LICENSED", "AFFILIATE_API_TRANSIENT", "OWNED_REPRESENTATIVE", "DISCOVERED_RIGHTS_UNPROVEN", "IDENTITY_UNPROVEN", "UNAVAILABLE"]);
const surface = z.enum(["STAGE_1_CARD", "STAGE_2_HERO", "DETAIL_GALLERY"]);
const governance = z.strictObject({
  schemaVersion: z.literal("governed-product-media/v1"), disposition,
  rightsBasis: z.enum(["MANUFACTURER_PRESS_MEDIA_LICENSE", "DEALER_AFFILIATE_CATALOG_LICENSE", "AMAZON_ASSOCIATES_CREATORS_API", "MERCHANT_API_OR_FEED_LICENSE", "OPEN_LICENSE", "OWNED_OR_COMMISSIONED"]).nullable(),
  provider: z.string().nullable(), permissionReference: z.string().nullable(), allowedSurfaces: z.array(surface),
  requiredLinkTarget: z.string().url().nullable(), requiredDisclosure: z.string().nullable(), requiredAttribution: z.string().nullable(),
  cache: z.strictObject({ mode: z.enum(["PERSISTENT", "TRANSIENT_URL_ONLY", "NO_STORE"]), expiresAt: z.string().datetime({ offset: true }).nullable(), maxAgeSeconds: z.number().int().positive().nullable() }),
  retrievedAt: z.string().datetime({ offset: true }).nullable(),
  identity: z.strictObject({ scope: z.enum(["EXACT_PRODUCT", "MODEL_FAMILY", "CATEGORY_REPRESENTATIVE", "UNVERIFIED"]), evidence: z.array(z.string().min(1)) }),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
});
const localAsset = z.strictObject({ path: z.string().regex(/^\/appliances\/[a-z0-9/_-]+\.(?:avif|webp|png|svg|jpe?g)$/u), mime: z.enum(["image/avif", "image/webp", "image/png", "image/svg+xml", "image/jpeg"]), width: z.number().int().positive(), height: z.number().int().positive(), byteSha256: z.string().regex(/^[a-f0-9]{64}$/u) });
const member = z.strictObject({ exactProductId: z.string().min(1), categoryId: z.string().min(1), brand: z.string().min(1), model: z.string().min(1), parentRelease: z.string().min(1), parentArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), canonicalProductPage: z.string().url(), sourceUrl: z.string().url(), retrievedAt: z.string().datetime({ offset: true }).nullable(), sourceMime: z.string().nullable(), candidateMediaUrl: z.string().url().nullable(), disposition, blocker: z.string().nullable(), governance, localAsset: localAsset.nullable(), remoteAssetUrl: z.string().url().nullable(), alt: z.string().min(1) });
const releaseSchema = z.strictObject({ schemaVersion: z.literal("appliances-governed-media-release/v2"), releaseId: z.string().min(1), generatedAt: z.string().datetime({ offset: true }), policy: z.strictObject({ rightsRequired: z.literal(true), unprovenNotPublished: z.literal(true), mediaAffectsDecision: z.literal(false) }), members: z.array(member), releaseDigest: z.string().regex(/^[a-f0-9]{64}$/u) });
const stable = (value: unknown): string => Array.isArray(value) ? `[${value.map(stable).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}` : JSON.stringify(value);
export const applianceMediaDigest = (value: Omit<ApplianceMediaRelease, "releaseDigest">): string => createHash("sha256").update(stable(value)).digest("hex");

export function validateApplianceMediaRelease(input: unknown, now = new Date()): { status: "READY"; release: ApplianceMediaRelease } | { status: "FAILED_CLOSED"; reason: string } {
  const parsed = releaseSchema.safeParse(input); if (!parsed.success) return { status: "FAILED_CLOSED", reason: "SCHEMA_INVALID" };
  const release = parsed.data as ApplianceMediaRelease; const { releaseDigest, ...payload } = release;
  if (applianceMediaDigest(payload) !== releaseDigest) return { status: "FAILED_CLOSED", reason: "DIGEST_MISMATCH" };
  if (new Set(release.members.map(item => item.exactProductId)).size !== release.members.length) return { status: "FAILED_CLOSED", reason: "DUPLICATE_IDENTITY" };
  for (const item of release.members) {
    if (item.disposition !== item.governance.disposition) return { status: "FAILED_CLOSED", reason: "DISPOSITION_MISMATCH" };
    const candidate = { governance: item.governance, ...(item.localAsset ? { localSrc: item.localAsset.path } : {}), ...(item.remoteAssetUrl ? { remoteSrc: item.remoteAssetUrl } : {}) };
    const issues = validateGovernedProductMedia(candidate, now);
    const publishes = ["EXACT_LICENSED", "MODEL_FAMILY_LICENSED", "AFFILIATE_API_TRANSIENT", "OWNED_REPRESENTATIVE"].includes(item.disposition);
    const structuralIssues = issues.filter(issue => issue !== "EXPIRED_OR_REVOKED");
    if (publishes && structuralIssues.length) return { status: "FAILED_CLOSED", reason: `ADMISSION_INVALID:${structuralIssues[0]}` };
    if (!publishes && (item.localAsset || item.remoteAssetUrl)) return { status: "FAILED_CLOSED", reason: "BLOCKED_ASSET_PRESENT" };
  }
  return { status: "READY", release: Object.freeze(release) };
}

function projectionStatus(value: ApplianceMediaProjection["disposition"]): ApplianceMediaProjection["status"] {
  if (value === "EXACT_LICENSED") return "EXACT";
  if (value === "MODEL_FAMILY_LICENSED") return "MODEL_FAMILY";
  if (value === "AFFILIATE_API_TRANSIENT") return "AFFILIATE";
  if (value === "OWNED_REPRESENTATIVE") return "REPRESENTATIVE";
  return "FALLBACK";
}

export async function loadApplianceMediaProjection(root: string, productId: string, surface: GovernedMediaSurface = "STAGE_1_CARD", now = new Date()): Promise<ApplianceMediaProjection | null> {
  try {
    const directory = path.join(root, "data/production/appliances/media");
    const pointer = JSON.parse(await readFile(path.join(directory, "active.json"), "utf8")) as { releaseFile?: unknown; releaseDigest?: unknown };
    if (typeof pointer.releaseFile !== "string" || !/^releases\/[A-Za-z0-9._+-]+\/release\.json$/u.test(pointer.releaseFile)) return null;
    const result = validateApplianceMediaRelease(JSON.parse(await readFile(path.join(directory, pointer.releaseFile), "utf8")), now);
    if (result.status !== "READY" || pointer.releaseDigest !== result.release.releaseDigest) return null;
    const item = result.release.members.find(value => value.exactProductId === productId); if (!item) return null;
    const candidate = { governance: item.governance, ...(item.localAsset ? { localSrc: item.localAsset.path } : {}), ...(item.remoteAssetUrl ? { remoteSrc: item.remoteAssetUrl } : {}) };
    if (!isGovernedMediaUsableOn(candidate, surface, now)) return { schemaVersion: "appliances-media-projection/v2", exactProductId: item.exactProductId, categoryId: item.categoryId, releaseId: result.release.releaseId, releaseDigest: result.release.releaseDigest, status: "FALLBACK", disposition: item.disposition, alt: `${item.brand} ${item.model} ürün görseli` };
    if (item.localAsset) { const relative = item.localAsset.path.slice(1); const absolute = path.resolve(root, "public", relative); if (!absolute.startsWith(`${path.resolve(root, "public/appliances")}${path.sep}`)) return null; const bytes = await readFile(absolute); if (createHash("sha256").update(bytes).digest("hex") !== item.localAsset.byteSha256) return null; }
    return { schemaVersion: "appliances-media-projection/v2", exactProductId: item.exactProductId, categoryId: item.categoryId, releaseId: result.release.releaseId, releaseDigest: result.release.releaseDigest, status: projectionStatus(item.disposition), disposition: item.disposition, src: item.localAsset?.path ?? item.remoteAssetUrl ?? undefined, alt: item.alt, assetSha256: item.localAsset?.byteSha256, linkTarget: item.governance.requiredLinkTarget ?? undefined, disclosure: item.governance.requiredDisclosure ?? undefined, attribution: item.governance.requiredAttribution ?? undefined, cacheMode: item.governance.cache.mode };
  } catch { return null; }
}
