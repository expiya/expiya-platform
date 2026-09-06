import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const parseCsv = (text) => {
  const rows=[]; let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted&&c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=!quoted;else if(!quoted&&c===','){row.push(cell);cell="";}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some((v)=>v!==""))rows.push(row);row=[];cell="";}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;
};
const colName=(n)=>{let s="";for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const base="data/cars/vehicle_evidence/working/SCALE_BATCH_03";
const input=await FileBlob.load(`${base}/Expiya_Cars_Vehicle_Evidence_SCALE_BATCH_03_WORKING.xlsx`);
const workbook=await SpreadsheetFile.importXlsx(input);
const mapping={
  "01_VEHICLE_MODELS":"models.csv","02_GENERATIONS":"generations.csv","03_POWERTRAINS":"powertrains.csv","04_CONFIGURATIONS":"configurations.csv","05_EVIDENCE_FACTS":"evidence_facts.csv","06_EQUIPMENT":"equipment.csv","07_SAFETY":"safety.csv","08_SOURCES":"sources.csv","09_ASSERTIONS":"assertions.csv","10_COLLECTION_QUEUE":"collection_queue.csv","11_DATA_DICTIONARY":"data_dictionary.csv","12_LISTS":"lists.csv",
};
let tableIndex=1;
for(const [sheetName,file] of Object.entries(mapping)){
  const sheet=workbook.worksheets.getItem(sheetName); const matrix=parseCsv(await fs.readFile(`${base}/tables/${file}`,"utf8"));
  const old=sheet.getUsedRange(); const oldTables=[...sheet.tables.items]; const style=oldTables[0]?.style;
  for(const table of oldTables)table.delete(); old.clear({applyTo:"contents"});
  const target=sheet.getRange(`A1:${colName(matrix[0].length)}${matrix.length}`); target.values=matrix;
  target.format.wrapText=false; target.getRow(0).format={fill:"#5B9BD5",font:{bold:true,color:"#FFFFFF"},borders:{preset:"inside",style:"thin",color:"#D9E2F3"}};
  const table=sheet.tables.add(target,true,`VehicleEvidenceTable${tableIndex++}`); if(style)table.style=style; table.showFilterButton=true; table.showBandedRows=true;
  sheet.freezePanes.freezeRows(1); sheet.showGridLines=false;
  const used=sheet.getUsedRange(); used.format.autofitColumns();
  const maxWidths={"01_VEHICLE_MODELS":38,"02_GENERATIONS":42,"03_POWERTRAINS":42,"04_CONFIGURATIONS":48,"05_EVIDENCE_FACTS":42,"06_EQUIPMENT":38,"08_SOURCES":55,"09_ASSERTIONS":48,"10_COLLECTION_QUEUE":42,"11_DATA_DICTIONARY":48};
  const cap=maxWidths[sheetName]??36; for(let c=0;c<matrix[0].length;c++){const col=sheet.getRangeByIndexes(0,c,matrix.length,1);if(col.format.columnWidth>cap)col.format.columnWidth=cap;}
  used.format.autofitRows();
}
const readme=workbook.worksheets.getItem("00_README");
readme.getRange("A1").values=[["Expiya Cars Vehicle Evidence Dataset v0.4.0"]];
readme.getRange("B2").clear({applyTo:"contents"});
readme.getRange("B3").values=[["Canonical, provenance-first vehicle evidence workbook for Expiya Cars MVP."]];
readme.getRange("B4").values=[["SCALE_BATCH_03 WORKING v0.4.0 — VALIDATOR PASS"]];
readme.getRange("B5").values=[["Vehicle Identity + Typed Evidence + Equipment + Safety + Fact-level Provenance"]];
readme.getRange("B45").values=[["0.4.0"]];
readme.getRange("B46").values=[["0.4.0"]];
readme.getRange("B47").values=[["SCALE_BATCH_03"]];
readme.getRange("B48").values=[["2026-08-14"]];
readme.getRange("E47:E48").values=[["2026-08-14"],["2026-08-14"]];
const check=await workbook.inspect({kind:"table",sheetId:"04_CONFIGURATIONS",range:"A1:N55",include:"values,formulas",tableMaxRows:8,tableMaxCols:14,maxChars:9000});
await fs.writeFile(`${base}/WORKBOOK_INSPECT.ndjson`,check.ndjson);
const errors=await workbook.inspect({kind:"match",searchTerm:"#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",options:{useRegex:true,maxResults:300},summary:"final formula error scan"});
await fs.writeFile(`${base}/FORMULA_ERROR_SCAN.ndjson`,errors.ndjson);
await fs.mkdir(`${base}/renders`,{recursive:true});
for(let i=0;i<workbook.worksheets.items.length;i++){const sheet=workbook.worksheets.getItemAt(i);const preview=await workbook.render({sheetName:sheet.name,autoCrop:"all",scale:0.65,format:"png"});await fs.writeFile(`${base}/renders/${String(i).padStart(2,"0")}_${sheet.name}.png`,new Uint8Array(await preview.arrayBuffer()));}
const output=await SpreadsheetFile.exportXlsx(workbook); await output.save(`${base}/Expiya_Cars_Vehicle_Evidence_SCALE_BATCH_03_WORKING.xlsx`);
