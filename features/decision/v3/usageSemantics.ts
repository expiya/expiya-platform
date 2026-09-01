import type { SourceSpan, V3UsagePurpose } from "./types";

export interface DetectedUsagePurpose {
  readonly value: V3UsagePurpose;
  readonly sourceSpan: SourceSpan;
  readonly confidence: number;
}

/** Bounded outage fallback: only explicit use language becomes a preference. */
export function detectExplicitUsagePurpose(text: string): DetectedUsagePurpose | undefined {
  const sanitized = text.replace(
    /ticari(?: kullanım)?\s+(?:değil|istemiyorum)|yük\s+taşım(?:ıyorum|ayacağım)|yük\s+taşıma.{0,50}(?:nereden|neden|ne alaka|demedim|söylemedim)|(?:nereden|neden|ne alaka).{0,50}yük\s+taşıma/giu,
    (match) => " ".repeat(match.length),
  );
  const patterns: readonly [RegExp, V3UsagePurpose][] = [
    [/(?:yolcu|personel|öğrenci|müşteri|misafir|turist|katılımcı|konuk)[\p{L}]*.{0,60}taşı|(?:okul|personel|öğrenci)\s+servis|servis\s+taşımacılı|havaalanı\s+transfer|vip\s+transfer|shuttle|taksi|taxi/iu, "PASSENGER_TRANSPORT"],
    [/(?:satış (?:departmanı|ekibi|temsilci)|müşteri(?:leri)? ziyaret|saha ekibi|şirket aracı|filo|iş seyahati|iş görüşmesi|bayi ziyaret)/iu, "CORPORATE_TRAVEL"],
    [/(?:^|\s)(?:yük(?:ü|ün|ler|leri)?|koli[\p{L}]*|ürün[\p{L}]*|kargo[\p{L}]*)(?:\s|$)|yük taşı|nakliye|dağıtım|teslimat|şantiye|esnaf|dükkan|kurye|panel\s*van|panelvan|açık kasa|ticari\s+araç/iu, "COMMERCIAL"],
    [/(?:köyde|kırsalda).{0,30}(?:yaşıyorum|yaşıyoruz)|bağ bahçe(?: işleri)?/iu, "RURAL_DAILY"],
    [/(?:arazi|bozuk(?:\s+ve\s+\p{L}+)?\s+yol|stabilize\s+yol|toprak\s+yol|mıcır(?:lı)?\s+yol|asfaltsız\s+yol|engebeli\s+yol|çamurlu\s+yol|köy\s+yol|köyde.{0,40}(?:kullan|sür|git|araç)|kırsal(?:da|\s+yol)|yayla|bağ evi|çiftlik yol|patika|4x4|dört çeker)/iu, "MIXED_ROAD"],
    [/(?:aile|çocuk(?!ken|luk|luğum|\s*oyuncağı)|bebek|puset|kalabalık sülale|yaşlı (?:ann|bab)|annemi|babamı|eşimle|çocuklarımla)/iu, "FAMILY"],
    [/(?:uzun yol|şehirler arası|seyahat|tatil yolculu|ege turnesi|otoyol|sık sık şehir dışı)/iu, "LONG_DISTANCE"],
    [/(?:şehir içi|şehir merkez|dar sokak|paralel park|günlük|[iİ]şe\s+(?:gidip|gidiş|gelip)|iş gidiş|okula? (?:gidip|gidiş)|alışveriş|kısa mesafe|arkadaşlarla (?:takıl|gez)|gezmek|ayağımı yerden|toplu taşıma|otobüsle uğraş)/iu, "URBAN_DAILY"],
  ];
  for (const [pattern, value] of patterns) {
    const match = pattern.exec(sanitized);
    if (match?.index === undefined) continue;
    const start = match.index; const end = start + match[0].length;
    return { value, sourceSpan: { start, end, text: text.slice(start, end) }, confidence: 0.96 };
  }
  return undefined;
}
