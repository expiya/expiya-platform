import type { V3VehicleReferenceSignal } from "./types";

interface CulturalReferenceDefinition {
  readonly kind: V3VehicleReferenceSignal["kind"];
  readonly canonicalVehicle: string;
  readonly ambiguity: V3VehicleReferenceSignal["ambiguity"];
  readonly clues: readonly RegExp[];
}

const KNOWN_REFERENCES: readonly CulturalReferenceDefinition[] = [
  {
    kind: "POP_CULTURE",
    canonicalVehicle: "Chevrolet Camaro",
    ambiguity: "MULTIPLE_VEHICLES",
    clues: [
      /(?:transformers(?:\s+filmindeki)?\s+)?bumblebee/iu,
      /transformers.{0,60}(?:sarı|yellow).{0,30}(?:araba|araç|otomobil)|transformers.{0,60}(?:araba|araç|otomobil).{0,30}(?:sarı|yellow)/iu,
    ],
  },
  {
    kind: "POP_CULTURE",
    canonicalVehicle: "Pontiac Firebird Trans Am (KITT / Kara Şimşek)",
    ambiguity: "EXACT_VEHICLE",
    clues: [
      /(?:hey|hei|ey)\s+k[iı]t{1,2}/iu,
      /k[iı]t{1,2}.{0,40}(?:konuşan|konuşuyordu|araba|araç|otomobil)/iu,
      /(?:kara\s+şimşek|knight\s+rider)/iu,
      /(?:film|dizi).{0,80}(?:araba|araç|otomobil).{0,60}konuş/iu,
    ],
  },
  {
    kind: "HISTORICAL_MODEL",
    canonicalVehicle: "Ford Mustang",
    ambiguity: "MULTIPLE_VEHICLES",
    clues: [/\bmustang\b/iu],
  },
];

const indirectVehicleReference =
  /(?:film|dizi|oyun|çizgi film|yarış|klip).{0,140}(?:araba|araç|otomobil)|(?:araba|araç|otomobil).{0,140}(?:film|dizi|oyun|çizgi film|yarış|klip)/iu;

export function resolveBoundedCulturalVehicleReference(
  message: string,
): V3VehicleReferenceSignal | undefined {
  for (const definition of KNOWN_REFERENCES) {
    for (const clue of definition.clues) {
      const match = clue.exec(message);
      if (match?.index === undefined) continue;
      return {
        kind: definition.kind,
        referenceText: match[0],
        canonicalVehicle: definition.canonicalVehicle,
        sourceSpan: {
          start: match.index,
          end: match.index + match[0].length,
          text: message.slice(match.index, match.index + match[0].length),
        },
        confidence: 0.99,
        ambiguity: definition.ambiguity,
      };
    }
  }

  const match = indirectVehicleReference.exec(message);
  if (match?.index === undefined) return undefined;
  return {
    kind: "POP_CULTURE",
    referenceText: match[0],
    sourceSpan: {
      start: match.index,
      end: match.index + match[0].length,
      text: message.slice(match.index, match.index + match[0].length),
    },
    confidence: 0.78,
    ambiguity: "SYMBOLIC_ONLY",
  };
}

export function answerBoundedVehicleReferenceQuestion(
  message: string,
): string | undefined {
  if (!/\bmustang\b/iu.test(message)) return undefined;
  if (/(?:üretiliyor|üretimde|üretimi devam|hâlâ|hala).*(?:mı|mi|mu|mü)|(?:mı|mi|mu|mü).*(?:üretiliyor|üretimde)/iu.test(message))
    return "Evet, Ford Mustang üretilmeye devam ediyor. Ford'un güncel 2026 ürün ailesinde fastback ve convertible Mustang seçenekleri bulunuyor. Ancak Ford Mustang şu anda Expiya'nın aktif Türkiye sıfır kilometre kataloğunda yer almıyor; küresel üretimin sürmesi Türkiye'de resmî sıfır satışta bulunduğu anlamına gelmiyor.";
  if (/(?:nedir|ne biliyor|hakkında|nasıl bir|hangi araç)/iu.test(message))
    return "Ford Mustang, 1960'ların ortasından beri üretilen, uzun kaputlu ve sürüş karakteri güçlü Amerikan spor otomobili ailesidir. Güncel nesilde fastback ve convertible gövdeler ile farklı motor ve performans seviyeleri bulunur. Model üretilmeye devam etse de şu anda Expiya'nın aktif Türkiye sıfır kilometre kataloğunda yer almıyor.";
  return undefined;
}
