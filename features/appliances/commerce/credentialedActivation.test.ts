import { describe, expect, it, vi } from "vitest";
import { admitCredentialedMedia, boundedProviderRequest, inventoryCredentialReferences } from "./credentialedActivation";

describe("credentialed appliances activation boundary", () => {
  it("fails closed when credentials are absent and never reports values", () => {
    const inventory = inventoryCredentialReferences({});
    expect(inventory.every(item => item.status === "CREDENTIALS_ABSENT")).toBe(true);
    expect(JSON.stringify(inventory)).not.toMatch(/secret-value/u);
  });
  it("distinguishes incomplete configuration without exposing the credential", () => {
    const inventory = inventoryCredentialReferences({ APPLIANCES_AMAZON_CREATORS_CLIENT_ID: "secret-value" });
    expect(inventory[0]).toMatchObject({ status: "INCOMPLETE", presentReferences: ["APPLIANCES_AMAZON_CREATORS_CLIENT_ID"] });
    expect(JSON.stringify(inventory)).not.toContain("secret-value");
  });
  it("stops immediately on authorization failure", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 403 }));
    expect(await boundedProviderRequest("https://example.test/feed", {}, fetcher as typeof fetch)).toEqual({ status: "AUTHORIZATION_FAILED", attempts: 1, httpStatus: 403 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("honours rate limits without retrying around them", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 429 }));
    expect(await boundedProviderRequest("https://example.test/feed", {}, fetcher as typeof fetch)).toEqual({ status: "RATE_LIMITED", attempts: 1, httpStatus: 429 });
  });
  it("bounds retryable failures", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 503 }));
    expect(await boundedProviderRequest("https://example.test/feed", {}, fetcher as typeof fetch, 20)).toEqual({ status: "FETCH_FAILED", attempts: 3, httpStatus: 503 });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("requires explicit media rights and exact identity", () => {
    const base = { exactProductId: "P1", sourceUrl: "https://cdn.example.test/p1.webp", canonicalProductPage: "https://example.test/p1", mode: "REMOTE_DISPLAY" as const, grantReference: "licence-contract-opaque-ref", exactModelMatched: true };
    expect(admitCredentialedMedia({ ...base, grantReference: "" }, new Date())).toBeNull();
    expect(admitCredentialedMedia({ ...base, exactModelMatched: false }, new Date())).toBeNull();
  });
  it("preserves remote-display rules and never silently caches", () => {
    const base = { exactProductId: "P1", sourceUrl: "https://cdn.example.test/p1.webp", canonicalProductPage: "https://example.test/p1", grantReference: "licence-contract-opaque-ref", exactModelMatched: true };
    expect(admitCredentialedMedia({ ...base, mode: "CACHE_LOCAL" }, new Date())).toBeNull();
    const remote = admitCredentialedMedia({ ...base, mode: "REMOTE_DISPLAY" }, new Date());
    expect(remote).toMatchObject({ rightsStatus: "MANUFACTURER_PUBLISHED_REMOTE_DISPLAY", status: "EXACT_APPROVED" });
    expect(remote).not.toHaveProperty("localAssetPath");
  });
});
