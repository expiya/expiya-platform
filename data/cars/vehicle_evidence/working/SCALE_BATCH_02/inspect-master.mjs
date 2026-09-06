import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("data/cars/vehicle_evidence/working/SCALE_BATCH_02/Expiya_Cars_Vehicle_Evidence_SCALE_BATCH_02_WORKING.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 5,
  tableMaxCols: 8,
  tableMaxCellChars: 80,
});
await fs.writeFile("/private/tmp/scale_batch_02_master_inspect.ndjson", summary.ndjson);
for (const sheetName of ["00_README", "01_VEHICLE_MODELS", "04_CONFIGURATIONS", "05_EVIDENCE_FACTS", "08_SOURCES"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 0.8, format: "png" });
  await fs.writeFile(`/private/tmp/scale_batch_02_${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
