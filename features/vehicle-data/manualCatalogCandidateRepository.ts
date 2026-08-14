import type { ManualCatalogCandidate } from "@/features/vehicle-data/manualCatalogCandidates";
import type { SqlQueryable } from "@/features/vehicle-data/repository";

export interface ManualCandidateBatch {
  readonly id: string;
  readonly sourcePlatform: ManualCatalogCandidate["sourcePlatform"];
  readonly suppliedBy: string;
  readonly capturedAt: string;
  readonly originalFilename: string;
  readonly contentSha256: string;
  readonly usageAttestation: string;
  readonly sourceCategoryUrl?: string;
  readonly sourceUrl?: string;
  readonly extractionMethod?: "USER_SUBMISSION" | "PUBLIC_PAGE" | "SITEMAP" | "API" | "LICENSED_FEED";
  readonly permissionStatus?: "USER_ATTESTED" | "RESEARCH_ONLY" | "ALLOWED" | "CONTRACT_REQUIRED" | "PROHIBITED";
  readonly robotsUrl?: string;
  readonly termsUrl?: string;
  readonly permissionReviewedAt?: string;
  readonly licenseNotes?: string;
}

export class PostgresManualCatalogCandidateRepository {
  constructor(private readonly database: SqlQueryable) {}

  async importBatch(batch: ManualCandidateBatch, candidates: readonly ManualCatalogCandidate[]): Promise<void> {
    const pooledConnection = this.database.connect ? await this.database.connect() : undefined;
    const connection = pooledConnection ?? this.database;
    await connection.query("begin");
    try {
      const batchInsert = await connection.query(
        `insert into catalog_candidate_batches
          (id, source_platform, supplied_by, captured_at, original_filename, content_sha256,
           usage_attestation, source_category_url, source_url, extraction_method, permission_status,
           robots_url, terms_url, permission_reviewed_at, license_notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         on conflict (content_sha256) do nothing returning id`,
        [batch.id, batch.sourcePlatform, batch.suppliedBy, batch.capturedAt, batch.originalFilename,
          batch.contentSha256, batch.usageAttestation, batch.sourceCategoryUrl ?? null,
          batch.sourceUrl ?? null, batch.extractionMethod ?? "USER_SUBMISSION",
          batch.permissionStatus ?? "USER_ATTESTED", batch.robotsUrl ?? null, batch.termsUrl ?? null,
          batch.permissionReviewedAt ?? null, batch.licenseNotes ?? null],
      ) as { rows?: { id: string }[] };
      if (!batchInsert.rows?.[0]?.id) {
        await connection.query("commit");
        return;
      }
      for (const candidate of candidates) {
        await connection.query(
          `insert into catalog_candidates
            (id, batch_id, source_row_number, brand_raw, model_raw, generation_raw, body_style_raw,
             year_from, year_until, fuel_raw, transmission_raw, engine_raw, trim_raw, occurrence_count,
             notes, normalized_brand, normalized_model, candidate_fingerprint)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           on conflict (batch_id, source_row_number) do nothing`,
          [candidate.id, batch.id, candidate.sourceRowNumber, candidate.brandRaw, candidate.modelRaw,
            candidate.generationRaw ?? null, candidate.bodyStyleRaw ?? null, candidate.yearFrom ?? null,
            candidate.yearUntil ?? null, candidate.fuelRaw ?? null, candidate.transmissionRaw ?? null,
            candidate.engineRaw ?? null, candidate.trimRaw ?? null, candidate.occurrenceCount,
            candidate.notes ?? null, candidate.normalizedBrand, candidate.normalizedModel, candidate.fingerprint],
        );
        await connection.query(
          `insert into vehicle_aliases (candidate_id, alias_text)
           values ($1,$2) on conflict (candidate_id) do nothing`,
          [candidate.id, candidate.aliasText],
        );
      }
      await connection.query("commit");
    } catch (error) {
      await connection.query("rollback");
      throw error;
    } finally {
      pooledConnection?.release();
    }
  }
}
