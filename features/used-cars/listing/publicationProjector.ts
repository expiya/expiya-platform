import type { PublishingGates } from "../memberships/publishingEligibility";
import { isDealerPublishingEligible } from "../memberships/publishingEligibility";
import { evaluatePublicMediaGate, type UsedCarMediaAsset } from "../media/contracts";
import { isListingPublic, type ListingPublicationProjection } from "./lifecycle";
import { findForbiddenPublicKeys, projectPublicUsedCarListing, type PrivateUsedVehicleView, type PublicUsedCarListing } from "./projection";

export interface PublicationMediaInput { readonly asset: UsedCarMediaAsset; readonly publicUrl: string | null }
export interface TenantListingPublicationInput { readonly lifecycle: ListingPublicationProjection; readonly privateView: PrivateUsedVehicleView; readonly media: readonly PublicationMediaInput[] }
export interface TenantPublicationSnapshot {
  readonly version: "used-cars-publication-snapshot/v1"; readonly tenantId: string; readonly snapshotAt: string;
  readonly dealerGates: PublishingGates; readonly listings: readonly TenantListingPublicationInput[];
}
export interface TenantPublicationResult {
  readonly version: "used-cars-publication-result/v1"; readonly tenantId: string; readonly snapshotAt: string;
  readonly published: readonly PublicUsedCarListing[]; readonly blockedListingIds: readonly string[]; readonly failClosed: boolean;
}

export function projectTenantPublicListings(snapshot: TenantPublicationSnapshot): TenantPublicationResult {
  if (!isDealerPublishingEligible(snapshot.dealerGates)) return Object.freeze({ version: "used-cars-publication-result/v1", tenantId: snapshot.tenantId, snapshotAt: snapshot.snapshotAt, published: Object.freeze([]), blockedListingIds: Object.freeze(snapshot.listings.map(item => item.privateView.listingId)), failClosed: true });
  const published: PublicUsedCarListing[] = []; const blocked: string[] = [];
  for (const item of snapshot.listings) {
    const tenantMatches = item.privateView.tenantId === snapshot.tenantId;
    const lifecycleEligible = isListingPublic(item.lifecycle, snapshot.dealerGates, snapshot.snapshotAt);
    const safeMedia = item.media.filter(media => media.publicUrl && media.asset.tenantId === snapshot.tenantId && media.asset.inventoryUnitId === item.privateView.inventoryUnitId && evaluatePublicMediaGate(media.asset).publishable);
    const mediaEligible = safeMedia.length > 0 && safeMedia.length === item.media.length;
    if (!tenantMatches || !lifecycleEligible || !mediaEligible) { blocked.push(item.privateView.listingId); continue; }
    const projected = projectPublicUsedCarListing({ ...item.privateView, publicMediaUrls: safeMedia.map(media => media.publicUrl!) });
    if (findForbiddenPublicKeys(projected).length > 0) { blocked.push(item.privateView.listingId); continue; }
    published.push(projected);
  }
  return Object.freeze({ version: "used-cars-publication-result/v1", tenantId: snapshot.tenantId, snapshotAt: snapshot.snapshotAt, published: Object.freeze(published), blockedListingIds: Object.freeze(blocked), failClosed: blocked.length > 0 });
}

