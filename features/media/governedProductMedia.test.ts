import { describe, expect, it } from "vitest";
import { buildOwnedRepresentativeGovernance, validateGovernedProductMedia } from "./governedProductMedia";

describe("governed product media", () => {
  it("admits an owned representative only with a clear category-level disclosure", () => {
    const governance = buildOwnedRepresentativeGovernance({ provider: "Expiya", permissionReference: "owned-media:v1", evidence: ["Generic product-category illustration."] });
    expect(validateGovernedProductMedia({ governance, localSrc: "/media/representative.svg" })).toEqual([]);
  });

  it("keeps discovery-only page images out of runtime", () => {
    const governance = { ...buildOwnedRepresentativeGovernance({ provider: "Manufacturer", permissionReference: "none", evidence: [] }), disposition: "DISCOVERED_RIGHTS_UNPROVEN" as const, rightsBasis: null, allowedSurfaces: [] };
    expect(validateGovernedProductMedia({ governance, remoteSrc: "https://manufacturer.example/image.jpg" })).toContain("RUNTIME_SOURCE_FOR_UNPUBLISHABLE_DISPOSITION");
  });

  it("enforces Amazon direct-link, disclosure, URL-only caching and a 24-hour maximum", () => {
    const governance = { ...buildOwnedRepresentativeGovernance({ provider: "Amazon Associates Creators API", permissionReference: "associates-license", evidence: ["ASIN and exact model matched."] }), disposition: "AFFILIATE_API_TRANSIENT" as const, rightsBasis: "AMAZON_ASSOCIATES_CREATORS_API" as const, requiredLinkTarget: null, requiredDisclosure: null, cache: { mode: "PERSISTENT" as const, expiresAt: null, maxAgeSeconds: 172_800 }, identity: { scope: "EXACT_PRODUCT" as const, evidence: ["ASIN and exact model matched."] } };
    expect(validateGovernedProductMedia({ governance, localSrc: "/copied-amazon.jpg" })).toEqual(expect.arrayContaining(["AFFILIATE_LINK_REQUIRED", "AFFILIATE_DISCLOSURE_REQUIRED", "AFFILIATE_TRANSIENT_CACHE_REQUIRED", "PERSISTED_TRANSIENT_ASSET_FORBIDDEN", "AMAZON_IMAGE_CACHE_WINDOW_INVALID"]));
  });

  it("fails closed after expiry or revocation", () => {
    const governance = { ...buildOwnedRepresentativeGovernance({ provider: "Expiya", permissionReference: "owned-media:v1", evidence: ["Owned illustration."] }), revokedAt: "2026-09-04T00:00:00.000Z" };
    expect(validateGovernedProductMedia({ governance, localSrc: "/media/representative.svg" }, new Date("2026-09-05T00:00:00.000Z"))).toContain("EXPIRED_OR_REVOKED");
  });
});
