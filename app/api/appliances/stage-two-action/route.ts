import { createHash } from "node:crypto";
import { z } from "zod";
import { initializeAppliancesStore } from "@/features/appliances/persistence/initialize.server";
import { PostgresAppliancesConversationStore } from "@/features/appliances/persistence/postgresStore.server";
import { loadAppliancesStageTwoHandoffService, readAppliancesStageTwoHandoff } from "@/features/appliances/stageTwo/handoff.server";
import { BoundedSalesActionIdempotencyLedger, executeBoundedAppliancesSalesAction } from "@/features/appliances/stageTwo/salesActions";
import { APPLIANCES_PRODUCT_TYPES } from "@/features/appliances/contracts";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

export const runtime = "nodejs";
const schema = z.strictObject({ handoff: z.string().min(80).max(4096), action: z.enum(["VIEW_EXACT_OFFER", "WATCH_PRICE", "INQUIRE_AUTHORIZED_AVAILABILITY", "SAVE_DECISION", "SHARE_DECISION", "REQUEST_COMPARISON_REPORT"]), exactProductId: z.string().min(1).max(300), productType: z.enum(APPLIANCES_PRODUCT_TYPES), revision: z.number().int().positive(), idempotencyKey: z.string().uuid() });
const results = new BoundedSalesActionIdempotencyLedger<object>();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache", "Referrer-Policy": "no-referrer" } });
export async function POST(request: Request) {
  const origin = verifySameOrigin(request); if (origin) return origin;
  const limited = await enforceRateLimit(request, { scope: "appliances-stage-two-action", limit: 20, windowMs: 60_000 }); if (limited) return limited;
  let raw: unknown; try { raw = await readJsonWithLimit(request, 8_192); } catch { return json({ status: "UNAVAILABLE", message: "İstek doğrulanamadı; hiçbir işlem yapılmadı." }, 400); }
  const parsed = schema.safeParse(raw); if (!parsed.success) return json({ status: "UNAVAILABLE", message: "Eylem bilgileri geçersiz; hiçbir işlem yapılmadı." }, 400);
  const service = loadAppliancesStageTwoHandoffService(); if (!service) return json({ status: "UNAVAILABLE", message: "Güvenli eylemler bu ortamda yapılandırılmamış." }, 503);
  const database = await initializeAppliancesStore({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX }); if (database.status !== "READY") return json({ status: "UNAVAILABLE", message: "Karar kaydı şu anda doğrulanamıyor." }, 503);
  try {
    const verified = await readAppliancesStageTwoHandoff({ store: new PostgresAppliancesConversationStore(database.pool), service, handoff: parsed.data.handoff });
    if (verified.status !== "READY") return json({ status: "UNAVAILABLE", message: "İmzalı karar bağlantısı geçersiz veya güncel değil." }, 403);
    const binding = createHash("sha256").update(`${parsed.data.handoff}:${verified.productType}:${verified.selectedCard.identity.productId}:${verified.revision}:${parsed.data.action}:${parsed.data.idempotencyKey}`).digest("hex");
    const prior = results.get(binding); if (prior) return json({ ...prior, duplicate: true });
    const result = executeBoundedAppliancesSalesAction({ ...parsed.data, verified: { exactProductId: verified.selectedCard.identity.productId, productType: verified.productType, revision: verified.revision, commerce: verified.selectedCard.currentCommerce } });
    results.set(binding, result);
    console.info(JSON.stringify({ type: "audit", event: "appliances_stage_two_action", action: parsed.data.action, status: result.status, binding: binding.slice(0, 24) }));
    return json(result, result.status === "READY" ? 200 : 409);
  } catch { return json({ status: "UNAVAILABLE", message: "Eylem doğrulanamadı; hiçbir dış işlem yapılmadı." }, 503); }
}
