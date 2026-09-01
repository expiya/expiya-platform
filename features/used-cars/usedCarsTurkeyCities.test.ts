import { describe, expect, it } from "vitest";
import { parseSelectedCities, TURKEY_CITY_NAMES } from "./demo/turkeyCities";
describe("used-cars Turkey city filter", () => {
  it("contains all 81 provinces", () => expect(TURKEY_CITY_NAMES).toHaveLength(81));
  it("accepts known cities and caps the hard filter at five", () => expect(parseSelectedCities("İstanbul,Ankara,İzmir,Bursa,Antalya,Adana,Bilinmeyen")).toEqual(["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya"]));
});
