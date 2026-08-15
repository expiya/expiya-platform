import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("data/cars/vehicle_evidence/working/HYUNDAI_BATCH_01");
const BROCHURE_PAGE = "https://www.hyundai.com/tr/tr/satis/brosurler.html";
const USER_AGENT = "ExpiyaCarsEvidenceCollector/0.1 (+https://www.expiya.com)";

export const HYUNDAI_BROCHURES = [
  ["INSTER", "https://dmassets.hyundai.com/is/content/hyundaiautoever/inster-brosurpdf"],
  ["KONA Elektrik", "https://dmassets.hyundai.com/is/content/hyundaiautoever/kona-ev-digital-brosur"],
  ["IONIQ 5", "https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq5-digital-brosur"],
  ["IONIQ 5 N", "https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq5n-dijital-brosurpdf"],
  ["IONIQ 6", "https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq-6-digital-brosurpdf"],
  ["IONIQ 9", "https://dmassets.hyundai.com/is/content/hyundaiautoever/ioniq9-digital-brosur"],
  ["i20", "https://dmassets.hyundai.com/is/content/hyundaiautoever/i20-dijital-brosurpdf"],
  ["i30", "https://dmassets.hyundai.com/is/content/hyundaiautoever/i30-digital-brosurpdf"],
  ["BAYON", "https://dmassets.hyundai.com/is/content/hyundaiautoever/bayon-digital-brosurpdf"],
  ["KONA", "https://dmassets.hyundai.com/is/content/hyundaiautoever/kona-digital-brosurpdf"],
  ["TUCSON", "https://dmassets.hyundai.com/is/content/hyundaiautoever/tucson-digital-brosurpdf"],
  ["SANTA FE Hibrit", "https://dmassets.hyundai.com/is/content/hyundaiautoever/santa-fe-digital-brosurpdf"],
  ["STARIA Hibrit", "https://dmassets.hyundai.com/is/content/hyundaiautoever/staria-digital-brosur"],
] as const;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function brochureFileName(model: string): string {
  return `${model.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
}

async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: response.headers.get("content-type") ?? "" };
}

export async function collectHyundaiBrochures(at = new Date()): Promise<void> {
  const observedAt = at.toISOString();
  const snapshotDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(at);
  const directory = path.join(OUTPUT_DIR, "snapshots", snapshotDate, "brochures");
  await mkdir(directory, { recursive: true });

  const sources = [];
  for (const [model, url] of HYUNDAI_BROCHURES) {
    const { bytes, contentType } = await fetchBytes(url);
    const hasPdfSignature = new TextDecoder("ascii").decode(bytes.slice(0, 5)) === "%PDF-";
    if (!hasPdfSignature || bytes.length < 10_000) {
      throw new Error(`${model} did not return a plausible PDF (${contentType}, ${bytes.length} bytes)`);
    }
    const fileName = brochureFileName(model);
    const file = path.join(directory, fileName);
    await writeFile(file, bytes);
    sources.push({ model, url, file: path.relative(process.cwd(), file), contentType: contentType || null, bytes: bytes.length, sha256: sha256(bytes) });
  }

  await writeFile(path.join(OUTPUT_DIR, "brochure-manifest.json"), `${JSON.stringify({
    batchId: "HYUNDAI_BATCH_01", observedAt, observedDateTr: snapshotDate,
    market: "TR", authority: "OFFICIAL_TURKEY_DISTRIBUTOR", sourcePage: BROCHURE_PAGE,
    brochureCount: sources.length, sources,
  }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectHyundaiBrochures().then(() => console.log(`Hyundai brochures written to ${OUTPUT_DIR}`));
}
