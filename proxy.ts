import { NextResponse, type NextRequest } from "next/server";
import activePointer from "./data/production/semantic-decision-projection/active.json";
import activeRelease from "./data/production/semantic-decision-projection/releases/SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0/release.json";

export const ACTIVE_P_MATERIALITY_RUNTIME_HEADER = "x-expiya-p-materiality-release";

export function activePMaterialityProxyIntegrity(): { readonly ready: true; readonly releaseId: string; readonly releaseDigest: string } | { readonly ready: false } {
  const categories = [...new Set(activeRelease.projections.map((projection) => projection.identity.categoryId))].sort();
  const declared = [...activePointer.categories].sort();
  const exactOfferingIds = new Set(activeRelease.projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId)));
  const readiness = [...new Set([...activePointer.pCategories, ...activePointer.informationOnlyCategories])].sort();
  if (
    activePointer.state !== "ACTIVE_MIXED_INFORMATION_AND_P" ||
    activePointer.releaseId !== activeRelease.releaseId ||
    activePointer.yAuthority !== "UNCHANGED_NONE_GRANTED" ||
    activeRelease.yAuthority !== "UNCHANGED_NONE_GRANTED" ||
    activeRelease.totals.categories !== 54 ||
    activeRelease.totals.exactOfferings !== 813 ||
    exactOfferingIds.size !== activeRelease.totals.exactOfferings ||
    JSON.stringify(categories) !== JSON.stringify(declared) ||
    JSON.stringify(readiness) !== JSON.stringify(declared)
  ) return { ready: false };
  return { ready: true, releaseId: activeRelease.releaseId, releaseDigest: activeRelease.releaseDigest };
}

export function proxy(request: NextRequest) {
  const integrity = activePMaterialityProxyIntegrity();
  if (!integrity.ready) return NextResponse.json({ kind: "FAILED_CLOSED", message: "Aktif karar projection yetkisi doğrulanamadı." }, { status: 503 });
  const headers = new Headers(request.headers);
  headers.set(ACTIVE_P_MATERIALITY_RUNTIME_HEADER, `${integrity.releaseId};${integrity.releaseDigest}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/api/appliances/conversation",
    "/api/baby/conversation",
    "/api/cars/conversation/v3",
    "/api/electronics/conversation",
    "/api/mobility/conversation",
    "/api/tools/conversation",
  ],
};

