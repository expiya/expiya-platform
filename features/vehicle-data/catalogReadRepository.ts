import { z } from "zod";

import type { RecommendationCatalogResolution } from "@/features/vehicle-data/resolveRecommendationCatalog";
import type { SqlQueryable } from "@/features/vehicle-data/repository";
import type { BodyType, Car, FuelType, Transmission } from "@/types/car";
import type { ProductionFuelType } from "@/types/productionVehicle";
import { getPostgresDatabase } from "@/lib/server/postgres";

export interface VehicleCatalogReadRepository {
  readPublishedCatalog(at: Date): Promise<VehicleCatalogReadResult>;
}

export interface PublishedVehicleIdentity {
  readonly id: string;
  readonly brand: string;
  readonly model: string;
}

export interface VehicleCatalogReadResult extends RecommendationCatalogResolution {
  readonly identities: readonly PublishedVehicleIdentity[];
}

const rowSchema = z.object({
  id: z.string().uuid(),
  brand: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().min(1),
  body_style: z.string().min(1),
  model_year: z.coerce.number().int(),
  created_at: z.union([z.string(), z.date()]).transform((value) => new Date(value).toISOString()),
  updated_at: z.union([z.string(), z.date()]).transform((value) => new Date(value).toISOString()),
  amount_try: z.coerce.number().nonnegative(),
  facts: z.record(z.string(), z.unknown()),
});

const fuelMap: Readonly<Record<ProductionFuelType, FuelType | undefined>> = {
  GASOLINE: "Gasoline", DIESEL: "Diesel", LPG: "Gasoline", MHEV: "Hybrid",
  HEV: "Hybrid", PHEV: "Hybrid", BEV: "Electric", HYDROGEN: undefined,
};
const bodyMap: Readonly<Record<string, BodyType | undefined>> = {
  SEDAN: "Sedan", HATCHBACK: "Hatchback", SUV: "SUV", COUPE: "Coupe", PICKUP: "Pickup", VAN: "Van",
};

function adaptRow(row: z.infer<typeof rowSchema>): Car | undefined {
  const fuelType = row.facts["powertrain.fuelType"] as ProductionFuelType | undefined;
  const transmissionValue = row.facts["powertrain.transmission"];
  const fuel = fuelType && fuelMap[fuelType];
  const bodyType = bodyMap[row.body_style.toUpperCase()];
  const transmission: Transmission | undefined = typeof transmissionValue === "string" &&
    /automatic|dual-clutch|reduction gear|multidrive|e-cvt/i.test(transmissionValue) ? "Automatic" : undefined;
  if (!fuel || !bodyType || !transmission) return undefined;
  return {
    id: row.id, brand: row.brand, model: `${row.model} ${row.trim}`, year: row.model_year,
    price: row.amount_try, km: 0, fuel, transmission, bodyType,
    image: "/cars/production-placeholder.svg", createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const PUBLISHED_CATALOG_SQL = `
with eligible_documents as (
  select sd.id
  from source_documents sd
  join data_sources ds on ds.id = sd.source_id
  where ds.usage_permission in ('OPEN_LICENSE','PUBLIC_FACTS_ONLY','INTERNAL_ONLY')
    and ds.reviewed_at >= $1::timestamptz - interval '180 days'
), ineligible_documents as (
  select sd.id
  from source_documents sd
  join data_sources ds on ds.id = sd.source_id
  where ds.usage_permission not in ('OPEN_LICENSE','PUBLIC_FACTS_ONLY','INTERNAL_ONLY')
    or ds.reviewed_at < $1::timestamptz - interval '180 days'
), current_prices as (
  select distinct on (po.vehicle_variant_id)
    po.vehicle_variant_id, po.amount_try
  from price_observations po
  where po.condition = 'NEW'
    and po.valid_from <= $1
    and exists (
      select 1 from price_provenance pp
      join eligible_documents ed on ed.id = pp.source_document_id
      where pp.price_observation_id = po.id
    )
    and not exists (
      select 1 from price_provenance pp
      join ineligible_documents idoc on idoc.id = pp.source_document_id
      where pp.price_observation_id = po.id
    )
  order by po.vehicle_variant_id,
    case po.price_type when 'CAMPAIGN' then 0 when 'LIST' then 1 else 2 end,
    po.valid_from desc
), current_facts as (
  select distinct on (vf.vehicle_variant_id, vf.fact_key)
    vf.vehicle_variant_id, vf.fact_key, vf.value
  from vehicle_facts vf
  where vf.valid_from <= $1
    and (vf.valid_until is null or vf.valid_until >= $1)
    and exists (
      select 1 from fact_provenance fp
      join eligible_documents ed on ed.id = fp.source_document_id
      where fp.fact_id = vf.id
    )
    and not exists (
      select 1 from fact_provenance fp
      join ineligible_documents idoc on idoc.id = fp.source_document_id
      where fp.fact_id = vf.id
    )
  order by vf.vehicle_variant_id, vf.fact_key, vf.valid_from desc, vf.created_at desc
), fact_maps as (
  select vehicle_variant_id, jsonb_object_agg(fact_key, value) as facts
  from current_facts group by vehicle_variant_id
)
select vv.id, vv.brand, vv.model, vv.trim, vv.body_style, vv.model_year,
  vv.created_at, vv.updated_at, cp.amount_try, fm.facts
from vehicle_variants vv
join current_prices cp on cp.vehicle_variant_id = vv.id
join fact_maps fm on fm.vehicle_variant_id = vv.id
where vv.market = 'TR' and vv.lifecycle_status = 'ON_SALE'
  and fm.facts ? 'powertrain.fuelType'
  and fm.facts ? 'powertrain.powerKw'
  and fm.facts ? 'powertrain.transmission'
  and exists (
    select 1 from variant_provenance vp
    join eligible_documents ed on ed.id = vp.source_document_id
    where vp.vehicle_variant_id = vv.id
  )
  and not exists (
    select 1 from variant_provenance vp
    join ineligible_documents idoc on idoc.id = vp.source_document_id
    where vp.vehicle_variant_id = vv.id
  )
  and exists (
    select 1 from current_facts sf
    where sf.vehicle_variant_id = vv.id and sf.fact_key like 'safetyFeatureCodes.%'
  )
order by vv.brand, vv.model, vv.trim`;

export class PostgresVehicleCatalogReadRepository implements VehicleCatalogReadRepository {
  constructor(private readonly database: SqlQueryable) {}

  async readPublishedCatalog(at: Date): Promise<VehicleCatalogReadResult> {
    const result = await this.database.query(PUBLISHED_CATALOG_SQL, [at.toISOString()]) as { rows?: unknown[] };
    const cars: Car[] = [];
    const identities: PublishedVehicleIdentity[] = [];
    const limitations: string[] = [];
    for (const [index, rawRow] of (result.rows ?? []).entries()) {
      const parsed = rowSchema.safeParse(rawRow);
      if (!parsed.success) {
        limitations.push(`database-row-${index}:INVALID_READ_MODEL`);
        continue;
      }
      const car = adaptRow(parsed.data);
      if (car) {
        cars.push(car);
        identities.push({ id: parsed.data.id, brand: parsed.data.brand, model: parsed.data.model });
      }
      else limitations.push(`${parsed.data.id}:LEGACY_ADAPTATION_FAILED`);
    }
    return {
      mode: "production",
      cars: Object.freeze(cars),
      identities: Object.freeze(identities),
      limitations: Object.freeze(limitations),
    };
  }
}

export function createConfiguredVehicleCatalogReadRepository(): VehicleCatalogReadRepository {
  return new PostgresVehicleCatalogReadRepository(getPostgresDatabase());
}
