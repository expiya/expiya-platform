import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv, type Row } from "./vehicle-evidence";

const quote = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"','""')}"` : value;
const serialize = (rows: Row[]) => {
  const headers = Object.keys(rows[0] ?? {});
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map(quote).join(",")).join("\n") + "\n";
};
const excelDate = "46248";

async function update(directory: string, file: string, mutate: (rows: Row[]) => void) {
  const target = path.join(directory, file);
  const rows = parseCsv(await readFile(target, "utf8"));
  mutate(rows);
  await writeFile(target, serialize(rows));
}

async function main() {
  const [directory] = process.argv.slice(2);
  if (!directory) throw new Error("Usage: apply-post-batch01-hardening <tables-dir>");
  await update(directory, "sources.csv", (rows) => {
    const additions: Row[] = [
      {source_id:"SRC-000041",publisher:"Dacia Türkiye",source_title:"Yeni Jogger Türkiye konfigüratörü",source_type:"OFFICIAL_WEB",source_url:"https://www.dacia.com.tr/modeller/yeni-jogger/konfigurator-yeni.html",market:"TR",publication_date:"",retrieved_at:excelDate,authority_class:"A1_OFFICIAL_MARKET",source_status:"ACTIVE",notes:"POST_BATCH01_HARDENING closure attempt: current Extreme trim and available powertrain choices; rendered default remains TCe 110, so Eco-G 120 auto model-year linkage is not promoted.",source_url_canonical:"https://www.dacia.com.tr/modeller/yeni-jogger/konfigurator-yeni.html",source_version_label:"observed 2026-08-14",source_observed_at:excelDate,source_content_hash:"",source_snapshot_ref:""},
      {source_id:"SRC-000042",publisher:"Subaru Türkiye",source_title:"Yeni Forester Donanım ve Teknik Özellikler Föyü",source_type:"OFFICIAL_TECH_SPEC",source_url:"https://www.subaru.com.tr/documents/25S_FOR_EC_4syf_tr_181124-teknik-foy.pdf",market:"TR",publication_date:"",retrieved_at:excelDate,authority_class:"A1_OFFICIAL_MARKET",source_status:"ACTIVE",notes:"POST_BATCH01_HARDENING: official Turkey sheet ties 2.0i Style to 1995 cc e-BOXER, Lineartronic CVT and active-torque-distribution AWD.",source_url_canonical:"https://www.subaru.com.tr/documents/25S_FOR_EC_4syf_tr_181124-teknik-foy.pdf",source_version_label:"observed 2026-08-14",source_observed_at:excelDate,source_content_hash:"",source_snapshot_ref:""},
      {source_id:"SRC-000043",publisher:"Subaru Türkiye",source_title:"Yetkili Satıcı Fiyat Listesi — Ağustos 2026",source_type:"OFFICIAL_PRICE_LIST",source_url:"https://subaru.com.tr/documents/Subaru_BayiFiyatListesi_Guncel.pdf",market:"TR",publication_date:excelDate,retrieved_at:excelDate,authority_class:"A1_OFFICIAL_MARKET",source_status:"ACTIVE",notes:"Effective 1 August 2026; explicitly lists 2026 model-year Forester 2.0i e-BOXER Style.",source_url_canonical:"https://subaru.com.tr/documents/Subaru_BayiFiyatListesi_Guncel.pdf",source_version_label:"effective 2026-08-01",source_observed_at:excelDate,source_content_hash:"",source_snapshot_ref:""},
      {source_id:"SRC-000044",publisher:"Škoda Türkiye",source_title:"Škoda Türkiye 2026 model yılı fiyat listesi",source_type:"OFFICIAL_PRICE_LIST",source_url:"https://www.skoda.com.tr/fiyat-listesi",market:"TR",publication_date:"",retrieved_at:excelDate,authority_class:"A1_OFFICIAL_MARKET",source_status:"ACTIVE",notes:"POST_BATCH01_HARDENING: official current price-list UI identifies Scala in the 2026 model-year set; exact Premium/1.0 TSI 115 PS DSG linkage is in SRC-000038.",source_url_canonical:"https://www.skoda.com.tr/fiyat-listesi",source_version_label:"observed 2026-08-14",source_observed_at:excelDate,source_content_hash:"",source_snapshot_ref:""},
    ];
    for (const row of additions) if (!rows.some((existing) => existing.source_id === row.source_id)) rows.push(row);
  });
  await update(directory, "generations.csv", (rows) => {
    const forester=rows.find((r)=>r.generation_id==="GEN-000022")!; forester.identity_status="VERIFIED"; forester.notes="POST_BATCH01_HARDENING: current sixth-generation Turkey model verified by official new-Forester technical material and MY2026 price list (SRC-000042/043).";
    const scala=rows.find((r)=>r.generation_id==="GEN-000023")!; scala.identity_status="VERIFIED"; scala.notes="POST_BATCH01_HARDENING: current Scala facelift verified by official Turkey model, comparison and 2026 price-list pages (SRC-000038/040/044).";
    const jogger=rows.find((r)=>r.generation_id==="GEN-000013")!; jogger.notes="POST_BATCH01_HARDENING closure attempted with SRC-000030/041. Current Yeni Jogger is shown, but exact 2026 model-year identity for Extreme Eco-G 120 auto was not deterministically established; remains PROVISIONAL.";
  });
  await update(directory, "powertrains.csv", (rows) => {
    const forester=rows.find((r)=>r.powertrain_id==="PWR-000024")!; forester.identity_status="VERIFIED"; forester.notes="POST_BATCH01_HARDENING: official Turkey technical sheet verifies 2.0i e-BOXER, 1995 cc, Lineartronic CVT and active-torque-distribution AWD (SRC-000042).";
    const scala=rows.find((r)=>r.powertrain_id==="PWR-000025")!; scala.identity_status="VERIFIED"; scala.notes="POST_BATCH01_HARDENING: official Turkey comparison/model pages verify 1.0 TSI 115 PS DSG, 999 cc, 85 kW and 200 Nm for Scala Premium (SRC-000038/040).";
    const jogger=rows.find((r)=>r.powertrain_id==="PWR-000014")!; jogger.notes="POST_BATCH01_HARDENING closure attempted. Official current configurator exposes Eco-G 120 auto under Extreme choices, but deterministic selected-state/model-year evidence was not captured; remains PROVISIONAL.";
  });
  await update(directory, "configurations.csv", (rows) => {
    const forester=rows.find((r)=>r.configuration_id==="CFG-000028")!; forester.configuration_status="VERIFIED"; forester.notes="POST_BATCH01_HARDENING VERIFIED: official Aug 2026 Turkey price list identifies MY2026 Forester 2.0i e-BOXER Style; official technical sheet establishes Lineartronic AWD applicability (SRC-000042/043).";
    const scala=rows.find((r)=>r.configuration_id==="CFG-000029")!; scala.configuration_status="VERIFIED"; scala.notes="POST_BATCH01_HARDENING VERIFIED: official 2026 price list establishes current MY set and official vehicle comparison links Scala Premium directly to 1.0 TSI 115 PS DSG (SRC-000038/040/044).";
    const jogger=rows.find((r)=>r.configuration_id==="CFG-000017")!; jogger.notes="POST_BATCH01_HARDENING attempted with official comparison/configurator (SRC-000030/041). Extreme and Eco-G 120 auto appear as current choices, but rendered selected state defaults to TCe 110 and no exact 2026 MY linkage was captured; remains PROVISIONAL.";
  });
  await update(directory, "assertions.csv", (rows) => {
    const forester=rows.find((r)=>r.assertion_id==="AST-000246")!; forester.source_id="SRC-000042"; forester.source_location="technical specifications p.2"; forester.notes="POST_BATCH01_HARDENING reviewer gate; exact official Turkey Forester 2.0i Style technical sheet.";
    for (const id of ["AST-000247","AST-000248","AST-000249"]) { const row=rows.find((r)=>r.assertion_id===id)!; row.notes="POST_BATCH01_HARDENING reviewer gate; official Turkey Scala model/comparison evidence."; }
  });
}
main().catch((error)=>{ console.error(error); process.exitCode=1; });
