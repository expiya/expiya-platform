import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const ALFA_ROMEO_PRICE_PAGE = "https://www.alfaromeo.com.tr/alfa-romeo-fiyat-listesi";
export const ALFA_ROMEO_PRICE_ENDPOINT = "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo";
const OUTPUT_DIR = path.resolve("data/cars/vehicle_evidence/working/ALFA_ROMEO_BATCH_01");
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 ExpiyaCarsEvidenceCollector/0.1";

export interface AlfaRomeoOfficialPriceRow {
  readonly brand: "Alfa Romeo";
  readonly model: string;
  readonly product_year: number;
  readonly drivetrain: string;
  readonly trim: string;
  readonly transmission: string;
  readonly fuel: string;
  readonly list_price_try: number;
  readonly price_effective_from: string;
  readonly observed_at: string;
  readonly source_url: string;
  readonly source_endpoint: string;
}

function decodeHtml(value: string): string {
  const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">" };
  return value
    .replace(/&#(x?[0-9a-f]+);/gi, (_match, entity: string) =>
      String.fromCodePoint(entity.toLowerCase().startsWith("x") ? Number.parseInt(entity.slice(1), 16) : Number.parseInt(entity, 10)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => named[entity.toLowerCase()] ?? match)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function extractEffectiveDate(html: string): string {
  const match = html.match(/(?:geçerli|itibaren)[^0-9]{0,80}(\d{1,2})[./](\d{1,2})[./](\d{4})/i)
    ?? html.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})[^<]{0,80}(?:geçerli|itibaren)/i);
  if (!match) throw new Error("Official Alfa Romeo price effective date was not found");
  return toIsoDate(match[1], match[2], match[3]);
}

export function extractOfficialPriceRows(
  html: string,
  observedAt: string,
  sourceUrl = ALFA_ROMEO_PRICE_PAGE,
): AlfaRomeoOfficialPriceRow[] {
  const effectiveFrom = extractEffectiveDate(html);
  const yearMatch = html.match(/<p[^>]*class=["'][^"']*year[^"']*["'][^>]*>\s*(20\d{2})\s*<\/p>/i);
  if (!yearMatch) throw new Error("Official Alfa Romeo model year was not found");
  const productYear = Number(yearMatch[1]);
  const rows: AlfaRomeoOfficialPriceRow[] = [];

  for (const tableRow of html.matchAll(/<tr[^>]*class=["'][^"']*mobile-disable[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...tableRow[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => decodeHtml(match[1]));
    if (cells.length !== 6 || !/TL/i.test(cells[5])) continue;
    const price = Number(cells[5].replace(/[^0-9]/g, ""));
    if (!Number.isSafeInteger(price) || price <= 0) throw new Error(`Invalid Alfa Romeo price: ${cells[5]}`);
    rows.push({
      brand: "Alfa Romeo", model: cells[0], product_year: productYear, drivetrain: cells[1], trim: cells[2],
      transmission: cells[3], fuel: cells[4], list_price_try: price, price_effective_from: effectiveFrom,
      observed_at: observedAt, source_url: sourceUrl, source_endpoint: ALFA_ROMEO_PRICE_ENDPOINT,
    });
  }
  return rows;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function csvCell(value: unknown): string {
  const stringValue = String(value ?? "");
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replaceAll('"', '""')}"` : stringValue;
}

function toCsv(rows: readonly Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  return [headers, ...rows.map((row) => headers.map((header) => row[header]))]
    .map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "tr-TR,tr;q=0.9,en;q=0.7",
    "user-agent": USER_AGENT,
  } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

export async function collectAlfaRomeoBrandBatch(at = new Date()): Promise<void> {
  const observedAt = at.toISOString();
  const snapshotDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(at);
  const snapshotDir = path.join(OUTPUT_DIR, "snapshots", snapshotDate);
  await mkdir(snapshotDir, { recursive: true });

  const [pageHtml, priceHtml] = await Promise.all([fetchText(ALFA_ROMEO_PRICE_PAGE), fetchText(ALFA_ROMEO_PRICE_ENDPOINT)]);
  const rows = extractOfficialPriceRows(priceHtml, observedAt);
  if (rows.length !== 4) throw new Error(`Expected exactly 4 current Alfa Romeo price rows, found ${rows.length}; manual review required`);
  const identities = new Set(rows.map((row) => [row.model, row.product_year, row.drivetrain, row.trim, row.transmission, row.fuel].join("|")));
  if (identities.size !== rows.length) throw new Error("Duplicate Alfa Romeo official configuration identity detected");

  await writeFile(path.join(snapshotDir, "price-page.html"), pageHtml);
  await writeFile(path.join(snapshotDir, "official-price-list.html"), priceHtml);
  await writeFile(path.join(OUTPUT_DIR, "alfa-romeo-official-price-rows.json"), `${JSON.stringify(rows, null, 2)}\n`);
  await writeFile(path.join(OUTPUT_DIR, "alfa-romeo-official-price-rows.csv"), toCsv(rows as unknown as Record<string, unknown>[]));
  await writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify({
    batchId: "ALFA_ROMEO_BATCH_01", observedAt, observedDateTr: snapshotDate, market: "TR", condition: "NEW",
    sourcePage: ALFA_ROMEO_PRICE_PAGE, sourceEndpoint: ALFA_ROMEO_PRICE_ENDPOINT,
    priceEffectiveFrom: rows[0].price_effective_from, modelYear: rows[0].product_year,
    modelCount: new Set(rows.map((row) => row.model.replace(/ (ELETTRICA|IBRIDA|HYBRID 175|DIESEL 130)$/i, ""))).size,
    configurationCount: rows.length,
    sourceFiles: [
      { file: path.relative(process.cwd(), path.join(snapshotDir, "price-page.html")), sha256: sha256(pageHtml) },
      { file: path.relative(process.cwd(), path.join(snapshotDir, "official-price-list.html")), sha256: sha256(priceHtml) },
    ],
  }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  collectAlfaRomeoBrandBatch().then(() => console.log(`Alfa Romeo batch written to ${OUTPUT_DIR}`));
}
