import { getPostgresPool } from "../lib/server/postgres";

const pool = getPostgresPool({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
try {
  const result = await pool.query("select conversation_id,pilot_username,transcript,conversation_snapshot,user_turn_count,assistant_turn_count,archive_checksum,completion_reason,completed_at from cars_pilot_conversation_archives order by completed_at,conversation_id");
  for (const row of result.rows) process.stdout.write(`${JSON.stringify(row)}\n`);
} finally { await pool.end(); }
