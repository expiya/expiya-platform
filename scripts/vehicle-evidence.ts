import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Row = Record<string, string>;
export type Finding = { severity: "ERROR" | "WARNING" | "INFO"; category: string; message: string };

export function parseCsv(text: string): Row[] {
  const records: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted && c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (!quoted && c === ",") { row.push(cell); cell = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); if (row.some(Boolean)) records.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); records.push(row); }
  const headers = records.shift() ?? [];
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export function canonicalizeSourceUrl(input: string): string {
  const url = new URL(input); url.protocol = url.protocol.toLowerCase(); url.hostname = url.hostname.toLowerCase(); url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_.+|gclid|fbclid)$/i.test(key)) url.searchParams.delete(key);
  url.pathname = url.pathname.replace(/\/+$/, "") || "/"; url.searchParams.sort();
  return url.toString().replace(/\/$/, "");
}

export function allocateReadableId(prefix: string, existingIds: string[]): string {
  if (!/^[A-Z]{3}$/.test(prefix)) throw new Error("ID prefix must be three uppercase letters");
  const max = existingIds.filter((id) => id.startsWith(`${prefix}-`)).reduce((n, id) => Math.max(n, Number(id.slice(4)) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(6, "0")}`;
}

const fileMap = { models: "models.csv", generations: "generations.csv", powertrains: "powertrains.csv", configurations: "configurations.csv", facts: "evidence_facts.csv", equipment: "equipment.csv", safety: "safety.csv", sources: "sources.csv", assertions: "assertions.csv", queue: "collection_queue.csv", dictionary: "data_dictionary.csv" } as const;
export type Tables = Record<keyof typeof fileMap, Row[]> & { lists: Row[] };

export async function loadTables(directory: string): Promise<Tables> {
  const entries = await Promise.all(Object.entries(fileMap).map(async ([key, file]) => [key, parseCsv(await readFile(path.join(directory, file), "utf8"))]));
  const listsPath = path.join(directory, "lists.csv");
  let lists: Row[] = [];
  try { lists = parseCsv(await readFile(listsPath, "utf8")); } catch { /* release snapshots may omit support lists */ }
  return { ...Object.fromEntries(entries), lists } as Tables;
}

export function validate(t: Tables): Finding[] {
  const findings: Finding[] = []; const add = (severity: Finding["severity"], category: string, message: string) => findings.push({ severity, category, message });
  const pk: Array<[keyof Tables, string]> = [["models","model_id"],["generations","generation_id"],["powertrains","powertrain_id"],["configurations","configuration_id"],["facts","fact_id"],["equipment","equipment_id"],["safety","safety_id"],["sources","source_id"],["assertions","assertion_id"],["queue","queue_id"]];
  for (const [table, field] of pk) { const seen = new Set<string>(); for (const row of t[table]) { const id = row[field]; if (!id) add("ERROR","PK",`${table}.${field} is missing`); else if (seen.has(id)) add("ERROR","PK",`duplicate ${field}: ${id}`); else seen.add(id); } }
  const ids = (table: keyof Tables, field: string) => new Set(t[table].map((row) => row[field]));
  const models=ids("models","model_id"), generations=ids("generations","generation_id"), powertrains=ids("powertrains","powertrain_id"), configurations=ids("configurations","configuration_id"), facts=ids("facts","fact_id"), equipment=ids("equipment","equipment_id"), sources=ids("sources","source_id");
  for (const r of t.generations) if (!models.has(r.model_id)) add("ERROR","FK",`${r.generation_id} orphan model_id ${r.model_id}`);
  for (const r of t.powertrains) if (!generations.has(r.generation_id)) add("ERROR","FK",`${r.powertrain_id} orphan generation_id ${r.generation_id}`);
  for (const r of t.configurations) { if (!generations.has(r.generation_id)) add("ERROR","FK",`${r.configuration_id} orphan generation_id ${r.generation_id}`); if (!powertrains.has(r.powertrain_id)) add("ERROR","FK",`${r.configuration_id} orphan powertrain_id ${r.powertrain_id}`); }
  const subjects: Record<string, Set<string>> = { MODEL: models, GENERATION: generations, POWERTRAIN: powertrains, CONFIGURATION: configurations };
  for (const r of t.facts) if (!subjects[r.subject_type]?.has(r.subject_id)) add("ERROR","FK",`${r.fact_id} invalid subject ${r.subject_type}:${r.subject_id}`);
  for (const r of t.equipment) if (!configurations.has(r.configuration_id)) add("ERROR","FK",`${r.equipment_id} orphan configuration ${r.configuration_id}`);
  for (const r of t.assertions) { const validEvidence = r.evidence_type === "TECHNICAL_FACT" ? facts.has(r.evidence_id) : r.evidence_type === "EQUIPMENT_FACT" ? equipment.has(r.evidence_id) : true; if (!validEvidence) add("ERROR","FK",`${r.assertion_id} orphan evidence ${r.evidence_id}`); if (!sources.has(r.source_id)) add("ERROR","FK",`${r.assertion_id} orphan source ${r.source_id}`); }
  for (const r of t.queue) if (![...Object.values(subjects)].some((set) => set.has(r.subject_id))) add("ERROR","FK",`${r.queue_id} invalid subject ${r.subject_id}`);
  const vocab = new Map<string,Set<string>>(); for (const row of t.lists) { if (!vocab.has(row.LIST_NAME)) vocab.set(row.LIST_NAME,new Set()); vocab.get(row.LIST_NAME)?.add(row.VALUE); }
  const enums: Array<[keyof Tables,string,string]> = [
    ["models","body_family","BODY_FAMILY"],["models","market_relevance_tr","MARKET_RELEVANCE_TR"],["models","source_catalog_status","SOURCE_CATALOG_STATUS"],
    ["generations","facelift_status","FACELIFT_STATUS"],["generations","identity_status","IDENTITY_STATUS"],
    ["powertrains","fuel_type","FUEL_TYPE"],["powertrains","electrification_type","ELECTRIFICATION_TYPE"],["powertrains","transmission_type","TRANSMISSION_TYPE"],["powertrains","drivetrain","DRIVETRAIN"],["powertrains","identity_status","IDENTITY_STATUS"],
    ["configurations","market","MARKET"],["configurations","availability_status","AVAILABILITY_STATUS"],["configurations","configuration_status","CONFIGURATION_STATUS"],
    ["facts","subject_type","SUBJECT_TYPE"],["facts","value_type","VALUE_TYPE"],["facts","evidence_state","EVIDENCE_STATE"],["facts","range_semantics","RANGE_SEMANTICS"],["facts","source_value_semantics","SOURCE_VALUE_SEMANTICS"],
    ["equipment","availability","EQUIPMENT_AVAILABILITY"],["equipment","evidence_state","EVIDENCE_STATE"],
    ["sources","source_type","SOURCE_TYPE"],["sources","authority_class","AUTHORITY_CLASS"],["sources","source_status","SOURCE_STATUS"],
    ["assertions","evidence_type","EVIDENCE_TYPE"],["assertions","extraction_method","EXTRACTION_METHOD"],["assertions","verification_status","VERIFICATION_STATUS"],["assertions","applicability_status","APPLICABILITY_STATUS"],
    ["queue","priority","PRIORITY"],["queue","collection_status","COLLECTION_STATUS"],["queue","preferred_source_type","PREFERRED_SOURCE_TYPE"],["queue","assigned_method","ASSIGNED_METHOD"],["queue","result","COLLECTION_RESULT"],
    ["dictionary","data_type","DATA_TYPE"],["dictionary","requirement","REQUIREMENT_LEVEL"],["dictionary","scope","FACT_SCOPE"],
  ];
  for (const [table,column,list] of enums) for (const row of t[table]) if (row[column] && !vocab.get(list)?.has(row[column])) add("ERROR","ENUM",`${table}.${column} invalid value ${row[column]} (expected ${list})`);
  const genById = new Map(t.generations.map((r) => [r.generation_id,r])); const pwrById = new Map(t.powertrains.map((r) => [r.powertrain_id,r]));
  for (const r of t.configurations) if (r.configuration_status === "VERIFIED") { if (genById.get(r.generation_id)?.identity_status !== "VERIFIED") add("ERROR","IDENTITY",`${r.configuration_id} VERIFIED with unresolved generation ${r.generation_id}`); if (pwrById.get(r.powertrain_id)?.identity_status !== "VERIFIED") add("ERROR","IDENTITY",`${r.configuration_id} VERIFIED with unresolved powertrain ${r.powertrain_id}`); }
  const exact = (id: string) => t.assertions.some((a) => a.evidence_id === id && a.verification_status === "VERIFIED" && a.applicability_status === "EXACT");
  for (const r of t.facts) if (r.evidence_state === "VERIFIED" && !exact(r.fact_id)) add("ERROR","FACT_ASSERTION",`${r.fact_id} VERIFIED without VERIFIED/EXACT assertion`);
  for (const r of t.equipment) if (r.availability === "NOT_AVAILABLE" && !exact(r.equipment_id)) add("ERROR","NOT_AVAILABLE",`${r.equipment_id} NOT_AVAILABLE without positive VERIFIED/EXACT absence evidence`);
  for (const r of t.facts) { const has = (v: string) => v !== ""; if (r.range_semantics === "MIN_MAX") { if (has(r.value) || !has(r.value_min) || !has(r.value_max) || Number(r.value_min) > Number(r.value_max)) add("ERROR","RANGE",`${r.fact_id} invalid MIN_MAX representation`); } else if (r.value_type === "NUMBER" && !has(r.value) && r.evidence_state !== "UNKNOWN" && r.evidence_state !== "NOT_AVAILABLE" && r.evidence_state !== "NOT_APPLICABLE") add("ERROR","RANGE",`${r.fact_id} numeric scalar is missing value`); else if (has(r.value_min) || has(r.value_max)) add("ERROR","RANGE",`${r.fact_id} scalar carries range bounds`); }
  for (const r of t.facts.filter((r) => r.fact_key === "dc_charge_time_min")) { const start=Number(r.soc_start_pct), end=Number(r.soc_end_pct); if (r.soc_start_pct === "" || r.soc_end_pct === "" || !(0 <= start && start < end && end <= 100)) add("ERROR","CHARGING",`${r.fact_id} invalid or missing SOC interval`); }
  for (const r of t.facts) if (["battery_gross_kwh","battery_usable_kwh"].includes(r.fact_key) && r.source_value_semantics === "BATTERY_CAPACITY_UNQUALIFIED") add("ERROR","BATTERY",`${r.fact_id} unqualified capacity promoted to ${r.fact_key}`);
  const canonical = new Map<string,string>(); for (const r of t.sources) {
    if (!r.source_observed_at) add("ERROR","SOURCE",`${r.source_id} missing source_observed_at`);
    if (!/^A[1-7]_/.test(r.authority_class) && r.authority_class !== "UNKNOWN") add("ERROR","SOURCE",`${r.source_id} invalid authority_class ${r.authority_class}`);
    let url=""; try { url=canonicalizeSourceUrl(r.source_url_canonical || r.source_url); } catch { add("ERROR","SOURCE",`${r.source_id} invalid URL`); }
    if (url && canonical.has(url)) add("ERROR","SOURCE",`${r.source_id} duplicates canonical URL owned by ${canonical.get(url)}`); else if (url) canonical.set(url,r.source_id);
    if (r.source_snapshot_ref === "SNAPSHOT_UNAVAILABLE") {
      if (r.source_content_hash) add("ERROR","SNAPSHOT",`${r.source_id} SNAPSHOT_UNAVAILABLE must not carry a content hash`);
      else add("WARNING","SNAPSHOT",`${r.source_id} snapshot explicitly unavailable`);
    } else if (!r.source_content_hash && !r.source_snapshot_ref) add("WARNING","SOURCE",`${r.source_id} has no immutable content hash/snapshot`);
    else {
      if (!/^[a-f0-9]{64}$/.test(r.source_content_hash)) add("ERROR","SNAPSHOT",`${r.source_id} has invalid SHA-256 content hash`);
      if (!r.source_snapshot_ref) add("ERROR","SNAPSHOT",`${r.source_id} content hash has no snapshot reference`);
      else if (!existsSync(r.source_snapshot_ref)) add("ERROR","SNAPSHOT",`${r.source_id} snapshot file does not exist: ${r.source_snapshot_ref}`);
      else if (/^[a-f0-9]{64}$/.test(r.source_content_hash)) {
        const actual = createHash("sha256").update(readFileSync(r.source_snapshot_ref)).digest("hex");
        if (actual !== r.source_content_hash) add("ERROR","SNAPSHOT",`${r.source_id} snapshot hash mismatch: expected ${r.source_content_hash}, got ${actual}`);
      }
    }
  }
  const dictionaryKeys = new Set<string>(); for (const r of t.dictionary) { const key=`${r.sheet}\u0000${r.field_key}`; if (dictionaryKeys.has(key)) add("ERROR","DICTIONARY",`duplicate active definition ${r.sheet}.${r.field_key}`); dictionaryKeys.add(key); if (["dc_charge_10_80_min","numeric_range"].includes(r.field_key)) add("ERROR","DICTIONARY",`deprecated active field ${r.field_key}`); }
  const factDefs = new Set(t.dictionary.filter((r) => r.sheet === "05_EVIDENCE_FACTS").map((r) => r.field_key)); for (const key of new Set(t.facts.map((r) => r.fact_key))) if (!factDefs.has(key)) add("ERROR","DICTIONARY",`missing fact definition ${key}`);
  if (!t.safety.length) add("INFO","SAFETY","07_SAFETY is empty; this is permitted and remains future P1 work");
  findings.sort((a,b) => `${a.severity}:${a.category}:${a.message}`.localeCompare(`${b.severity}:${b.category}:${b.message}`)); return findings;
}

export function formatReport(findings: Finding[]): string { const errors=findings.filter((f)=>f.severity==="ERROR"); return [`VALIDATOR: ${errors.length ? "FAIL" : "PASS"}`,`ERRORS: ${errors.length}`,`WARNINGS: ${findings.filter((f)=>f.severity==="WARNING").length}`,`INFO: ${findings.filter((f)=>f.severity==="INFO").length}`,"",...findings.map((f)=>`${f.severity} [${f.category}] ${f.message}`)].join("\n")+"\n"; }

async function sha256(file: string) { return createHash("sha256").update(await readFile(file)).digest("hex"); }
async function main() {
  const [command, target, extra] = process.argv.slice(2);
  if (command === "validate") { const findings=validate(await loadTables(target)); const report=formatReport(findings); if (extra) await writeFile(extra,report); console.log(report.trimEnd()); process.exitCode=findings.some((f)=>f.severity==="ERROR")?1:0; return; }
  if (command === "next-id") { const [file,column,prefix]=String(extra).split(":"); console.log(allocateReadableId(prefix,parseCsv(await readFile(path.join(target,file),"utf8")).map((r)=>r[column]))); return; }
  if (command === "manifest") { const workbook=extra; const tables=await loadTables(target); const findings=validate(tables); const files=(await readdir(target)).filter((f)=>f.endsWith(".csv")).sort(); const manifest={dataset_version:process.env.EXPIYA_DATASET_VERSION ?? "0.1.0",schema_version:process.env.EXPIYA_SCHEMA_VERSION ?? "0.1",batch_id:process.env.EXPIYA_BATCH_ID ?? "MICROPILOT01",release_date:process.env.EXPIYA_RELEASE_DATE ?? new Date().toISOString().slice(0,10),master_file:path.relative(process.cwd(),workbook),master_sha256:await sha256(workbook),validator_status:findings.some((f)=>f.severity==="ERROR")?"FAIL":"PASS",validator_timestamp:new Date().toISOString(),sheet_row_counts:Object.fromEntries(Object.entries(fileMap).map(([k])=>[k,tables[k as keyof typeof fileMap].length])),csv_snapshot_paths:files.map((f)=>path.relative(process.cwd(),path.join(target,f))),source_count:tables.sources.length,source_snapshot_count:tables.sources.filter((r)=>r.source_content_hash&&r.source_snapshot_ref!=="SNAPSHOT_UNAVAILABLE").length,source_snapshot_unavailable_count:tables.sources.filter((r)=>r.source_snapshot_ref==="SNAPSHOT_UNAVAILABLE").length,fact_count:tables.facts.length,equipment_count:tables.equipment.length,assertion_count:tables.assertions.length,configuration_count:tables.configurations.length,verified_configuration_count:tables.configurations.filter((r)=>r.configuration_status==="VERIFIED").length,provisional_configuration_count:tables.configurations.filter((r)=>r.configuration_status==="PROVISIONAL").length}; await mkdir(path.dirname(process.argv[5]),{recursive:true}); await writeFile(process.argv[5],JSON.stringify(manifest,null,2)+"\n"); return; }
  throw new Error("Usage: vehicle-evidence.ts validate <tables-dir> [report] | next-id <tables-dir> <file:column:PFX> | manifest <tables-dir> <workbook> <output>");
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error)=>{ console.error(error); process.exitCode=1; });
