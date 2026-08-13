import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";

export interface VehicleDataRepository {
  upsertPilotRecord(record: PilotVehicleRecord): Promise<void>;
}

export interface SqlQueryable {
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
}

export class PostgresVehicleDataRepository implements VehicleDataRepository {
  constructor(private readonly database: SqlQueryable) {}

  async upsertPilotRecord(record: PilotVehicleRecord): Promise<void> {
    const { identity } = record;
    await this.database.query("begin");
    try {
      await this.database.query(
        `insert into vehicle_variants
          (id, market, brand, model, body_style, trim, model_year, lifecycle_status)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (id) do update set
          brand=excluded.brand, model=excluded.model, body_style=excluded.body_style,
          trim=excluded.trim, model_year=excluded.model_year,
          lifecycle_status=excluded.lifecycle_status, updated_at=now()`,
        [identity.id, identity.market, identity.brand.value, identity.model.value,
          identity.bodyStyle.value, identity.trim.value, identity.modelYear.value,
          identity.lifecycleStatus],
      );

      for (const price of record.prices) {
        const provenance = price.provenance[0];
        const source = vehicleDataSourceById.get(provenance.sourceId);
        if (!source) throw new Error(`UNKNOWN_SOURCE:${provenance.sourceId}`);
        await this.database.query(
          `insert into data_sources
            (id, name, authority, homepage_url, terms_url, robots_url,
             usage_permission, license, reviewed_at, review_notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
           on conflict (id) do update set
            name=excluded.name, authority=excluded.authority, homepage_url=excluded.homepage_url,
            terms_url=excluded.terms_url, robots_url=excluded.robots_url,
            usage_permission=excluded.usage_permission, license=excluded.license,
            reviewed_at=excluded.reviewed_at, review_notes=excluded.review_notes`,
          [source.id, source.name, source.authority, source.homepageUrl,
            source.termsUrl ?? null, source.robotsUrl ?? null, source.usagePermission,
            source.license ?? null, source.reviewedAt, JSON.stringify(source.reviewNotes)],
        );
        const documentResult = await this.database.query(
          `insert into source_documents
            (source_id, source_url, accessed_at, published_at, document_version,
             extraction_method, limitations)
           values ($1,$2,$3,$4,$5,$6,$7::jsonb)
           on conflict (source_id, source_url, accessed_at, document_version)
           do update set limitations=excluded.limitations
           returning id`,
          [provenance.sourceId, provenance.sourceUrl, provenance.accessedAt,
            provenance.publishedAt ?? null, provenance.documentVersion ?? null,
            provenance.extractionMethod, JSON.stringify(provenance.limitations)],
        ) as { rows?: { id: string }[] };
        const sourceDocumentId = documentResult.rows?.[0]?.id;
        if (!sourceDocumentId) throw new Error("SOURCE_DOCUMENT_INSERT_FAILED");

        await this.database.query(
          `insert into variant_provenance (vehicle_variant_id, source_document_id)
           values ($1,$2) on conflict do nothing`,
          [identity.id, sourceDocumentId],
        );

        await this.database.query(
          `insert into price_observations
            (id, vehicle_variant_id, source_document_id, condition, amount_try,
             price_type, valid_from, valid_until, mileage_km, seller_type, confidence)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           on conflict (id) do nothing`,
          [price.id, price.vehicleVariantId, sourceDocumentId, price.condition,
            price.amountTry, price.priceType, price.validFrom, price.validUntil ?? null,
            price.mileageKm ?? null, price.sellerType ?? null, price.confidence],
        );
      }
      await this.database.query("commit");
    } catch (error) {
      await this.database.query("rollback");
      throw error;
    }
  }
}
