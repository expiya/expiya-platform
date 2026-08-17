export type CanonicalJson = null | boolean | number | string | readonly CanonicalJson[] | { readonly [key: string]: CanonicalJson };

function canonicalValue(value: unknown): CanonicalJson {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return typeof value === "string" ? value.normalize("NFC") : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON rejects non-finite numbers.");
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key.normalize("NFC"), canonicalValue(child)]));
  }
  throw new TypeError("Canonical JSON accepts only JSON-safe plain values.");
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}
