import type { GovernedMediaDisposition, GovernedProductMedia } from "@/features/media/governedProductMedia";

export const APPLIANCE_MEDIA_RELEASE_SCHEMA = "appliances-governed-media-release/v2" as const;

export interface ApplianceMediaProjection {
  readonly schemaVersion: "appliances-media-projection/v2";
  readonly exactProductId: string;
  readonly categoryId: string;
  readonly releaseId: string;
  readonly releaseDigest: string;
  readonly status: "EXACT" | "MODEL_FAMILY" | "AFFILIATE" | "REPRESENTATIVE" | "FALLBACK";
  readonly disposition: GovernedMediaDisposition;
  readonly src?: string;
  readonly alt: string;
  readonly assetSha256?: string;
  readonly linkTarget?: string;
  readonly disclosure?: string;
  readonly attribution?: string;
  readonly cacheMode?: GovernedProductMedia["cache"]["mode"];
}

export interface ApplianceMediaMember {
  readonly exactProductId: string;
  readonly categoryId: string;
  readonly brand: string;
  readonly model: string;
  readonly parentRelease: string;
  readonly parentArtifactSha256: string;
  readonly canonicalProductPage: string;
  readonly sourceUrl: string;
  readonly retrievedAt: string | null;
  readonly sourceMime: string | null;
  /** Discovery-only candidate; never a runtime source without an admitted disposition. */
  readonly candidateMediaUrl: string | null;
  readonly disposition: GovernedMediaDisposition;
  readonly blocker: string | null;
  readonly governance: GovernedProductMedia;
  readonly localAsset: null | { readonly path: string; readonly mime: string; readonly width: number; readonly height: number; readonly byteSha256: string };
  readonly remoteAssetUrl: string | null;
  readonly alt: string;
}

export interface ApplianceMediaRelease {
  readonly schemaVersion: typeof APPLIANCE_MEDIA_RELEASE_SCHEMA;
  readonly releaseId: string;
  readonly generatedAt: string;
  readonly policy: { readonly rightsRequired: true; readonly unprovenNotPublished: true; readonly mediaAffectsDecision: false };
  readonly members: readonly ApplianceMediaMember[];
  readonly releaseDigest: string;
}
