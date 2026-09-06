import { descriptorForCategory, findSecretaryPhraseSpans, normalizeSecretaryPhrase, SECRETARY_ROUTE_DESCRIPTORS, type SecretaryCategoryId, type SecretaryRouteChoice } from "./secretaryRoutingPack";

export interface GovernedProductIdentity {
  readonly departmentId: string;
  readonly categoryId?: SecretaryCategoryId;
  readonly brand: string;
  readonly family?: string;
  readonly model: string;
  readonly exactIdentifiers?: readonly string[];
}
export interface SecretaryProductIdentityIndex {
  readonly status: "ACTIVE" | "FAILED_CLOSED";
  readonly entries: readonly SecretaryProductIdentityEntry[];
  readonly issue?: string;
}
export interface SecretaryProductIdentityEntry {
  readonly phrase: string;
  readonly rank: "EXACT" | "MODEL_OR_FAMILY" | "BRAND";
  readonly choice: SecretaryRouteChoice;
}

const safe = (value: string | undefined) => normalizeSecretaryPhrase(value ?? "");
const derivedFamily = (model: string): string | undefined => {
  const words = model.trim().split(/\s+/u);
  return words.length > 1 && /\d/u.test(words.slice(1).join(" ")) ? words[0] : undefined;
};

export function buildSecretaryProductIdentityIndex(products: readonly GovernedProductIdentity[]): SecretaryProductIdentityIndex {
  const issues: string[] = [];
  const raw: Array<SecretaryProductIdentityEntry & { brand: string }> = [];
  const exactOwners = new Map<string, string>();
  for (const product of products) {
    const descriptor = product.categoryId ? descriptorForCategory(product.categoryId) : SECRETARY_ROUTE_DESCRIPTORS.find(item => item.departmentId === product.departmentId && !item.categoryId);
    const brand = safe(product.brand); const model = safe(product.model);
    if (!descriptor || descriptor.departmentId !== product.departmentId || brand.length < 2 || model.length < 2) { issues.push(`MALFORMED_OR_INACTIVE:${product.categoryId ?? product.departmentId}`); continue; }
    const choice = { label: descriptor.localizedLabel, departmentId: descriptor.departmentId, destination: descriptor.destination } as const;
    const exact = [product.model, ...(product.exactIdentifiers ?? [])].map(safe).filter(value => value.length >= 2);
    for (const phrase of exact) {
      const owner = exactOwners.get(phrase);
      if (owner && owner !== choice.destination) issues.push(`CONFLICTING_EXACT_IDENTITY:${phrase}`);
      exactOwners.set(phrase, choice.destination); raw.push({ phrase, rank: "EXACT", choice, brand });
    }
    for (const phrase of [product.family, derivedFamily(product.model)].map(safe).filter(value => value.length >= 3 && value !== model)) raw.push({ phrase, rank: "MODEL_OR_FAMILY", choice, brand });
    const brandPhrases = [brand, /\s(electronics|elektronik|a\s?ş|a\.?s\.?)$/u.test(brand) ? brand.split(" ")[0] : undefined].filter((value): value is string => Boolean(value));
    for (const phrase of brandPhrases) raw.push({ phrase, rank: "BRAND", choice, brand: phrase });
  }
  if (issues.length) return Object.freeze({ status: "FAILED_CLOSED", entries: Object.freeze([]), issue: issues.join(",") });
  const unique = new Map<string, SecretaryProductIdentityEntry>();
  for (const entry of raw) {
    unique.set(`${entry.rank}:${entry.phrase}:${entry.choice.destination}`, { phrase: entry.phrase, rank: entry.rank, choice: entry.choice });
  }
  return Object.freeze({ status: "ACTIVE", entries: Object.freeze([...unique.values()]) });
}

export function matchSecretaryProductIdentity(message: string, index: SecretaryProductIdentityIndex): readonly SecretaryRouteChoice[] {
  if (index.status !== "ACTIVE") return Object.freeze([]);
  const normalized = normalizeSecretaryPhrase(message);
  const words = normalized.split(" ");
  const rankValue = { EXACT: 3, MODEL_OR_FAMILY: 2, BRAND: 1 } as const;
  const matches = index.entries.filter(entry => findSecretaryPhraseSpans(normalized,entry.phrase).some(span=>!["değil","degil","istemiyorum","istemem","aramıyorum","bakmıyorum","almıyorum"].includes(words[span.end]??"")));
  if (!matches.length) return Object.freeze([]);
  const bestRank = Math.max(...matches.map(entry => rankValue[entry.rank]));
  const bestLength = Math.max(...matches.filter(entry => rankValue[entry.rank] === bestRank).map(entry => entry.phrase.split(" ").length));
  return Object.freeze([...new Map(matches.filter(entry => rankValue[entry.rank] === bestRank && entry.phrase.split(" ").length === bestLength).map(entry => [entry.choice.destination, entry.choice])).values()]);
}
