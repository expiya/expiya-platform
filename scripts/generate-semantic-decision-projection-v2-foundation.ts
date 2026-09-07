import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSemanticDecisionProjectionV2Artifacts } from "../features/semantic-decision-projection/v2/artifacts";

async function main() {
  const outputDirectory = path.join(process.cwd(), "data/research/xpy-semantic-decision-projection-v2-foundation-01");
  const result = buildSemanticDecisionProjectionV2Artifacts();
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(Object.entries(result.serialized).map(([name, body]) => writeFile(path.join(outputDirectory, name), body, "utf8")));
  console.log(`Generated ${Object.keys(result.serialized).length} shadow-only artifacts at ${outputDirectory}`);
  console.log(`Release digest: ${String(result.manifest.releaseDigest)}`);
}

void main();
