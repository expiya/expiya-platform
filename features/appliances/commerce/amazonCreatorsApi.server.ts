import "server-only";
import { createHash } from "node:crypto";
import { boundedProviderRequest } from "./credentialedActivation";
import { hasExactModelMatch } from "./authority";
import { adaptAmazonCreatorsImage } from "../media/amazonCreatorsAdapter";
import type { CommerceProviderPort, CommerceProviderResult, ExactCommerceLookup, ProviderNeutralCommerceObservation } from "./providerContracts";

const AMAZON_MARKETPLACE = "www.amazon.com.tr" as const;
const AMAZON_API_ENDPOINT = "https://creatorsapi.amazon/catalog/v1/getItems" as const;
const OFFER_TTL_MS = 3_600_000;
const CONTENT_TTL_MS = 86_400_000;

type Environment = Readonly<Record<string, string | undefined>>;
interface AdapterOptions { readonly environment: Environment; readonly fetcher?: typeof fetch; readonly now?: () => Date }

function first(environment: Environment, ...names: readonly string[]): string | undefined {
  return names.map(name => environment[name]?.trim()).find(Boolean);
}

function disabled(reason: string, status: Exclude<CommerceProviderResult["status"], "READY"> = "DISABLED_NO_CREDENTIALS"): CommerceProviderResult {
  return { status, observations: [], reason };
}

function record(value: unknown): Readonly<Record<string, unknown>> { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {}; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function nestedText(value: unknown): string { const item = record(value); return text(item.displayValue) || text(item.value); }
function availability(value: string): ProviderNeutralCommerceObservation["availability"] {
  const normalized = value.replace(/[^A-Z]/giu, "").toUpperCase();
  if (normalized === "INSTOCK") return "IN_STOCK";
  if (normalized === "INSTOCKSCARCE") return "LIMITED";
  if (["OUTOFSTOCK", "UNAVAILABLE"].includes(normalized)) return "UNAVAILABLE";
  return "UNKNOWN";
}

export function adaptAmazonCreatorsItem(
  raw: unknown,
  lookup: ExactCommerceLookup,
  retrievedAt: Date,
  responseReference: string,
): ProviderNeutralCommerceObservation | null {
  const item = record(raw), asin = text(item.asin), info = record(item.itemInfo), manufacture = record(info.manufactureInfo);
  const title = nestedText(info.title), observedModel = nestedText(manufacture.model), partNumber = nestedText(manufacture.itemPartNumber);
  const byLine = record(info.byLineInfo), observedBrand = nestedText(byLine.brand) || nestedText(byLine.manufacturer);
  // Title similarity is retained as evidence but cannot establish exact identity.
  const structuredModelEvidence = [observedModel, partNumber].filter(Boolean);
  const matchedModelTokens = lookup.exactModelTokens.filter(token => structuredModelEvidence.some(evidence => hasExactModelMatch(token, evidence)));
  const detailPageUrl = text(item.detailPageURL) || text(item.detailPageUrl);
  if (asin !== lookup.providerItemId || !/^[A-Z0-9]{10}$/u.test(asin) || !title
    || !hasExactModelMatch(lookup.brand, observedBrand) || !lookup.exactModelTokens.length || matchedModelTokens.length !== lookup.exactModelTokens.length) return null;
  let detailUrl: URL;
  try { detailUrl = new URL(detailPageUrl); } catch { return null; }
  if (detailUrl.protocol !== "https:" || detailUrl.hostname !== AMAZON_MARKETPLACE || !detailUrl.searchParams.get("tag")?.trim()
    || !detailUrl.pathname.includes(asin)) return null;
  const listing = Array.isArray(record(item.offersV2).listings) ? (record(item.offersV2).listings as readonly unknown[]).map(record).find(value => record(value.condition).value === "New" || !record(value.condition).value) : undefined;
  const observedAvailability = listing ? availability(text(record(listing.availability).type)) : "UNAVAILABLE";
  const price = record(record(listing?.price).money), amount = Number(price.amount), currency = text(price.currency);
  const merchant = nestedText(record(listing?.merchantInfo).name) || text(record(listing?.merchantInfo).name);
  const image = record(record(item.images).primary), large = record(image.large), imageUrl = text(large.url);
  const observedAt = retrievedAt.toISOString(), expiresAt = new Date(retrievedAt.getTime() + OFFER_TTL_MS).toISOString();
  const identityEvidence = { providerItemIdMatched: true as const, categoryIdMatched: true as const, brandMatched: true as const, matchedModelTokens, observedTitle: title, ...(observedModel ? { observedManufacturerModel: observedModel } : {}), ...(partNumber ? { observedManufacturerPartNumber: partNumber } : {}) };
  const id = createHash("sha256").update(`${lookup.exactProductId}|${asin}|${observedAt}|${observedAvailability}`).digest("hex");
  return Object.freeze({ schemaVersion: "appliances-commerce-provider/v1", observationId: `amazon-creators:${id}`, provider: "AMAZON_CREATORS_API", source: "PROVIDER_API", exactProductId: lookup.exactProductId, categoryId: lookup.categoryId, providerItemId: asin, canonicalDetailUrl: detailUrl.toString(), availability: observedAvailability, retrievedAt: observedAt, expiresAt, identityEvidence, ...(merchant ? { merchant } : {}), ...(Number.isFinite(amount) && amount > 0 && currency === "TRY" ? { amount, currency: "TRY" as const } : {}), ...(imageUrl.startsWith("https://") ? { image: { url: imageUrl, width: Number(large.width) || undefined, height: Number(large.height) || undefined, expiresAt: new Date(retrievedAt.getTime() + CONTENT_TTL_MS).toISOString(), cacheMode: "TRANSIENT_URL_ONLY" as const } } : {}), provenance: { providerResponseReference: responseReference, attributionRequired: true as const, license: "AMAZON_ASSOCIATES_CREATORS_API" as const } });
}

/** Reuses the existing governed-media adapter; commerce never copies Amazon image bytes. */
export function adaptAmazonObservationMedia(observation: ProviderNeutralCommerceObservation, associatesAcceptanceReference: string, now = new Date()) {
  if (observation.provider !== "AMAZON_CREATORS_API" || observation.source !== "PROVIDER_API" || !observation.image) return null;
  return adaptAmazonCreatorsImage({ exactProductId: observation.exactProductId, asin: observation.providerItemId, imageUrl: observation.image.url, detailPageUrl: observation.canonicalDetailUrl, retrievedAt: observation.retrievedAt, exactModelEvidence: [...observation.identityEvidence.matchedModelTokens, observation.identityEvidence.observedTitle], associatesAcceptanceReference }, now);
}

export function createAmazonCreatorsApiAdapter(options: AdapterOptions): CommerceProviderPort {
  const fetcher = options.fetcher ?? fetch, clock = options.now ?? (() => new Date());
  const credentialId = first(options.environment, "APPLIANCES_AMAZON_CREATORS_CREDENTIAL_ID", "APPLIANCES_AMAZON_CREATORS_CLIENT_ID");
  const credentialSecret = first(options.environment, "APPLIANCES_AMAZON_CREATORS_CREDENTIAL_SECRET", "APPLIANCES_AMAZON_CREATORS_CLIENT_SECRET");
  const credentialVersion = first(options.environment, "APPLIANCES_AMAZON_CREATORS_CREDENTIAL_VERSION") ?? "3.2";
  const partnerTag = first(options.environment, "APPLIANCES_AMAZON_CREATORS_PARTNER_TAG");
  const present = [credentialId, credentialSecret, partnerTag].filter(Boolean).length;
  let cachedToken: { readonly value: string; readonly expiresAt: number } | null = null;
  return Object.freeze({
    provider: "AMAZON_CREATORS_API" as const,
    async observeExactProducts(lookups: readonly ExactCommerceLookup[]): Promise<CommerceProviderResult> {
      if (present === 0) return disabled("AMAZON_CREATORS_CREDENTIALS_ABSENT");
      if (present !== 3 || credentialVersion !== "3.2") return disabled("AMAZON_CREATORS_CONFIGURATION_INCOMPLETE", "MISCONFIGURED");
      if (!lookups.length) return { status: "READY", observations: [] };
      if (lookups.length > 10 || lookups.some(item => !/^[A-Z0-9]{10}$/u.test(item.providerItemId) || !item.exactModelTokens.length)) return disabled("LOOKUP_BATCH_REJECTED", "MISCONFIGURED");
      const requestTime = clock().getTime();
      let token = cachedToken && cachedToken.expiresAt > requestTime ? cachedToken.value : "";
      if (!token) {
        const tokenResult = await boundedProviderRequest("https://api.amazon.co.uk/auth/o2/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grant_type: "client_credentials", client_id: credentialId, client_secret: credentialSecret, scope: "creatorsapi::default" }) }, fetcher, 1);
        if (tokenResult.status !== "OK") return tokenResult.status === "RATE_LIMITED"
          ? disabled("TOKEN_RATE_LIMITED", "RATE_LIMITED")
          : tokenResult.status === "AUTHORIZATION_FAILED" ? disabled("TOKEN_AUTHORIZATION_FAILED", "AUTHORIZATION_FAILED") : disabled("TOKEN_ENDPOINT_UNAVAILABLE", "PROVIDER_UNAVAILABLE");
        let payload: Readonly<Record<string, unknown>>;
        try { payload = record(await tokenResult.response.json()); } catch { return disabled("TOKEN_RESPONSE_REJECTED", "RESPONSE_REJECTED"); }
        token = text(payload.access_token);
        if (!token) return disabled("TOKEN_RESPONSE_REJECTED", "RESPONSE_REJECTED");
        const lifetimeSeconds = Math.max(60, Math.min(3_600, Number(payload.expires_in) || 3_600));
        cachedToken = { value: token, expiresAt: requestTime + lifetimeSeconds * 1_000 - 30_000 };
      }
      const apiResult = await boundedProviderRequest(AMAZON_API_ENDPOINT, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-marketplace": AMAZON_MARKETPLACE }, body: JSON.stringify({ itemIds: lookups.map(item => item.providerItemId), partnerTag, marketplace: AMAZON_MARKETPLACE, resources: ["itemInfo.title", "itemInfo.byLineInfo", "itemInfo.manufactureInfo", "images.primary.large", "offersV2.listings.availability", "offersV2.listings.condition", "offersV2.listings.merchantInfo", "offersV2.listings.price"] }) }, fetcher, 2);
      if (apiResult.status !== "OK") return disabled(apiResult.status === "RATE_LIMITED" ? "AMAZON_CREATORS_RATE_LIMITED" : apiResult.status === "AUTHORIZATION_FAILED" ? "AMAZON_CREATORS_AUTHORIZATION_FAILED" : "AMAZON_CREATORS_UNAVAILABLE", apiResult.status === "RATE_LIMITED" ? "RATE_LIMITED" : apiResult.status === "AUTHORIZATION_FAILED" ? "AUTHORIZATION_FAILED" : "PROVIDER_UNAVAILABLE");
      let response: Readonly<Record<string, unknown>>;
      try { response = record(await apiResult.response.json()); } catch { return disabled("AMAZON_CREATORS_RESPONSE_REJECTED", "RESPONSE_REJECTED"); }
      const items = Array.isArray(record(response.itemsResult).items) ? record(response.itemsResult).items as readonly unknown[] : [];
      const retrievedAt = clock(), observations = lookups.flatMap(lookup => { const raw = items.find(item => text(record(item).asin) === lookup.providerItemId); if (!raw) return []; const observation = adaptAmazonCreatorsItem(raw, lookup, retrievedAt, `creators-api:${retrievedAt.toISOString()}`); return observation ? [observation] : []; });
      if (observations.length !== lookups.length) return disabled("PARTIAL_OR_AMBIGUOUS_RESPONSE_REJECTED", "RESPONSE_REJECTED");
      return { status: "READY", observations };
    },
  });
}
