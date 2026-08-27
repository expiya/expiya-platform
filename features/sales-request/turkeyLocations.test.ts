import { describe, expect, it } from "vitest";
import { districtsForProvince, isValidProvinceDistrict, TURKEY_PROVINCE_DISTRICTS, TURKEY_PROVINCES } from "./turkeyLocations";

describe("Turkey province and district directory", () => {
  it("contains 81 provinces and 922 districts", () => {
    expect(TURKEY_PROVINCES).toHaveLength(81);
    expect(Object.values(TURKEY_PROVINCE_DISTRICTS).flat()).toHaveLength(922);
  });

  it("binds districts to their selected province", () => {
    expect(districtsForProvince("İstanbul")).toContain("Kadıköy");
    expect(isValidProvinceDistrict("İstanbul", "Kadıköy")).toBe(true);
    expect(isValidProvinceDistrict("İstanbul", "Çankaya")).toBe(false);
  });
});
