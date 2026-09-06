import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../features/catalog-factory/canonical";
import { PILOT_INPUT } from "../features/catalog-factory/fixtures";
import { runCatalogFactory, type CheckpointStore } from "../features/catalog-factory/pipeline";
import type { FactoryCheckpoint } from "../features/catalog-factory/contracts";

const root = process.cwd(); const outputDirectory = path.join(root, "outputs/catalog-factory-v0.1-pilot"); const checkpointFile = path.join(outputDirectory, "checkpoint.json");
const store: CheckpointStore = { async load(inputDigest) { try { const value = JSON.parse(await readFile(checkpointFile, "utf8")) as FactoryCheckpoint; return value.inputDigest === inputDigest ? value : undefined; } catch { return undefined; } }, async save(value) { await mkdir(outputDirectory, { recursive: true }); await writeFile(checkpointFile, `${canonicalJson(value)}\n`); } };
async function main() {
  const result = await runCatalogFactory(PILOT_INPUT, { checkpointStore: store, concurrency: 4, now: "2026-09-06T12:00:00.000Z" });
  await writeFile(path.join(outputDirectory, "candidate.json"), `${canonicalJson(result)}\n`); console.log(result.digest);
}
void main();
