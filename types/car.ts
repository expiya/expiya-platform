export type FuelType =
  | "Gasoline"
  | "Diesel"
  | "Hybrid"
  | "Electric";

export type Transmission =
  | "Manual"
  | "Automatic";

export type BodyType =
  | "Sedan"
  | "Hatchback"
  | "SUV"
  | "Coupe"
  | "Pickup"
  | "Van";

export interface Car {
  id: string;

  brand: string;
  model: string;

  year: number;
  price: number;
  /** Price may participate in ranking/filtering but must not be rendered when false. */
  priceDisplayAllowed?: boolean;
  km: number;

  fuel: FuelType;
  transmission: Transmission;
  bodyType: BodyType;

  image: string;
  /** Exactness of the vehicle image; representative images must be labelled in UI. */
  imageStatus?: "EXACT" | "REPRESENTATIVE" | "APPROXIMATE" | "PLACEHOLDER";
  imageAttribution?: string;
  /** Actual model represented when an approximate image fallback is used. */
  imageRepresentativeOf?: string;

  createdAt: string;
  updatedAt: string;
}
