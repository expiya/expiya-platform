import { z } from "zod";

import { initializeCarsDecisionV2DurableStore } from "@/features/decision/v2/integration/durableStoreInitialization.server";
import { createPilotArchiveIdentity } from "@/features/pilot/pilotConversationArchive";
import { pilotSessionFromRequest } from "@/features/pilot/pilotSession.server";
import { readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const schema = z.object({ conversationId: z.string().uuid(), messages: z.array(z.object({ id: z.string().min(1).max(100), role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4_000) })).min(1).max(500), conversation: z.unknown().optional() });
const MAX_COMPLETED_CONVERSATIONS_PER_PILOT = 200;

export async function POST(request: Request) {
  const rejected = verifySameOrigin(request); if (rejected) return rejected;
  const session = pilotSessionFromRequest(request); if (!session) return Response.json({ message: "Pilot oturumu gerekli." }, { status: 401 });
  try {
    const input = schema.parse(await readJsonWithLimit(request, 1_500_000));
    const database = await initializeCarsDecisionV2DurableStore({ environment: { DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX }, ...(process.env.CARS_DECISION_V2_DATABASE_ENV === "development" || process.env.CARS_DECISION_V2_DATABASE_ENV === "staging" ? { expectedDatabaseUrl: process.env.CARS_DECISION_V2_TEST_DATABASE_URL } : {}) });
    if (database.status !== "READY") return Response.json({ message: "Pilot kayıt servisi hazır değil." }, { status: 503 });
    const migrated = await database.pool.query("select to_regclass('public.cars_pilot_conversation_archives') is not null as ready");
    if (!migrated.rows[0]?.ready) return Response.json({ message: "Pilot kayıt şeması hazır değil." }, { status: 503 });
    const client = await database.pool.connect();
    try {
      await client.query("begin");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [session.username]);
      const durable = await client.query("select revision,memory from cars_decision_v2_conversations where conversation_id=$1", [input.conversationId]);
      const conversationSnapshot = durable.rows[0]
        ? { version: 1, source: "CARS_DECISION_V2_DURABLE_STORE", revision: durable.rows[0].revision, memory: durable.rows[0].memory }
        : input.conversation;
      const identity = createPilotArchiveIdentity({ ...input, conversation: conversationSnapshot, pilotUsername: session.username });
      const existing = await client.query("select pilot_username,archive_checksum from cars_pilot_conversation_archives where conversation_id=$1 for update", [input.conversationId]);
      if (existing.rows[0]) {
        if (existing.rows[0].pilot_username !== session.username || existing.rows[0].archive_checksum !== identity.archiveChecksum) {
          await client.query("rollback");
          return Response.json({ message: "Görüşme daha önce farklı içerikle tamamlandı." }, { status: 409 });
        }
        await client.query("commit");
        return Response.json({ archived: true, conversationId: input.conversationId });
      }
      const usage = await client.query("select count(*)::integer as completed_count from cars_pilot_conversation_archives where pilot_username=$1", [session.username]);
      if ((usage.rows[0]?.completed_count ?? 0) >= MAX_COMPLETED_CONVERSATIONS_PER_PILOT) {
        await client.query("rollback");
        return Response.json({ message: "200 görüşmelik pilot sınırına ulaştınız.", reasonCode: "PILOT_CONVERSATION_LIMIT_REACHED" }, { status: 409 });
      }
      const completedAt = new Date().toISOString();
      await client.query("insert into cars_pilot_conversation_archives (conversation_id,pilot_username,transcript,conversation_snapshot,user_turn_count,assistant_turn_count,archive_checksum,completion_reason,completed_at) values ($1,$2,$3,$4,$5,$6,$7,'USER_CLICKED_DELETE',$8)", [input.conversationId, session.username, JSON.stringify(input.messages), conversationSnapshot === undefined ? null : JSON.stringify(conversationSnapshot), identity.userTurnCount, identity.assistantTurnCount, identity.archiveChecksum, completedAt]);
      await client.query("commit");
      return Response.json({ archived: true, conversationId: input.conversationId });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ message: "Pilot görüşme kaydı doğrulanamadı." }, { status: 400 });
    return Response.json({ message: error instanceof Error && error.message === "PILOT_ARCHIVE_EMPTY_CONVERSATION" ? "Boş görüşme kaydedilemez." : "Pilot görüşme kaydedilemedi." }, { status: error instanceof Error && error.message === "PILOT_ARCHIVE_EMPTY_CONVERSATION" ? 400 : 500 });
  }
}
