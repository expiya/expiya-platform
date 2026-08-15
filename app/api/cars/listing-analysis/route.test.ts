import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeVehicleListing: vi.fn(),
  readVehicleListingPage: vi.fn(),
}));

vi.mock("@/features/listing/analyzeVehicleListing", () => ({
  analyzeVehicleListing: mocks.analyzeVehicleListing,
}));
vi.mock("@/features/listing/readVehicleListingPage", () => ({
  readVehicleListingPage: mocks.readVehicleListingPage,
}));

import { PHASE1_USED_LISTING_ANALYSIS_ACTIVE } from "@/features/listing/phase1ListingAnalysisGate";

import { POST } from "./route";

describe("POST /api/cars/listing-analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gates used-listing analysis in Phase 1 without fetching the page", async () => {
    expect(PHASE1_USED_LISTING_ANALYSIS_ACTIVE).toBe(false);
    const response = await POST(new Request("http://localhost/api/cars/listing-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
      },
      body: JSON.stringify({
        url: "https://www.sahibinden.com/ilan/hyundai-ioniq-9",
        userContext: "Bu ilan alınır mı?",
      }),
    }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      gated: true,
      product: "NEW_CAR_CONFIGURATION",
    });
    expect(mocks.readVehicleListingPage).not.toHaveBeenCalled();
    expect(mocks.analyzeVehicleListing).not.toHaveBeenCalled();
  });
});
