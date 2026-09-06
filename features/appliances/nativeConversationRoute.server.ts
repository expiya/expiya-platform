import { z } from "zod";
import { createFileSystemAppliancesArtifactRepository } from "@/features/appliances/authority/loader.server";
import { enterAppliancesDepartment } from "@/features/appliances/entry.server";
import { initializeAppliancesStore } from "@/features/appliances/persistence/initialize.server";
import { PostgresAppliancesConversationStore } from "@/features/appliances/persistence/postgresStore.server";
import { commitAppliancesBootstrap } from "@/features/appliances/persistence/service";
import { recoverAppliancesConversation } from "@/features/appliances/recovery.server";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";
import { requireXpyDomainPack } from "@/features/xpy/domainPacks";
import { projectNativeAppliancesTurn, projectPublicAppliancesOutcome, runNativeAppliancesTurn } from "@/features/appliances/nativeTurn.server";
import { loadCurrentProductCommerce } from "@/features/appliances/commerce/loader.server";
import { loadApplianceMediaProjection } from "@/features/appliances/media/authority";
import { choiceSubmissionText } from "@/features/xpy/questionGuidance";
import { APPLIANCES_CATEGORY_IDS, isActiveAppliancesCategoryId, resolveAppliancesCategory } from "@/features/appliances/categoryRegistry";

export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("CREATE"), conversationId: z.string().uuid(), messageId: z.string().min(1).max(200), productType: z.enum(APPLIANCES_CATEGORY_IDS) }),
  z.strictObject({ action: z.literal("READ"), conversationId: z.string().uuid() }),
  z.strictObject({ action: z.literal("TURN"), conversationId: z.string().uuid(), messageId: z.string().min(1).max(200), expectedRevision: z.number().int().nonnegative(), message: z.string().trim().min(1).max(4000), choice: z.strictObject({ questionKey: z.string().min(1).max(200), values: z.array(z.string().min(1).max(300)).min(1).max(8) }).optional() }),
]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const closed = (message: string, status = 409) => json({ kind: "FAILED_CLOSED", message }, status);
async function withCurrentCommerce<T>(outcome: T): Promise<T> {
  const value = outcome as T & { kind?: string; card?: import("./recommendation/publicCard").AppliancesDecisionCard };
  if (value.kind !== "DECISION_READY" || !value.card) return outcome;
  const [currentCommerce, currentMedia] = await Promise.all([loadCurrentProductCommerce(process.cwd(), value.card.identity.productId), loadApplianceMediaProjection(process.cwd(), value.card.identity.productId)]);
  return currentCommerce || currentMedia ? { ...value, card: { ...value.card, ...(currentCommerce ? { currentCommerce } : {}), ...(currentMedia ? { currentMedia } : {}) } } as T : outcome;
}

export async function handleNativeAppliancesConversationRequest(request: Request) {
  requireXpyDomainPack("APPLIANCES");
  const origin = verifySameOrigin(request); if (origin) return origin;
  const limited = await enforceRateLimit(request, { scope: "appliances-conversation", limit: 30, windowMs: 60_000 }); if (limited) return limited;
  let body: unknown; try { body = await readJsonWithLimit(request, 16_384); } catch { return closed("Geçersiz istek.", 400); }
  const parsed = schema.safeParse(body); if (!parsed.success) return closed("Geçersiz istek.", 400);
  if (parsed.data.action === "CREATE" && !isActiveAppliancesCategoryId(parsed.data.productType)) {
    const category = resolveAppliancesCategory(parsed.data.productType)!;
    return json({ kind: "NOT_READY", departmentId: "APPLIANCES", productType: category.categoryId, publicLabel: category.publicLabelTr, message: `${category.publicLabelTr} kategorisi tanınıyor ancak karar görüşmesi henüz hazır değil.` }, 422);
  }
  try {
    const database = await initializeAppliancesStore({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
    if (database.status !== "READY") return closed("Appliances konuşması şu anda kullanılamıyor. Biraz sonra yeniden deneyin.", 503);
    const store = new PostgresAppliancesConversationStore(database.pool);
    const data = parsed.data;
    if (data.action === "READ") {
      const recovered = await recoverAppliancesConversation(store, data.conversationId);
      if (!recovered) return json({ kind: "NOT_FOUND" }, 404);
      return json({ ...recovered, outcome: recovered.outcome ? await withCurrentCommerce(projectPublicAppliancesOutcome(recovered.outcome)) : recovered.outcome });
    }
    const repository = createFileSystemAppliancesArtifactRepository(process.cwd());
    if (data.action === "TURN") {
      const turn = await runNativeAppliancesTurn({ store, ...data, message: data.choice ? choiceSubmissionText(data.choice) : data.message });
      if (turn.status === "AUTHORITY_UNAVAILABLE") return closed(turn.message, 503);
      if (turn.status === "CHOICE_REJECTED") return closed(turn.message, 409);
      if (turn.status === "TURN_FAILURE") return closed(turn.reason === "REVISION_CONFLICT" ? "Konuşma güncellendi; yeniden okuyun." : turn.reason === "MESSAGE_PAYLOAD_CONFLICT" ? "Mesaj kimliği uyuşmazlığı." : turn.reason === "STATE_UNAVAILABLE" ? "Konuşma bulunamadı." : "Görüşmenin güncel bilgileri doğrulanamadı.", turn.reason === "STATE_UNAVAILABLE" ? 404 : 409); 
      return json(await withCurrentCommerce(projectNativeAppliancesTurn(turn.result, data.messageId)));
    }
    const entry = await enterAppliancesDepartment({ repository, productType: data.productType, conversationId: data.conversationId });
    if (entry.status === "NOT_READY") return json({ kind: "NOT_READY", departmentId: "APPLIANCES", productType: entry.productType, publicLabel: resolveAppliancesCategory(entry.productType)?.publicLabelTr, message: "Bu kategori tanınıyor ancak karar görüşmesi henüz hazır değil." }, 422);
    if (entry.status === "UNSUPPORTED") return json({ kind: "UNSUPPORTED", departmentId: "APPLIANCES", productType: entry.productType }, 422);
    if (entry.status !== "READY") return closed("Appliances yetkisi doğrulanamadı.", 503);
    const committed = await commitAppliancesBootstrap({ store, state: entry.state, messageId: data.messageId, payload: data });
    if (committed.status !== "OK") return closed("Konuşma güncellendi veya mesaj kimliği uyuşmuyor; yeniden okuyun.");
    return json({ kind: committed.outcome.kind, conversationId: committed.outcome.conversationId, revision: committed.outcome.revision, departmentId: "APPLIANCES", productType: entry.state.productType, budgetMode: "NEEDS_ONLY" });
  } catch { return closed("Konuşma güvenli biçimde tamamlanamadı. Aynı mesajı yeniden deneyin.", 503); }
}
