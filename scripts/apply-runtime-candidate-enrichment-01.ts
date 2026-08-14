import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeSourceUrl, parseCsv, type Row } from "./vehicle-evidence";

const observedExcelDate = "46249";
const quote = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
const serialize = (rows: Row[]) => {
  const headers = Object.keys(rows[0] ?? {});
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))]
    .map((row) => row.map(quote).join(",")).join("\n") + "\n";
};
const pad = (value: number) => String(value).padStart(6, "0");

async function main() {
  const [dir] = process.argv.slice(2);
  if (!dir) throw new Error("Usage: apply-runtime-candidate-enrichment-01 <tables-dir>");
  const names = ["evidence_facts", "sources", "assertions", "collection_queue"];
  const tables = Object.fromEntries(await Promise.all(names.map(async (name) => [name, parseCsv(await readFile(path.join(dir, `${name}.csv`), "utf8"))]))) as Record<string, Row[]>;
  const next = (table: string, field: string, prefix: string) => `${prefix}-${pad(Math.max(0, ...tables[table].map((row) => Number(row[field]?.slice(4)) || 0)) + 1)}`;

  const addSource = (title: string, url: string, notes: string) => {
    const canonical = canonicalizeSourceUrl(url);
    const existing = tables.sources.find((row) => canonicalizeSourceUrl(row.source_url_canonical || row.source_url) === canonical);
    if (existing) return existing.source_id;
    const id = next("sources", "source_id", "SRC");
    tables.sources.push({ source_id: id, publisher: title.startsWith("Captur") ? "Renault Türkiye" : "BMW Türkiye", source_title: title, source_type: "OFFICIAL_TECH_SPEC", source_url: url, market: "TR", publication_date: "", retrieved_at: observedExcelDate, authority_class: "A1_OFFICIAL_MARKET", source_status: "ACTIVE", notes, source_url_canonical: canonical, source_version_label: "observed 2026-08-15", source_observed_at: observedExcelDate, source_content_hash: "", source_snapshot_ref: "" });
    return id;
  };

  const capturSource = addSource("Captur kabin ve boyutlar", "https://www.renault.com.tr/hybrid-araclar/captur-e-tech/kabin-boyutlar.html", "RUNTIME_CANDIDATE_ENRICHMENT_01; mild-hybrid VDA cargo range with rear bench upright at both slide endpoints.");
  const bmwSource = addSource("BMW 3 Serisi Sedan (G20) teknik veriler ve motorlar", "https://www.bmw.com.tr/tr/all-models/3-series/bmw-3-serisi-sedan/bmw-3-serisi-sedan-teknik-veriler.html", "RUNTIME_CANDIDATE_ENRICHMENT_01; official Turkey BMW 320i Sedan technical data; cargo value is trim-invariant for the applicable sedan configuration.");

  const addFact = (subjectId: string, value: string, context: string, sourceId: string, extra: Partial<Row> = {}) => {
    if (tables.evidence_facts.some((row) => row.subject_id === subjectId && row.fact_key === "cargo_volume_l")) throw new Error(`Duplicate cargo fact for ${subjectId}`);
    const factId = next("evidence_facts", "fact_id", "FAC");
    tables.evidence_facts.push({ fact_id: factId, subject_type: "CONFIGURATION", subject_id: subjectId, fact_key: "cargo_volume_l", value_type: "NUMBER", value, unit: "L", evidence_state: "VERIFIED", measurement_context: context, valid_from_model_year: "2026", valid_to_model_year: "", market: "TR", notes: "RUNTIME_CANDIDATE_ENRICHMENT_01 targeted active-mapping evidence.", value_min: "", value_max: "", range_semantics: "NONE", source_value_semantics: "EXACT_SCALAR", source_value_raw: value, soc_start_pct: "", soc_end_pct: "", charge_power_context_kw: "", ...extra });
    const assertionId = next("assertions", "assertion_id", "AST");
    tables.assertions.push({ assertion_id: assertionId, evidence_type: "TECHNICAL_FACT", evidence_id: factId, source_id: sourceId, source_location: context, extraction_method: "MANUAL", verification_status: "VERIFIED", applicability_status: "EXACT", verified_at: observedExcelDate, verified_by: "Codex/official-source research", notes: "Exact TR-market configuration or approved configuration-independent applicability; no trim leakage." });
    return { factId, assertionId };
  };

  addFact("CFG-000055", "", "rear seats upright; sliding bench rearward-to-forward endpoints; VDA ISO 3832", capturSource, { value_min: "484", value_max: "616", range_semantics: "MIN_MAX", source_value_semantics: "EXACT_RANGE", source_value_raw: "484–616" });
  addFact("CFG-000063", "480", "BMW 320i Sedan luggage capacity; rear seats upright", bmwSource);

  for (const [subjectId, result, note] of [
    ["CFG-000055", "FOUND", "Exact 484–616 L VDA range collected for the sliding rear bench."],
    ["CFG-000063", "FOUND", "Exact 480 L official BMW 320i Sedan cargo value collected."],
    ["CFG-000054", "NOT_FOUND", "No exact current MY26 Corsa Hybrid GS cargo evidence established from available official Turkey sources; UNKNOWN retained."],
  ]) {
    const row = tables.collection_queue.find((entry) => entry.subject_id === subjectId && entry.fact_key === "cargo_volume_l");
    if (!row) throw new Error(`Missing cargo queue row for ${subjectId}`);
    row.collection_status = "COMPLETE";
    row.attempt_count = String(Number(row.attempt_count || 0) + 1);
    row.last_attempt_at = observedExcelDate;
    row.result = result;
    row.notes = `RUNTIME_CANDIDATE_ENRICHMENT_01: ${note}`;
  }

  for (const name of names) await writeFile(path.join(dir, `${name}.csv`), serialize(tables[name]));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
