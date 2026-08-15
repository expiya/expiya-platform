import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PRICE_PAGE = "https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html";
const PAPI_ENDPOINT = "https://org-eu-www.hyundai.com/eu/papi";
const OUTPUT_DIR = path.resolve("data/cars/vehicle_evidence/working/HYUNDAI_BATCH_01");
const USER_AGENT = "ExpiyaCarsEvidenceCollector/0.1 (+https://www.expiya.com)";

const PRICE_QUERY = `
  query HppPriceListTR(
    $service: TrimmedString!
    $country: TrimmedString!
    $modelId: TrimmedString!
  ) {
    hppPriceListTR(service: $service, country: $country, modelId: $modelId) {
      plant productYear modelDescription powertrainNm trimNm fuelTypeNm
      transmissionType maxPrice maxcampaignPrice
    }
  }
`;

interface HyundaiPriceRow {
  readonly plant: string;
  readonly productYear: number;
  readonly modelDescription: string;
  readonly powertrainNm: string;
  readonly trimNm: string;
  readonly fuelTypeNm: string;
  readonly transmissionType: string;
  readonly maxPrice: number | null;
  readonly maxcampaignPrice: number | null;
}

interface HyundaiModelEndpoint {
  readonly pageLabel: string;
  readonly modelId: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function csvCell(value: unknown): string {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function toCsv(rows: readonly Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  return [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(csvCell).join(","))
    .join("\n") + "\n";
}

function decodeHtml(value: string): string {
  return value.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#34;", '"')
    .replaceAll("&nbsp;", " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function extractModelEndpoints(html: string): HyundaiModelEndpoint[] {
  const pattern = /<span class="accordion__btn-inner">([\s\S]*?)<\/span>[\s\S]*?<script type="application\/hydration-marker" data-app-name="ModelPriceTable">\s*(\{[\s\S]*?\})\s*<\/script>/g;
  const endpoints: HyundaiModelEndpoint[] = [];
  for (const match of html.matchAll(pattern)) {
    const configuration = JSON.parse(match[2]) as { modelId?: string };
    if (configuration.modelId) endpoints.push({ pageLabel: decodeHtml(match[1]), modelId: configuration.modelId });
  }
  return endpoints;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

async function fetchPrices(modelId: string): Promise<{ raw: string; rows: HyundaiPriceRow[] }> {
  const response = await fetch(PAPI_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify({ query: PRICE_QUERY, variables: { service: "S03", country: "tr", modelId } }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${PAPI_ENDPOINT} returned HTTP ${response.status}`);
  const parsed = JSON.parse(raw) as { data?: { hppPriceListTR?: HyundaiPriceRow[] }; errors?: unknown };
  if (parsed.errors) throw new Error(`Hyundai PAPI returned errors for ${modelId}: ${JSON.stringify(parsed.errors)}`);
  return { raw, rows: parsed.data?.hppPriceListTR ?? [] };
}

export async function collectHyundaiBrandBatch(at = new Date()): Promise<void> {
  const observedAt = at.toISOString();
  const snapshotDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(at);
  const snapshotDir = path.join(OUTPUT_DIR, "snapshots", snapshotDate);
  await mkdir(snapshotDir, { recursive: true });

  const html = await fetchText(PRICE_PAGE);
  const endpoints = extractModelEndpoints(html);
  if (endpoints.length < 10) throw new Error(`Expected at least 10 Hyundai price-table endpoints, found ${endpoints.length}`);
  await writeFile(path.join(snapshotDir, "price-list.html"), html);

  const allRows: Array<HyundaiPriceRow & HyundaiModelEndpoint> = [];
  const sourceFiles: Array<{ modelId: string; file: string; sha256: string; rowCount: number }> = [];
  for (const endpoint of endpoints) {
    const result = await fetchPrices(endpoint.modelId);
    const safeId = endpoint.modelId.replaceAll("|", "_").replaceAll("*", "ALL");
    const file = path.join(snapshotDir, `prices-${safeId}.json`);
    const snapshotBytes = `${JSON.stringify(JSON.parse(result.raw), null, 2)}\n`;
    await writeFile(file, snapshotBytes);
    sourceFiles.push({ modelId: endpoint.modelId, file: path.relative(process.cwd(), file), sha256: sha256(snapshotBytes), rowCount: result.rows.length });
    for (const row of result.rows) allRows.push({ ...endpoint, ...row });
  }

  const normalized = allRows.map((row) => ({
    brand: "Hyundai", model: row.modelDescription, product_year: row.productYear,
    powertrain: row.powertrainNm, trim: row.trimNm, fuel: row.fuelTypeNm,
    transmission: row.transmissionType, list_price_try: row.maxPrice,
    campaign_price_try: row.maxcampaignPrice, plant: row.plant,
    source_model_id: row.modelId, source_page_label: row.pageLabel,
    observed_at: observedAt, source_url: PRICE_PAGE, source_endpoint: PAPI_ENDPOINT,
  }));
  const dedupeKeys = new Set(normalized.map((row) => [row.model, row.product_year, row.powertrain, row.trim].join("|")));
  if (dedupeKeys.size !== normalized.length) throw new Error("Duplicate Hyundai identity rows detected in official response");

  await writeFile(path.join(OUTPUT_DIR, "hyundai-official-price-rows.json"), `${JSON.stringify(normalized, null, 2)}\n`);
  await writeFile(path.join(OUTPUT_DIR, "hyundai-official-price-rows.csv"), toCsv(normalized));
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify({
    batchId: "HYUNDAI_BATCH_01", observedAt, observedDateTr: snapshotDate, market: "TR", condition: "NEW",
    sourcePage: PRICE_PAGE, sourceEndpoint: PAPI_ENDPOINT, sourcePageSha256: sha256(html),
    modelEndpointCount: endpoints.length, priceRowCount: normalized.length,
    modelCount: new Set(normalized.map((row) => row.model)).size, sourceFiles,
  }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectHyundaiBrandBatch().then(() => console.log(`Hyundai batch written to ${OUTPUT_DIR}`));
}
