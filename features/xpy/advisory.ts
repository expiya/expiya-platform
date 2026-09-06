import type { XpyAdvisoryPresentation } from "./contracts";
import { consumerQuestionIsSafe } from "./questionGuidance";

export type XpyAdvisoryIntent = {
  readonly kind: "NOVICE_GUIDANCE" | "CATEGORY_GUIDANCE" | "FEATURE_EDUCATION" | "COMPARISON_INFORMATION" | "GENERAL_EDUCATION";
  readonly activeBuying: boolean;
};

export const normalizeXpyText = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").replace(/ı/gu, "i").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]+/gu, " ").trim();

function distance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[right.length];
}

const resembles = (token: string, stem: string) => token.startsWith(stem) || (token.length >= stem.length - 1 && distance(token.slice(0, stem.length), stem) <= 1);

export const xpyTermsMatch = (message: string, terms: readonly string[]) => {
  const text = normalizeXpyText(message);
  return terms.some(term => text.includes(normalizeXpyText(term)));
};

/** Universal X intent detector. Domain vocabulary and orientation copy remain pack-owned. */
export function detectXpyAdvisoryIntent(message: string): XpyAdvisoryIntent | undefined {
  const text = normalizeXpyText(message); if (!text) return undefined;
  const tokens = text.split(/\s+/u);
  const hasStem = (...stems: string[]) => tokens.some(token => stems.some(stem => token.startsWith(stem)));
  const hasTypo = (...stems: string[]) => tokens.some(token => stems.some(stem => resembles(token, stem)));
  const question = message.includes("?") || /\b(?:mi|mı|mu|mü|nedir|neler|nasil|nasıl|hangi|neye|nelere)\b/iu.test(message);
  const novice = hasTypo("yardim") || tokens.some(token => /^(?:basla|baslam|baslay)/u.test(token)) || /(?:hicbir|hic bir) sey bilmi|hic bilgim yok|secmeyi bilmi|nereden basla/iu.test(text);
  const education = /genel\s+bilgi|temel(?:lerini|leri)?\s+(?:anlat|ogret)|ana\s+farklar/iu.test(text);
  const comparison = !/\bfark etmez\b/iu.test(text) && (hasStem("karsilastir") || /\b(?:fark|farki|farklar|farklari|farklri)\b|avantaj.*dezavantaj|dezavantaj.*avantaj|arti.*eksi|eksi.*arti|hangisi\s+(?:daha|iyi|mantikli)/iu.test(text));
  const categoryGuidance = /nasil\s+sec|sec(?:im|erken|erkeniz|erkeniz|meliy|meyi).*nasil|nereden\s+basla|alirken.*(?:neye|nelere|neleri|hangi)|(?:neye|nelere|neleri)\s+(?:dikk|bak)|hangi\s+(?:kriter|olcut)|onemli\s+(?:kriter|olcut|nokta|konu|sey)|alici\s+rehber/iu.test(text)
    || ((hasTypo("dikkat", "kriter", "olcut") || hasStem("onem")) && /\b(?:ne|neler|neye|nelere|hangi|en cok)\b/iu.test(text));
  const featureEducation = question && (hasStem("gerek", "fayda", "yarar", "onem") || /ne\s+ise\s+yar|olmasa\s+olur|olmasi\s+sart|almaya\s+deger/iu.test(text));
  if (!novice && !education && !comparison && !categoryGuidance && !featureEducation) return undefined;
  const activeBuying = /satinal|satin\s+almak\s+isti|almayi\s+dusun|alacagim|alacagiz|secmek\s+isti|bana\s+(?:uygun|oner)|ariyorum|bakiyorum|ihtiyacim\s+var|lazim|kesin\s+al|benim\s+icin.*(?:sart|olmali|istiyorum|oncelik)/iu.test(text);
  const kind = novice ? "NOVICE_GUIDANCE" : comparison ? "COMPARISON_INFORMATION" : categoryGuidance ? "CATEGORY_GUIDANCE" : featureEducation ? "FEATURE_EDUCATION" : "GENERAL_EDUCATION";
  return { kind, activeBuying };
}

export function domainAdvisory(message: string): XpyAdvisoryPresentation {
  if (!consumerQuestionIsSafe(message)) throw new TypeError("XPY_ADVISORY_COPY_NOT_CONSUMER_SAFE");
  return { kind: "DOMAIN_ORIENTATION", source: "DOMAIN_PACK", message, contextMutation: "NONE" };
}
