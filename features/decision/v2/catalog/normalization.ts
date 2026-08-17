export const CATALOG_NORMALIZATION_POLICY = Object.freeze({
  policyId: "cars-catalog-identity-normalization",
  version: "1.0.0",
  unicodeForm: "NFKC" as const,
});

const TURKISH_CASE_FOLD: Readonly<Record<string, string>> = Object.freeze({ I: "i", İ: "i", ı: "i" });
const TURKISH_ASCII: Readonly<Record<string, string>> = Object.freeze({ ç: "c", ğ: "g", ö: "o", ş: "s", ü: "u" });

export function normalizeCatalogIdentity(value: string): string {
  const caseFolded = [...value.normalize("NFKC")].map((character) => TURKISH_CASE_FOLD[character] ?? character.toLocaleLowerCase("tr-TR")).join("");
  const ascii = [...caseFolded].map((character) => TURKISH_ASCII[character] ?? character).join("");
  const normalized = ascii
    .replace(/[’‘`´]/gu, "'")
    .replace(/[‐‑‒–—−]/gu, "-")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
  if (!normalized) throw new TypeError("Catalog identity normalizes to an empty value.");
  return normalized;
}
