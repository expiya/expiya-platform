import { describe, expect, it, vi } from "vitest";
import { adaptAmazonObservationMedia, createAmazonCreatorsApiAdapter } from "./amazonCreatorsApi.server";
import { admitManualAmazonAffiliateLink } from "./manualAffiliate";
import { projectExternalCommerceAction } from "./projection";
import type { ExactCommerceLookup, ProviderNeutralCommerceObservation } from "./providerContracts";
import exactFixture from "./fixtures/amazon-creators-get-items.exact.json";

const lookup: ExactCommerceLookup = { exactProductId: "PHILIPS_NA350_00_TR", categoryId: "AIR_FRYER", brand: "Philips", model: "3000 Series NA350/00", providerItemId: "B0CQMPH7BJ", exactModelTokens: ["NA350/00"] };
const environment = { APPLIANCES_AMAZON_CREATORS_CREDENTIAL_ID: "credential-id", APPLIANCES_AMAZON_CREATORS_CREDENTIAL_SECRET: "credential-secret", APPLIANCES_AMAZON_CREATORS_CREDENTIAL_VERSION: "3.2", APPLIANCES_AMAZON_CREATORS_PARTNER_TAG: "expiya-21" };
const now = new Date("2026-09-05T10:00:00.000Z");

function apiItem(overrides: Readonly<Record<string, unknown>> = {}) {
  return { ...exactFixture.itemsResult.items[0], ...overrides };
}

describe("Amazon Creators commerce boundary", () => {
  it("is deterministic and non-breaking without credentials", async () => {
    const fetcher = vi.fn();
    const result = await createAmazonCreatorsApiAdapter({ environment: {}, fetcher }).observeExactProducts([lookup]);
    expect(result).toEqual({ status: "DISABLED_NO_CREDENTIALS", observations: [], reason: "AMAZON_CREATORS_CREDENTIALS_ABSENT" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the EU v3.2 token endpoint and admits ASIN plus exact model evidence", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(exactFixture), { status: 200 }));
    const result = await createAmazonCreatorsApiAdapter({ environment, fetcher, now: () => now }).observeExactProducts([lookup]);
    expect(result.status).toBe("READY");
    if (result.status !== "READY") return;
    expect(result.observations[0]).toMatchObject({ providerItemId: lookup.providerItemId, exactProductId: lookup.exactProductId, categoryId: lookup.categoryId, availability: "IN_STOCK", amount: 8837.01, currency: "TRY" });
    expect(result.observations[0].image).toMatchObject({ cacheMode: "TRANSIENT_URL_ONLY", expiresAt: "2026-09-06T10:00:00.000Z" });
    expect(adaptAmazonObservationMedia(result.observations[0], "associates-final-acceptance:internal-reference", now)).toMatchObject({ governance: { disposition: "AFFILIATE_API_TRANSIENT", cache: { mode: "TRANSIENT_URL_ONLY" } } });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.amazon.co.uk/auth/o2/token");
    expect(fetcher.mock.calls[1][0]).toBe("https://creatorsapi.amazon/catalog/v1/getItems");
    expect(JSON.stringify(result)).not.toContain("credential-secret");
  });

  it("caches OAuth tokens inside the server adapter for their bounded lifetime", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "access-token", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(exactFixture), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(exactFixture), { status: 200 }));
    const adapter = createAmazonCreatorsApiAdapter({ environment, fetcher, now: () => now });
    expect((await adapter.observeExactProducts([lookup])).status).toBe("READY");
    expect((await adapter.observeExactProducts([lookup])).status).toBe("READY");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.filter(call => call[0] === "https://api.amazon.co.uk/auth/o2/token")).toHaveLength(1);
  });

  it("fails closed for partial, cross-model, and rate-limited responses", async () => {
    const partial = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ itemsResult: { items: [] } }), { status: 200 }));
    expect(await createAmazonCreatorsApiAdapter({ environment, fetcher: partial }).observeExactProducts([lookup])).toMatchObject({ status: "RESPONSE_REJECTED", observations: [] });
    const mismatch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ itemsResult: { items: [apiItem({ itemInfo: { title: { displayValue: "Philips Airfryer NA351/00" }, byLineInfo: { brand: { displayValue: "Philips" } }, manufactureInfo: { model: { displayValue: "NA351/00" } } } })] } }), { status: 200 }));
    expect(await createAmazonCreatorsApiAdapter({ environment, fetcher: mismatch }).observeExactProducts([lookup])).toMatchObject({ status: "RESPONSE_REJECTED", observations: [] });
    const titleOnly = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 })).mockResolvedValueOnce(new Response(JSON.stringify({ itemsResult: { items: [apiItem({ itemInfo: { title: { displayValue: "Replacement filter compatible with Philips NA350/00" }, byLineInfo: { brand: { displayValue: "Philips" } }, manufactureInfo: { model: { displayValue: "FILTER-123" } } } })] } }), { status: 200 }));
    expect(await createAmazonCreatorsApiAdapter({ environment, fetcher: titleOnly }).observeExactProducts([lookup])).toMatchObject({ status: "RESPONSE_REJECTED", observations: [] });
    const limited = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 }));
    expect(await createAmazonCreatorsApiAdapter({ environment, fetcher: limited }).observeExactProducts([lookup])).toMatchObject({ status: "RATE_LIMITED", observations: [] });
  });

  it("projects only fresh, exact, tagged observations and exposes no decision fields", () => {
    const observation = admitManualAmazonAffiliateLink({ lookup, canonicalDetailUrl: `https://www.amazon.com.tr/dp/${lookup.providerItemId}?tag=expiya-21`, observedTitle: "Philips NA350/00 Airfryer", observedBrand: "Philips", observedModelEvidence: ["NA350/00"], suppliedAt: now.toISOString(), expiresAt: "2026-09-06T10:00:00.000Z", auditReference: "manual-observation:approved-1" });
    expect(observation).not.toBeNull();
    const action = projectExternalCommerceAction(observation!, lookup, new Date("2026-09-05T11:00:00.000Z"), "expiya-21");
    expect(action).toMatchObject({ label: "Amazon’da görüntüle", rel: "nofollow sponsored noreferrer", exactProductId: lookup.exactProductId });
    expect(action).not.toHaveProperty("score");
    expect(action).not.toHaveProperty("rank");
    expect(action).not.toHaveProperty("authorizationFingerprint");
    expect(projectExternalCommerceAction({ ...observation!, availability: "UNKNOWN" }, lookup, now)).toBeNull();
    expect(projectExternalCommerceAction(observation!, { ...lookup, categoryId: "BLENDER" }, now)).toBeNull();
    expect(projectExternalCommerceAction(observation!, lookup, new Date("2026-09-07T10:00:00.000Z"))).toBeNull();
  });

  it("keeps manual links provisional, audited, tagged, and seven-day bounded", () => {
    const base = { lookup, canonicalDetailUrl: `https://www.amazon.com.tr/dp/${lookup.providerItemId}?tag=expiya-21`, observedTitle: "Philips NA350/00 Airfryer", observedBrand: "Philips", observedModelEvidence: ["NA350/00"], suppliedAt: now.toISOString(), expiresAt: "2026-09-06T10:00:00.000Z", auditReference: "manual-observation:approved-1" };
    expect(admitManualAmazonAffiliateLink({ ...base, canonicalDetailUrl: `https://www.amazon.com.tr/dp/${lookup.providerItemId}` })).toBeNull();
    expect(admitManualAmazonAffiliateLink({ ...base, auditReference: "" })).toBeNull();
    expect(admitManualAmazonAffiliateLink({ ...base, expiresAt: "2026-09-13T10:00:00.000Z" })).toBeNull();
  });

  it("does not let commerce mutate technical decision fingerprints", () => {
    const decision = Object.freeze({ candidatePoolFingerprint: "pool", candidateEvaluationFingerprint: "evaluation", sufficiencyFingerprint: "sufficiency", selectionFingerprint: "selection", authorizationFingerprint: "authorization", questionOrder: ["INSTALLATION", "CAPACITY"] });
    const unavailable: Partial<ProviderNeutralCommerceObservation> = { availability: "UNAVAILABLE" };
    const active: Partial<ProviderNeutralCommerceObservation> = { availability: "IN_STOCK", amount: 1, merchant: "Amazon" };
    expect({ ...decision, commerce: unavailable }).toMatchObject(decision);
    expect({ ...decision, commerce: active }).toMatchObject(decision);
    expect(decision.questionOrder).toEqual(["INSTALLATION", "CAPACITY"]);
  });
});
