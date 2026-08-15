import { describe, expect, it } from "vitest";
import { estimatedPriceBackfill01Records } from "@/data/production/estimatedPriceBackfill01";
import { assessCatalogReadiness } from "@/features/vehicle-data/assessCatalogReadiness";
describe("estimated price backfill",()=>{
  it("contains one official and four internal-only prices",()=>{ expect(estimatedPriceBackfill01Records).toHaveLength(5); expect(estimatedPriceBackfill01Records.filter(r=>r.prices[0].priceType==="ESTIMATE")).toHaveLength(4); expect(estimatedPriceBackfill01Records.filter(r=>r.prices[0].priceType==="ESTIMATE").every(r=>r.prices[0].consumerVisibility==="INTERNAL_ONLY"&&r.prices[0].confidence==="LOW")).toBe(true); });
  it("passes catalog readiness and never expires",()=>{ expect(estimatedPriceBackfill01Records.every(r=>assessCatalogReadiness(r,new Date("2028-01-01")).ready)).toBe(true); expect(estimatedPriceBackfill01Records.every(r=>r.prices[0].validUntil===undefined)).toBe(true); });
});
