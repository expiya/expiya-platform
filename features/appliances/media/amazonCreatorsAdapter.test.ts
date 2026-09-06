import { describe, expect, it } from "vitest";
import { adaptAmazonCreatorsImage } from "./amazonCreatorsAdapter";

const now = new Date("2026-09-05T12:00:00.000Z");
const record = { exactProductId: "BOSCH_BGC41PET_TR", asin: "B0ABC12345", imageUrl: "https://images-na.ssl-images-amazon.com/images/I/example.jpg", detailPageUrl: "https://www.amazon.com.tr/dp/B0ABC12345?tag=expiya-21", retrievedAt: "2026-09-05T11:00:00.000Z", exactModelEvidence: ["Creators API title contains exact model BGC41PET."], associatesAcceptanceReference: "amazon-associates-account:approved" };

describe("Amazon Creators API product-image adapter", () => {
  it("returns an exact, linked, disclosed URL-only record expiring within 24 hours", () => {
    expect(adaptAmazonCreatorsImage(record, now)).toMatchObject({
      remoteSrc: record.imageUrl,
      governance: { disposition: "AFFILIATE_API_TRANSIENT", requiredLinkTarget: record.detailPageUrl, cache: { mode: "TRANSIENT_URL_ONLY", maxAgeSeconds: 86_400 }, identity: { scope: "EXACT_PRODUCT" } },
    });
  });
  it("rejects stale image links, malformed ASINs and non-Amazon targets", () => {
    expect(adaptAmazonCreatorsImage({ ...record, retrievedAt: "2026-09-04T11:00:00.000Z" }, now)).toBeNull();
    expect(adaptAmazonCreatorsImage({ ...record, asin: "bad" }, now)).toBeNull();
    expect(adaptAmazonCreatorsImage({ ...record, detailPageUrl: "https://example.com/product" }, now)).toBeNull();
  });
});
