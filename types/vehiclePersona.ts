export type VehiclePersonaTrait =
  | "DESIGN" | "DRIVING_ENGAGEMENT" | "COMFORT" | "PRACTICALITY"
  | "TECHNOLOGY" | "PRESTIGE" | "VALUE" | "ADVENTURE"
  | "FAMILY" | "URBAN" | "COMMERCIAL" | "SUSTAINABILITY" | "MINIMALISM";

export interface ResolvedVehiclePersona {
  readonly brand: string;
  readonly seriesGroup: string;
  readonly brandEditorial: string;
  readonly seriesEditorial: string;
  readonly traits: readonly VehiclePersonaTrait[];
  readonly authority: "OWNER_EDITORIAL";
  readonly decisionUse: "SOFT_PREFERENCE_ONLY";
}

export interface VehiclePersonaMatch {
  readonly score: number;
  readonly matchedTraits: readonly VehiclePersonaTrait[];
  readonly persona?: ResolvedVehiclePersona;
}
