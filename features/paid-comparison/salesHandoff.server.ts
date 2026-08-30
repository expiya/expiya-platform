import { createHash, randomBytes } from "node:crypto";
import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { buildVariantContentArtifact } from "@/features/sales-advisor/artifact.server";
import type { Phase3Intent, Phase3IntentPayload } from "@/features/sales-advisor/handoff.server";
import type { SqlQueryable } from "@/features/vehicle-data/repository";
import { DevelopmentIyzicoOrderRepository } from "@/features/payments/iyzico/developmentOrderRepository";

const TOKEN_PREFIX = "p3r_";
const digest = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const developmentHandoffs = new Map<string, Phase3IntentPayload>();

export class DevelopmentPaidReportSalesHandoffRepository {
  async issue(input: { readonly accessTokenHash: string; readonly exactVariantId: string; readonly intent: Phase3Intent; readonly now: Date }): Promise<string> {
    if (process.env.NODE_ENV === "production") throw new TypeError("DEVELOPMENT_PAYMENT_STORE_DISABLED");
    const context = DevelopmentIyzicoOrderRepository.findUnlockedSalesContext(input.accessTokenHash, input.exactVariantId);
    if (!context) throw new TypeError("PAID_REPORT_SALES_CONTEXT_INVALID");
    const token = `p3r_dev_${randomBytes(32).toString("base64url")}`;
    const payload: Phase3IntentPayload = { version: "phase3-intent/v1", conversationId: `paid-dev:${input.accessTokenHash.slice(0, 24)}`, decisionFingerprint: digest(`${input.accessTokenHash}:${context.catalogFingerprint}`), offerId: `paid-dev:${input.accessTokenHash.slice(0, 16)}`, selectedExactVariantId: input.exactVariantId, catalogRelease: context.catalogRelease, intent: input.intent, nonce: token.slice(8, 32), issuedAt: input.now.toISOString(), expiresAt: new Date(input.now.getTime() + 30 * 60_000).toISOString(), executionAuthorized: false, approvedNeeds: context.approvedNeeds };
    developmentHandoffs.set(token, payload); return token;
  }
  static has(token: string): boolean { return process.env.NODE_ENV !== "production" && developmentHandoffs.has(token); }
  async open(token: string, expectedIntent: Phase3Intent | undefined, now: Date) {
    const payload = developmentHandoffs.get(token); if (!payload || Date.parse(payload.expiresAt) <= now.getTime()) throw new TypeError("PHASE3_HANDOFF_STALE");
    if (expectedIntent && payload.intent !== expectedIntent) throw new TypeError("PHASE3_INTENT_MISMATCH");
    const catalog = await evaluateV3Catalog([], now); if (catalog.catalogReleaseVersion !== payload.catalogRelease) throw new TypeError("PHASE3_CATALOG_STALE");
    const variant = catalog.variants.find(item => item.id === payload.selectedExactVariantId); if (!variant) throw new TypeError("PHASE3_VARIANT_STALE");
    return { handoff: payload, artifact: buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint, peerVariants: catalog.variants }) };
  }
}

export class PostgresPaidReportSalesHandoffRepository {
  constructor(private readonly database: SqlQueryable) {}

  async issue(input: { readonly accessTokenHash: string; readonly exactVariantId: string; readonly intent: Phase3Intent; readonly now: Date }): Promise<string> {
    const context = await this.database.query(
      `select o.id as order_id, q.id as quote_id, q.conversation_id, q.decision_id,
              q.catalog_release_version, q.catalog_fingerprint, q.approved_needs
         from paid_report_orders o
         join comparison_report_quotes q on q.id = o.quote_id
         join comparison_report_documents d on d.order_id = o.id
         join comparison_report_jobs j on j.order_id = o.id and j.status = 'SUCCEEDED'
         join comparison_report_quote_vehicles v on v.quote_id = q.id and v.exact_variant_id = $2
        where o.access_token_hash = $1 and o.status = 'PAID'`,
      [input.accessTokenHash, input.exactVariantId],
    ) as { rows?: { order_id: string; quote_id: string; conversation_id: string; decision_id: string; catalog_release_version: string; catalog_fingerprint: string; approved_needs: unknown }[] };
    const row = context.rows?.[0];
    if (!row) throw new TypeError("PAID_REPORT_SALES_CONTEXT_INVALID");
    const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
    const expiresAt = new Date(input.now.getTime() + 30 * 60_000);
    await this.database.query(
      `insert into paid_report_sales_handoffs
        (token_hash, order_id, quote_id, exact_variant_id, intent, conversation_id,
         decision_fingerprint, offer_id, catalog_release_version, catalog_fingerprint,
         approved_needs, issued_at, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
      [digest(token), row.order_id, row.quote_id, input.exactVariantId, input.intent,
        row.conversation_id, digest(`${row.decision_id}:${row.catalog_fingerprint}`), `paid-report:${row.quote_id}`,
        row.catalog_release_version, row.catalog_fingerprint, JSON.stringify(row.approved_needs), input.now.toISOString(), expiresAt.toISOString()],
    );
    try {
      await this.database.query(
        `insert into paid_comparison_events (id, event_name, quote_id, order_id, exact_variant_id)
         values ($1,'SALES_ACTION_STARTED',$2,$3,$4)`,
        [crypto.randomUUID(), row.quote_id, row.order_id, input.exactVariantId],
      );
    } catch {
      // The customer action remains usable if measurement storage is unavailable.
    }
    return token;
  }

  async open(token: string, expectedIntent: Phase3Intent | undefined, now: Date): Promise<{ handoff: Phase3IntentPayload; artifact: ReturnType<typeof buildVariantContentArtifact> }> {
    if (!token.startsWith(TOKEN_PREFIX) || token.length !== TOKEN_PREFIX.length + 43) throw new TypeError("PHASE3_HANDOFF_INVALID");
    const result = await this.database.query(
      `select exact_variant_id, intent, conversation_id, decision_fingerprint, offer_id,
              catalog_release_version, catalog_fingerprint, approved_needs, issued_at, expires_at
         from paid_report_sales_handoffs where token_hash = $1`,
      [digest(token)],
    ) as { rows?: { exact_variant_id: string; intent: Phase3Intent; conversation_id: string; decision_fingerprint: string; offer_id: string; catalog_release_version: string; catalog_fingerprint: string; approved_needs: Phase3IntentPayload["approvedNeeds"]; issued_at: string | Date; expires_at: string | Date }[] };
    const row = result.rows?.[0];
    if (!row || new Date(row.expires_at).getTime() <= now.getTime()) throw new TypeError("PHASE3_HANDOFF_STALE");
    if (expectedIntent && row.intent !== expectedIntent) throw new TypeError("PHASE3_INTENT_MISMATCH");
    const catalog = await evaluateV3Catalog([], now);
    if (catalog.catalogReleaseVersion !== row.catalog_release_version || catalog.catalogFingerprint !== row.catalog_fingerprint) throw new TypeError("PHASE3_CATALOG_STALE");
    const variant = catalog.variants.find((item) => item.id === row.exact_variant_id);
    if (!variant) throw new TypeError("PHASE3_VARIANT_STALE");
    const issued = new Date(row.issued_at); const expires = new Date(row.expires_at);
    if (!Number.isFinite(issued.getTime()) || !Number.isFinite(expires.getTime()) || issued.getTime() > now.getTime() + 60_000 || expires.getTime() - issued.getTime() > 30 * 60_000) throw new TypeError("PHASE3_HANDOFF_STALE");
    const approvedNeeds = Array.isArray(row.approved_needs) ? row.approved_needs.filter((item) => item && typeof item.concept === "string" && item.concept.length <= 100 && typeof item.summary === "string" && item.summary.length <= 300) : [];
    const issuedAt = issued.toISOString(); const expiresAt = expires.toISOString();
    const handoff: Phase3IntentPayload = { version: "phase3-intent/v1", conversationId: row.conversation_id, decisionFingerprint: row.decision_fingerprint, offerId: row.offer_id, selectedExactVariantId: row.exact_variant_id, catalogRelease: row.catalog_release_version, intent: row.intent, nonce: token.slice(TOKEN_PREFIX.length, TOKEN_PREFIX.length + 24), issuedAt, expiresAt, executionAuthorized: false, approvedNeeds };
    return { handoff, artifact: buildVariantContentArtifact({ variant, catalogRelease: catalog.catalogReleaseVersion, catalogFingerprint: catalog.catalogFingerprint }) };
  }
}

export const isPaidReportSalesHandoff = (token: string) => token.startsWith(TOKEN_PREFIX);
