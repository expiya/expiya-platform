import { createHash } from "node:crypto";

export type SmartphoneTerminalState =
  | "ADMITTED"
  | "REJECTED_INSUFFICIENT_TR_APPLICABILITY"
  | "REJECTED_IDENTITY_AMBIGUOUS"
  | "DUPLICATE"
  | "RETIRED_UNSUPPORTED";

export interface SmartphoneObservation {
  readonly query: string;
  readonly page: number;
  readonly asin: string;
  readonly observedTitle: string;
  readonly observedAt: string;
  readonly canonicalUrl: string;
  readonly terminalState: SmartphoneTerminalState;
  readonly exactProductId: string | null;
  readonly reason: string;
}

export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`).join(",")}}`;
};

export const digest = (value: unknown): string => `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;

export function validateSmartphoneObservations(rows: readonly SmartphoneObservation[]): readonly string[] {
  const issues: string[] = [], keys = new Set<string>();
  for (const row of rows) {
    const key = `${row.query}\0${row.page}\0${row.asin}`;
    if (keys.has(key)) issues.push(`DUPLICATE_QUERY_PAGE_ASIN:${row.asin}`);
    keys.add(key);
    if (!/^[A-Z0-9]{10}$/.test(row.asin)) issues.push(`INVALID_ASIN:${row.asin}`);
    if (row.canonicalUrl !== `https://www.amazon.com.tr/dp/${row.asin}`) issues.push(`INVALID_URL:${row.asin}`);
    if (row.terminalState === "ADMITTED" && !row.exactProductId) issues.push(`ADMITTED_WITHOUT_EXACT_ID:${row.asin}`);
  }
  return issues;
}

export function materiality(values: readonly unknown[]) {
  const known = values.filter(value => value !== null && value !== undefined);
  return { known: known.length, unknown: values.length - known.length, distinctKnown: new Set(known.map(value => JSON.stringify(value))).size, material: known.length > values.length / 2 && new Set(known.map(value => JSON.stringify(value))).size > 1 };
}
