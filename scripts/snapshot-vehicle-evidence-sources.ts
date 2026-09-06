import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseCsv, type Row } from "./vehicle-evidence";

const quote = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"','""')}"` : value;
const csv = (rows: Row[]) => {
  const headers = Object.keys(rows[0] ?? {});
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map(quote).join(",")).join("\n") + "\n";
};
const extension = (url: string, contentType: string) => {
  if (/pdf/i.test(contentType) || /\.pdf(?:$|\?)/i.test(url)) return "pdf";
  if (/json/i.test(contentType)) return "json";
  if (/xml/i.test(contentType)) return "xml";
  return "html";
};

async function main() {
  const [tablesDir, snapshotRoot, observedDate = new Date().toISOString().slice(0,10)] = process.argv.slice(2);
  if (!tablesDir || !snapshotRoot) throw new Error("Usage: snapshot-vehicle-evidence-sources <tables-dir> <snapshot-root> [YYYY-MM-DD]");
  const sourcesPath = path.join(tablesDir, "sources.csv");
  const rows = parseCsv(await readFile(sourcesPath, "utf8"));
  let captured = 0, unavailable = 0;
  for (const row of rows) {
    const url = row.source_url_canonical || row.source_url;
    if (row.source_snapshot_ref && row.source_snapshot_ref !== "SNAPSHOT_UNAVAILABLE" && existsSync(row.source_snapshot_ref)) {
      const bytes = await readFile(row.source_snapshot_ref);
      row.source_content_hash = createHash("sha256").update(bytes).digest("hex");
      row.notes = row.notes.replace(/\s*Snapshot unavailable: [^.]+\./g, "").trim();
      captured++;
      continue;
    }
    try {
      const response = await fetch(url, { headers: { "user-agent": "ExpiyaVehicleEvidenceSnapshot/0.2 (+repository evidence preservation)", accept: "text/html,application/pdf,application/json,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error("empty response");
      const contentType = response.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
      const hash = createHash("sha256").update(bytes).digest("hex");
      const directory = path.join(snapshotRoot, row.source_id, observedDate);
      const snapshotPath = path.join(directory, `source.${extension(url, contentType)}`);
      const repositoryPath = path.relative(process.cwd(), snapshotPath);
      await mkdir(directory, { recursive: true });
      await writeFile(snapshotPath, bytes);
      await writeFile(path.join(directory, "metadata.json"), JSON.stringify({ source_id: row.source_id, source_url_canonical: url, retrieved_at: new Date().toISOString(), content_sha256: hash, content_type: contentType, snapshot_path: repositoryPath }, null, 2) + "\n");
      row.source_content_hash = hash;
      row.source_snapshot_ref = repositoryPath;
      row.source_version_label ||= `observed ${observedDate}`;
      row.notes = row.notes.replace(/\s*Snapshot unavailable: [^.]+\./g, "").trim();
      captured++;
    } catch (error) {
      row.source_content_hash = "";
      row.source_snapshot_ref = "SNAPSHOT_UNAVAILABLE";
      const reason = error instanceof Error ? error.message : String(error);
      if (!row.notes.includes("Snapshot unavailable:")) row.notes = `${row.notes}${row.notes ? " " : ""}Snapshot unavailable: ${reason}.`;
      unavailable++;
    }
  }
  await writeFile(sourcesPath, csv(rows));
  console.log(JSON.stringify({ captured, unavailable, total: rows.length }));
}
main().catch((error)=>{ console.error(error); process.exitCode=1; });
