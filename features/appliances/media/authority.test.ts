import { describe, expect, it } from "vitest";
import { applianceMediaDigest, validateApplianceMediaRelease } from "./authority";
import { buildOwnedRepresentativeGovernance } from "@/features/media/governedProductMedia";
import type { ApplianceMediaRelease } from "./types";

function release(overrides: Record<string, unknown> = {}): ApplianceMediaRelease {
  const governance = buildOwnedRepresentativeGovernance({ provider: "Expiya", permissionReference: "repo:owned.svg", evidence: ["Generic category artwork."] });
  const member = { exactProductId: "EXACT_1", categoryId: "AIR_FRYER", brand: "Marka", model: "Model 1", parentRelease: "CAT-v1", parentArtifactSha256: "a".repeat(64), canonicalProductPage: "https://manufacturer.example/model-1", sourceUrl: "https://manufacturer.example/model-1", retrievedAt: "2026-09-04T12:00:00+03:00", sourceMime: "text/html", candidateMediaUrl: "https://manufacturer.example/model-1.webp", disposition: "OWNED_REPRESENTATIVE" as const, blocker: null, governance, localAsset: { path: "/appliances/representative/owned.svg", mime: "image/svg+xml" as const, width: 1200, height: 900, byteSha256: "b".repeat(64) }, remoteAssetUrl: null, alt: "Temsilî ürün illüstrasyonu", ...overrides };
  const payload = { schemaVersion: "appliances-governed-media-release/v2" as const, releaseId: "MEDIA-v2", generatedAt: "2026-09-04T12:00:00+03:00", policy: { rightsRequired: true as const, unprovenNotPublished: true as const, mediaAffectsDecision: false as const }, members: [member] };
  return { ...payload, releaseDigest: applianceMediaDigest(payload as Omit<ApplianceMediaRelease, "releaseDigest">) } as ApplianceMediaRelease;
}

describe("governed appliance media authority", () => {
  it("accepts a disclosed owned representative without treating it as exact", () => expect(validateApplianceMediaRelease(release()).status).toBe("READY"));
  it("rejects digest tampering", () => expect(validateApplianceMediaRelease({ ...release(), releaseDigest: "0".repeat(64) })).toEqual({ status: "FAILED_CLOSED", reason: "DIGEST_MISMATCH" }));
  it("rejects a disposition/governance mismatch", () => expect(validateApplianceMediaRelease(release({ disposition: "EXACT_LICENSED" }))).toEqual({ status: "FAILED_CLOSED", reason: "DISPOSITION_MISMATCH" }));
  it("keeps a revoked or expired record structurally readable so runtime can replace it safely", () => {
    const base = release(); const member = base.members[0];
    const invalid = release({ governance: { ...member.governance, revokedAt: "2026-09-04T13:00:00+03:00" } });
    expect(validateApplianceMediaRelease(invalid, new Date("2026-09-05T00:00:00Z")).status).toBe("READY");
  });
  it("rejects persisted bytes for an affiliate API image", () => {
    const base = release(); const member = base.members[0];
    const governance = { ...member.governance, disposition: "AFFILIATE_API_TRANSIENT" as const, rightsBasis: "AMAZON_ASSOCIATES_CREATORS_API" as const, requiredLinkTarget: "https://www.amazon.com.tr/dp/ASIN?tag=example", requiredDisclosure: "ücretli bağlantı", cache: { mode: "TRANSIENT_URL_ONLY" as const, expiresAt: "2026-09-05T12:00:00Z", maxAgeSeconds: 86_400 }, identity: { scope: "EXACT_PRODUCT" as const, evidence: ["ASIN match"] } };
    expect(validateApplianceMediaRelease(release({ disposition: "AFFILIATE_API_TRANSIENT", governance }))).toMatchObject({ status: "FAILED_CLOSED" });
  });
});
