import { z } from "zod";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.strictObject({
  eventId: z.string().uuid(),
  eventName: z.enum(["OFFER_VIEWED", "OFFER_CLICKED", "OPTIONS_VIEWED"]),
  conversationId: z.string().min(1).max(200),
  decisionId: z.string().min(1).max(200),
  exactVariantId: z.string().min(1).max(300),
});

export async function POST(request: Request): Promise<Response> {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  const limited = await enforceRateLimit(request, { scope: "paid-comparison-events", limit: 30, windowMs: 10 * 60_000 }); if (limited) return limited;
  try {
    const event = schema.parse(await readJsonWithLimit(request, 2_000));
    await getPostgresDatabase().query(
      `insert into paid_comparison_events (id, event_name, conversation_id, decision_id, exact_variant_id)
       values ($1,$2,$3,$4,$5) on conflict (id) do nothing`,
      [event.eventId, event.eventName, event.conversationId, event.decisionId, event.exactVariantId],
    );
    return Response.json({ recorded: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ message: error instanceof z.ZodError ? "Geçersiz ölçüm olayı." : "Ölçüm kaydedilemedi." }, { status: error instanceof z.ZodError ? 400 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
