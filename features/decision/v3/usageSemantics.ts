import type { SourceSpan, V3UsagePurpose } from "./types";

export interface DetectedUsagePurpose {
  readonly value: V3UsagePurpose;
  readonly sourceSpan: SourceSpan;
  readonly confidence: number;
}

const whole = (text: string): SourceSpan => ({ start: 0, end: text.length, text });

/** Bounded outage fallback: only explicit use language becomes a preference. */
export function detectExplicitUsagePurpose(text: string): DetectedUsagePurpose | undefined {
  const normalized = text.replace(/ticari(?: kullanım)?\s+(?:değil|istemiyorum)|yük\s+taşım(?:ıyorum|ayacağım)/giu, "");
  const detected =
    /(?:yolcu|personel|öğrenci|müşteri|misafir|turist|katılımcı|konuk)[\p{L}]*.{0,60}taşı|(?:okul|personel|öğrenci)\s+servis|servis\s+taşımacılı|havaalanı\s+transfer|vip\s+transfer|shuttle|taksi|taxi/iu.test(normalized) ? "PASSENGER_TRANSPORT" as const
    : /(?:satış (?:departmanı|ekibi|temsilci)|müşteri(?:leri)? ziyaret|saha ekibi|şirket aracı|filo|iş seyahati|iş görüşmesi|bayi ziyaret)/iu.test(normalized) ? "CORPORATE_TRAVEL" as const
    : /(?:^|\s)(?:yük(?:ü|ün|ler|leri)?|koli[\p{L}]*|ürün[\p{L}]*|kargo[\p{L}]*)(?:\s|$)|yük taşı|nakliye|dağıtım|teslimat|şantiye|esnaf|dükkan|kurye|panel\s*van|panelvan|açık kasa|ticari\s+araç/iu.test(normalized) ? "COMMERCIAL" as const
    : /(?:kamp|arazi|bozuk yol|köy yol|yayla|bağ evi|çiftlik yol|patika|doğa(?:ya|da)|4x4|dört çeker)|(?:bisiklet|kamp|açık hava|outdoor|spor).{0,50}(?:malzeme|ekipman)/iu.test(normalized) ? "MIXED_ROAD" as const
    : /(?:aile|çocuk(?!luğum|\s*oyuncağı)|bebek|puset|kalabalık sülale|yaşlı (?:ann|bab)|annemi|babamı|eşimle|çocuklarımla)/iu.test(normalized) ? "FAMILY" as const
    : /(?:uzun yol|şehirler arası|seyahat|tatil yolculu|ege turnesi|otoyol|sık sık şehir dışı)/iu.test(normalized) ? "LONG_DISTANCE" as const
    : /(?:şehir içi|şehir merkez|dar sokak|paralel park|günlük|[iİ]şe\s+(?:gidip|gidiş|gelip)|iş gidiş|okula? (?:gidip|gidiş)|alışveriş|kısa mesafe|arkadaşlarla (?:takıl|gez)|gezmek|ayağımı yerden|toplu taşıma|otobüsle uğraş)/iu.test(normalized) ? "URBAN_DAILY" as const
    : undefined;
  return detected ? { value: detected, sourceSpan: whole(text), confidence: 0.96 } : undefined;
}
