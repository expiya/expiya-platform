import { createHash, randomUUID } from "node:crypto";

export const manualIndexAttestation = "MANUEL_TOPLADIM_VE_KULLANIM_YETKIM_VAR";

export interface ManualCatalogCandidate {
  readonly id: string;
  readonly sourceRowNumber: number;
  readonly sourcePlatform: "SAHIBINDEN" | "ARABAM" | "OTHER";
  readonly capturedAt: string;
  readonly brandRaw: string;
  readonly modelRaw: string;
  readonly generationRaw?: string;
  readonly bodyStyleRaw?: string;
  readonly yearFrom?: number;
  readonly yearUntil?: number;
  readonly fuelRaw?: string;
  readonly transmissionRaw?: string;
  readonly engineRaw?: string;
  readonly trimRaw?: string;
  readonly occurrenceCount: number;
  readonly sourceCategoryUrl?: string;
  readonly notes?: string;
  readonly usageAttestation: string;
  readonly normalizedBrand: string;
  readonly normalizedModel: string;
  readonly aliasText: string;
  readonly fingerprint: string;
}

export interface ManualCandidateParseReport {
  readonly accepted: readonly ManualCatalogCandidate[];
  readonly rejected: readonly { readonly rowNumber: number; readonly issues: readonly string[] }[];
}

const headers = ["Kaynak Platformu", "Toplama Tarihi", "Marka", "Model", "Seri / Nesil", "Kasa Tipi", "Başlangıç Yılı", "Bitiş Yılı", "Yakıt", "Şanzıman", "Motor", "Donanım", "Görülme Sayısı", "Kategori URL", "Notlar", "Kullanım Beyanı"] as const;

export const manualIndexCsvHeaders: readonly string[] = headers;

export function normalizeCatalogToken(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') { field += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field); field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else field += character;
  }
  if (quoted) throw new Error("UNCLOSED_CSV_QUOTE");
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function optionalInteger(value: string, field: string, issues: string[]): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) { issues.push(`${field}_INVALID`); return undefined; }
  return parsed;
}

export function parseManualCatalogCandidatesCsv(csv: string): ManualCandidateParseReport {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (rows.length === 0 || headers.some((header, index) => rows[0]?.[index]?.trim() !== header)) {
    throw new Error("MANUAL_INDEX_HEADERS_INVALID");
  }
  const accepted: ManualCatalogCandidate[] = [];
  const rejected: { rowNumber: number; issues: string[] }[] = [];
  for (const [offset, values] of rows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const [platform, capturedAt, brand, model, generation, bodyStyle, yearFromValue, yearUntilValue, fuel,
      transmission, engine, trim, occurrenceValue, sourceCategoryUrl, notes, attestation] = values.map((value) => value?.trim() ?? "");
    if (![brand, model, generation, engine, trim].some(Boolean)) continue;
    const issues: string[] = [];
    if (!(["SAHIBINDEN", "ARABAM", "OTHER"] as const).includes(platform as "SAHIBINDEN")) issues.push("SOURCE_PLATFORM_INVALID");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(capturedAt) || !Number.isFinite(new Date(`${capturedAt}T00:00:00.000Z`).getTime())) issues.push("CAPTURED_AT_INVALID");
    if (!brand) issues.push("BRAND_REQUIRED");
    if (!model) issues.push("MODEL_REQUIRED");
    if (attestation !== manualIndexAttestation) issues.push("USAGE_ATTESTATION_REQUIRED");
    const yearFrom = optionalInteger(yearFromValue, "YEAR_FROM", issues);
    const yearUntil = optionalInteger(yearUntilValue, "YEAR_UNTIL", issues);
    if (yearFrom && (yearFrom < 1900 || yearFrom > 2100)) issues.push("YEAR_FROM_OUT_OF_RANGE");
    if (yearUntil && (yearUntil < 1900 || yearUntil > 2100)) issues.push("YEAR_UNTIL_OUT_OF_RANGE");
    if (yearFrom && yearUntil && yearUntil < yearFrom) issues.push("YEAR_RANGE_INVALID");
    const occurrenceCount = optionalInteger(occurrenceValue || "1", "OCCURRENCE_COUNT", issues) ?? 1;
    if (occurrenceCount < 1) issues.push("OCCURRENCE_COUNT_INVALID");
    if (sourceCategoryUrl && !/^https:\/\//.test(sourceCategoryUrl)) issues.push("CATEGORY_URL_INVALID");
    if (issues.length) { rejected.push({ rowNumber, issues }); continue; }
    const aliasParts = [brand, model, generation, engine, transmission, trim, yearFromValue, yearUntilValue].filter(Boolean);
    const normalizedBrand = normalizeCatalogToken(brand);
    const normalizedModel = normalizeCatalogToken(model);
    const fingerprintInput = [normalizedBrand, normalizedModel, generation, bodyStyle, yearFrom, yearUntil, fuel, transmission, engine, trim]
      .map((value) => normalizeCatalogToken(String(value ?? ""))).join("|");
    accepted.push({
      id: randomUUID(), sourceRowNumber: rowNumber, sourcePlatform: platform as ManualCatalogCandidate["sourcePlatform"],
      capturedAt, brandRaw: brand, modelRaw: model, generationRaw: generation || undefined,
      bodyStyleRaw: bodyStyle || undefined, yearFrom, yearUntil, fuelRaw: fuel || undefined,
      transmissionRaw: transmission || undefined, engineRaw: engine || undefined, trimRaw: trim || undefined,
      occurrenceCount, sourceCategoryUrl: sourceCategoryUrl || undefined, notes: notes || undefined,
      usageAttestation: manualIndexAttestation, normalizedBrand, normalizedModel,
      aliasText: aliasParts.join(" "), fingerprint: createHash("sha256").update(fingerprintInput).digest("hex"),
    });
  }
  return { accepted, rejected };
}
