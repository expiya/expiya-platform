import { Pool } from "pg";
import type { ElectronicsConversationState } from "@/features/electronics/runtimeContracts";
import { resolveElectronicsStageTwoDecisionFingerprint } from "@/features/electronics/stageTwo/decisionFingerprintBridge";

async function main(): Promise<void> {
  const connectionString=process.env.DATABASE_URL?.trim();
  if(!connectionString) throw new TypeError("DATABASE_URL_MISSING");
  const pool=new Pool({connectionString,max:1,application_name:"electronics-stage2-legacy-fingerprint-read-only-audit"}),client=await pool.connect();
  try{
    await client.query("begin read only");
    const result=await client.query("select state from electronics_conversations where state->'decisionRecord' is not null order by conversation_id");
    const audited=result.rows.map(row=>{const state=row.state as ElectronicsConversationState,fingerprint=state.decisionRecord?.authorizationFingerprint??"",resolved=resolveElectronicsStageTwoDecisionFingerprint(state,fingerprint);return{categoryId:state.categoryId,sourceFormat:resolved?.trace.sourceFormat??"INELIGIBLE",eligible:Boolean(resolved)};});
    await client.query("rollback");
    const byCategory=Object.fromEntries([...new Set(audited.map(row=>row.categoryId))].sort().map(categoryId=>[categoryId,audited.filter(row=>row.categoryId===categoryId&&row.eligible).length]));
    console.log(JSON.stringify({status:"PASS_READ_ONLY",decisionRecords:audited.length,eligible:audited.filter(row=>row.eligible).length,ineligible:audited.filter(row=>!row.eligible).length,legacyCanonical:audited.filter(row=>row.sourceFormat==="LEGACY_CANONICAL_HEX").length,nativePrefixed:audited.filter(row=>row.sourceFormat==="NATIVE_SHA256_PREFIXED").length,byCategory,databaseWrite:false}));
  }catch(error){try{await client.query("rollback");}catch{}throw error;}finally{client.release();await pool.end();}
}
void main();
