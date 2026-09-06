import { GOVERNED_PRODUCT_MEDIA_SCHEMA, validateGovernedProductMedia, type GovernedMediaCandidate } from "@/features/media/governedProductMedia";

export interface AmazonCreatorsImageRecord {
  readonly exactProductId: string;
  readonly asin: string;
  /** Use the image URL returned by Creators API without downloading its bytes. */
  readonly imageUrl: string;
  /** Preserve every URL parameter returned by Amazon, including the Partner Tag. */
  readonly detailPageUrl: string;
  readonly retrievedAt: string;
  readonly exactModelEvidence: readonly string[];
  readonly associatesAcceptanceReference: string;
}

export function adaptAmazonCreatorsImage(record: AmazonCreatorsImageRecord, now = new Date()): GovernedMediaCandidate | null {
  const retrieved = Date.parse(record.retrievedAt);
  if (!record.exactProductId.trim() || !/^[A-Z0-9]{10}$/u.test(record.asin) || !record.exactModelEvidence.length
    || !record.associatesAcceptanceReference.trim() || !record.imageUrl.startsWith("https://")
    || !record.detailPageUrl.startsWith("https://www.amazon.com.tr/") || Number.isNaN(retrieved)) return null;
  const expiresAt = new Date(retrieved + 86_400_000).toISOString();
  if (Date.parse(expiresAt) <= now.getTime()) return null;
  const candidate: GovernedMediaCandidate = {
    remoteSrc: record.imageUrl,
    governance: {
      schemaVersion: GOVERNED_PRODUCT_MEDIA_SCHEMA,
      disposition: "AFFILIATE_API_TRANSIENT",
      rightsBasis: "AMAZON_ASSOCIATES_CREATORS_API",
      provider: "Amazon Associates Creators API (amazon.com.tr)",
      permissionReference: record.associatesAcceptanceReference,
      allowedSurfaces: ["STAGE_1_CARD", "STAGE_2_HERO", "DETAIL_GALLERY"],
      requiredLinkTarget: record.detailPageUrl,
      requiredDisclosure: "(ücretli bağlantı) Amazon Satış Ortağı olarak uygun alışverişlerden gelir elde ederiz.",
      requiredAttribution: "Amazon Product Advertising Content",
      cache: { mode: "TRANSIENT_URL_ONLY", expiresAt, maxAgeSeconds: 86_400 },
      retrievedAt: record.retrievedAt,
      identity: { scope: "EXACT_PRODUCT", evidence: [`ASIN ${record.asin} is bound to ${record.exactProductId}.`, ...record.exactModelEvidence] },
      revokedAt: null,
    },
  };
  return validateGovernedProductMedia(candidate, now).length ? null : candidate;
}
