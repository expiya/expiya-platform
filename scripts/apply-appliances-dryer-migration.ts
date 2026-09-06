import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { getPostgresPool } from "../lib/server/postgres";

loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
async function main() {
  const sql=await readFile("database/migrations/0010_appliances_dryer_product_type.sql","utf8");
  if (/create\s+table|drop\s+table|truncate|delete\s+from|update\s+/iu.test(sql)) throw new Error("UNEXPECTED_MIGRATION_OPERATION");
  const pool=getPostgresPool(), client=await pool.connect();
  try {
    const before=await client.query("select count(*)::int as count from appliances_conversations");
    console.log(JSON.stringify({status:"PREFLIGHT",migration:"0010_appliances_dryer_product_type.sql",sha256:createHash("sha256").update(sql).digest("hex"),conversationCount:before.rows[0].count}));
    if(!process.argv.includes("--apply"))return;
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '5s'"); await client.query(sql);
      const check=await client.query("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='appliances_conversations'::regclass and conname='appliances_conversations_product_type_check'");
      const after=await client.query("select count(*)::int as count from appliances_conversations");
      if(check.rowCount!==1||!/DRYER/.test(check.rows[0].definition)||after.rows[0].count!==before.rows[0].count)throw new Error("MIGRATION_VERIFICATION_FAILED");
      await client.query("commit"); console.log(JSON.stringify({status:"APPLIED",preservedConversationCount:after.rows[0].count,constraint:check.rows[0].definition}));
    } catch(error){await client.query("rollback");throw error;}
  } finally {client.release();await pool.end();}
}
main().catch(()=>{console.error("APPLIANCES_DRYER_MIGRATION_FAILED_NO_SECRET_DETAILS");process.exitCode=1;});
