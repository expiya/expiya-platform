import { describe, expect, it } from "vitest";

import { cars } from "@/data/car";
import {
  carSatisfiesUseRequirements,
  resolveVehicleUseRequirements,
} from "./resolveVehicleUseRequirements";

describe("vehicle use requirements", () => {
  it.each([
    ["İşim için yük taşımak istiyorum", "CARGO"],
    ["Her gün koli ve malzeme taşıyacağım", "CARGO"],
    ["Personel servisi için kullanacağım", "PASSENGER_TRANSPORT"],
    ["Karavan çekeceğim", "TOWING"],
    ["Bozuk köy yollarında kullanacağım", "OFF_ROAD"],
    ["Çocuk koltuğu ve aile kullanımı", "FAMILY"],
    ["Park yeri dar, küçük araba olsun", "COMPACT_CITY"],
    ["Çok küçük şehir arabası da olur", "COMPACT_CITY"],
  ])("recognizes %s as %s", (text, requirement) => {
    expect(resolveVehicleUseRequirements(text)).toContain(requirement);
  });

  it("never accepts a sedan for cargo hauling", () => {
    const cargo = resolveVehicleUseRequirements("Yük taşıma işi yapacağım");
    const eligible = cars.filter((car) => carSatisfiesUseRequirements(car, cargo));

    expect(eligible.map((car) => car.bodyType)).toEqual(["Pickup", "Pickup", "Van", "Van"]);
  });

  it("requires every explicit use requirement instead of weakening contradictions", () => {
    const requirements = resolveVehicleUseRequirements("Hem yük taşıyacağım hem parkı zor küçük araba istiyorum");

    expect(cars.filter((car) => carSatisfiesUseRequirements(car, requirements))).toEqual([]);
  });
});
