import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";
import { vehicleDataSourceById } from "@/data/production/vehicleDataSources";
import { flattenVariantFacts } from "@/features/vehicle-data/flattenVariantFacts";
import type { ProvenanceRecord } from "@/types/productionVehicle";

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

      const documentIds = new Map<string, string>();
      const persistDocument = async (provenance: ProvenanceRecord): Promise<string> => {
        const cacheKey = [provenance.sourceId, provenance.sourceUrl, provenance.accessedAt, provenance.documentVersion ?? ""].join("|");
        const cached = documentIds.get(cacheKey);
        if (cached) return cached;

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
        const result = await this.database.query(
          `insert into source_documents
            (source_id, source_url, accessed_at, published_at, document_version,
             content_sha256, extraction_method, limitations)
           values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           on conflict (source_id, source_url, accessed_at, document_version)
           do update set content_sha256=coalesce(excluded.content_sha256, source_documents.content_sha256),
             limitations=excluded.limitations
           returning id`,
          [provenance.sourceId, provenance.sourceUrl, provenance.accessedAt,
            provenance.publishedAt ?? null, provenance.documentVersion ?? null,
            provenance.contentHash ?? null, provenance.extractionMethod, JSON.stringify(provenance.limitations)],
        ) as { rows?: { id: string }[] };
        const id = result.rows?.[0]?.id;
        if (!id) throw new Error("SOURCE_DOCUMENT_INSERT_FAILED");
        documentIds.set(cacheKey, id);
        return id;
      };

      const identityValues: readonly { readonly provenance: readonly ProvenanceRecord[] }[] = [
        identity.brand, identity.model, identity.bodyStyle, identity.trim, identity.modelYear,
      ];
      for (const sourcedValue of identityValues) {
        for (const provenance of sourcedValue.provenance) {
          const sourceDocumentId = await persistDocument(provenance);
          await this.database.query(
            `insert into variant_provenance (vehicle_variant_id, source_document_id)
             values ($1,$2) on conflict do nothing`,
            [identity.id, sourceDocumentId],
          );
        }
      }

      if (record.technicalVariant) {
        for (const fact of flattenVariantFacts(record.technicalVariant)) {
          const factResult = await this.database.query(
            `insert into vehicle_facts
              (vehicle_variant_id, fact_key, value, unit, confidence, valid_from,
               conflict_group_id, ingestion_key)
             values ($1,$2,$3::jsonb,$4,$5,$6,$7,$8)
             on conflict (ingestion_key) where ingestion_key is not null do update set
               value=excluded.value, unit=excluded.unit, confidence=excluded.confidence,
               conflict_group_id=excluded.conflict_group_id
             returning id`,
            [identity.id, fact.key, JSON.stringify(fact.value), fact.unit ?? null,
              fact.confidence, fact.validFrom, fact.conflictGroupId ?? null, fact.ingestionKey],
          ) as { rows?: { id: string }[] };
          const factId = factResult.rows?.[0]?.id;
          if (!factId) throw new Error("VEHICLE_FACT_INSERT_FAILED");
          for (const provenance of fact.provenance) {
            const sourceDocumentId = await persistDocument(provenance);
            await this.database.query(
              `insert into fact_provenance (fact_id, source_document_id)
               values ($1,$2) on conflict do nothing`,
              [factId, sourceDocumentId],
            );
          }
        }
      }

      for (const price of record.prices) {
        const sourceDocumentId = await persistDocument(price.provenance[0]);

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
        for (const provenance of price.provenance) {
          const provenanceDocumentId = await persistDocument(provenance);
          await this.database.query(
            `insert into price_provenance (price_observation_id, source_document_id)
             values ($1,$2) on conflict do nothing`,
            [price.id, provenanceDocumentId],
          );
        }
      }
      await this.database.query("commit");
    } catch (error) {
      await this.database.query("rollback");
      throw error;
    }
  }
}
