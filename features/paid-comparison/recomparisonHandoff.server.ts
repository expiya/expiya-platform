import { createHash, randomBytes } from "node:crypto";
import type { SqlQueryable } from "@/features/vehicle-data/repository";
import type { ApprovedDecisionNeed } from "@/features/sales-advisor/types";

const PREFIX = "p2r_";
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export class PostgresPaidRecomparisonHandoffRepository {
  constructor(private readonly database: SqlQueryable) {}
  async issue(input: { accessTokenHash: string; exactVariantId: string; now: Date }): Promise<string> {
    const result = await this.database.query(
      `select o.id as order_id, e.conversation_id, e.catalog_release_version,
              q.catalog_fingerprint, q.approved_needs
         from paid_report_orders o
         join paid_report_vehicle_entitlements e on e.order_id = o.id and e.revoked_at is null
         join comparison_report_quotes q on q.id = e.quote_id
         join comparison_report_jobs j on j.order_id = o.id and j.status = 'SUCCEEDED'
        where o.access_token_hash = $1 and o.status = 'PAID' and e.exact_variant_id = $2`,
      [input.accessTokenHash, input.exactVariantId],
    ) as { rows?: { order_id: string; conversation_id: string; catalog_release_version: string; catalog_fingerprint: string; approved_needs: unknown }[] };
    const row = result.rows?.[0]; if (!row) throw new TypeError("PAID_REPORT_VEHICLE_ENTITLEMENT_REQUIRED");
    const token = `${PREFIX}${randomBytes(32).toString("base64url")}`;
    await this.database.query(
      `insert into paid_report_recomparison_handoffs
        (token_hash, order_id, conversation_id, exact_variant_id, catalog_release_version,
         catalog_fingerprint, approved_needs, issued_at, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      [digest(token), row.order_id, row.conversation_id, input.exactVariantId, row.catalog_release_version,
        row.catalog_fingerprint, JSON.stringify(row.approved_needs), input.now.toISOString(), new Date(input.now.getTime() + 2 * 60 * 60_000).toISOString()],
    );
    return token;
  }
  async open(token: string, now: Date) {
    if (!token.startsWith(PREFIX) || token.length !== PREFIX.length + 43) throw new TypeError("PAID_RECOMPARISON_HANDOFF_INVALID");
    const result = await this.database.query(
      `select h.conversation_id, h.exact_variant_id, h.catalog_release_version,
              h.catalog_fingerprint, h.approved_needs, h.issued_at, h.expires_at
         from paid_report_recomparison_handoffs h
         join paid_report_orders o on o.id = h.order_id and o.status = 'PAID'
        where h.token_hash = $1 and h.revoked_at is null`, [digest(token)],
    ) as { rows?: { conversation_id: string; exact_variant_id: string; catalog_release_version: string; catalog_fingerprint: string; approved_needs: unknown; issued_at: string | Date; expires_at: string | Date }[] };
    const row = result.rows?.[0]; if (!row) throw new TypeError("PAID_RECOMPARISON_HANDOFF_INVALID");
    const issuedAt = new Date(row.issued_at); const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() <= now.getTime() || issuedAt.getTime() > now.getTime() + 60_000 || expiresAt.getTime() - issuedAt.getTime() > 2 * 60 * 60_000) throw new TypeError("PAID_RECOMPARISON_HANDOFF_STALE");
    const approvedNeeds = Array.isArray(row.approved_needs) ? row.approved_needs.filter((item): item is ApprovedDecisionNeed => Boolean(item && typeof item === "object" && typeof (item as { concept?: unknown }).concept === "string" && typeof (item as { summary?: unknown }).summary === "string")) : [];
    return { handoff: { version: "paid-report-recomparison/v1" as const, conversationId: row.conversation_id, offerId: `paid-recomparison:${digest(token).slice(0, 24)}`, selectedExactVariantId: row.exact_variant_id, catalogRelease: row.catalog_release_version, catalogFingerprint: row.catalog_fingerprint, approvedNeeds, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() } };
  }
}

export const isPaidRecomparisonHandoff = (token: string) => token.startsWith(PREFIX);
