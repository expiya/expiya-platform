import { z } from "zod";

import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const eventSchema = z.object({
  eventName: z.enum(["SELLER_RESEARCH_OPENED", "SELLER_RESEARCH_SUBMITTED"]),
  conversationId: z.string().uuid().optional(),
  decisionId: z.string().trim().min(1).max(100),
  carId: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100).optional(),
  district: z.string().trim().min(1).max(100).optional(),
}).superRefine((value, context) => {
  if (value.eventName === "SELLER_RESEARCH_SUBMITTED" && (!value.province || !value.district)) {
    context.addIssue({ code: "custom", message: "İl ve ilçe zorunludur." });
  }
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const rateLimited = await enforceRateLimit(request, { scope: "product-events", limit: 20, windowMs: 10 * 60_000 });
  if (rateLimited) return rateLimited;

  try {
    const event = eventSchema.parse(await readJsonWithLimit(request, 5_000));
    await getPostgresDatabase().query(
      `insert into product_events
        (id, event_name, conversation_id, decision_id, car_id, province, district)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [crypto.randomUUID(), event.eventName, event.conversationId ?? null, event.decisionId,
        event.carId, event.province ?? null, event.district ?? null],
    );
    return Response.json({ recorded: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ message: "Geçersiz ölçüm verisi." }, { status: 400 });
    }
    return Response.json({ message: "Ölçüm kaydedilemedi." }, { status: 500 });
  }
}
