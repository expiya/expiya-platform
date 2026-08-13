import type { PublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { BodyType, Car, FuelType, Transmission } from "@/types/car";
import type { ProductionFuelType } from "@/types/productionVehicle";

const fuelMap: Readonly<Record<ProductionFuelType, FuelType | undefined>> = {
  GASOLINE: "Gasoline", DIESEL: "Diesel", LPG: "Gasoline", MHEV: "Hybrid",
  HEV: "Hybrid", PHEV: "Hybrid", BEV: "Electric", HYDROGEN: undefined,
};

const bodyMap: Readonly<Record<string, BodyType | undefined>> = {
  SEDAN: "Sedan", HATCHBACK: "Hatchback", SUV: "SUV", COUPE: "Coupe",
  PICKUP: "Pickup", VAN: "Van",
};

export interface CarsCatalogAdaptation {
  readonly cars: readonly Car[];
  readonly rejectedVehicleVariantIds: readonly string[];
}

export function adaptPublishedCatalogToCars(catalog: PublishedCatalog): CarsCatalogAdaptation {
  const cars: Car[] = [];
  const rejectedVehicleVariantIds: string[] = [];

  for (const { variant, activeNewPrice } of catalog.records) {
    const fuel = fuelMap[variant.powertrain.fuelType.value];
    const bodyType = bodyMap[variant.bodyStyle.value.toUpperCase()];
    const transmission: Transmission | undefined = /automatic|dual-clutch|reduction gear/i
      .test(variant.powertrain.transmission.value) ? "Automatic" : undefined;
    if (!fuel || !bodyType || !transmission) {
      rejectedVehicleVariantIds.push(variant.id);
      continue;
    }
    cars.push({
      id: variant.id,
      brand: variant.brand.value,
      model: `${variant.model.value} ${variant.trim.value}`,
      year: variant.modelYear.value,
      price: activeNewPrice.amountTry,
      km: 0,
      fuel,
      transmission,
      bodyType,
      image: "/cars/production-placeholder.svg",
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    });
  }
  return { cars: Object.freeze(cars), rejectedVehicleVariantIds: Object.freeze(rejectedVehicleVariantIds) };
}
