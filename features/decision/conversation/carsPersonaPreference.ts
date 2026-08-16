import type { CarsConversationMessage, CarsConversationTrace, CarsPersonaPreferenceState } from "@/types/carsConversation";
import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

export const PERSONA_OPTIONS: readonly { readonly label: string; readonly traits: readonly VehiclePersonaTrait[] }[] = [
  { label: "Sade ve rasyonel", traits: ["MINIMALISM", "VALUE"] },
  { label: "Sportif ve dinamik", traits: ["DRIVING_ENGAGEMENT", "DESIGN"] },
  { label: "Konforlu ve ağırbaşlı", traits: ["COMFORT"] },
  { label: "Teknolojik ve fütüristik", traits: ["TECHNOLOGY"] },
  { label: "Prestijli ve dikkat çekici", traits: ["PRESTIGE", "DESIGN"] },
  { label: "Doğa ve macera odaklı", traits: ["ADVENTURE"] },
];

const EXPLICIT_RULES: readonly [readonly VehiclePersonaTrait[], RegExp][] = [
  [["DESIGN", "DRIVING_ENGAGEMENT"], /erkeksi|güçlü ve köşeli|heybetli|agresif tasarım/iu],
  [["DESIGN"], /zarif|(?<!\p{L})şık(?!\p{L})|tasarım odaklı|dikkat çekici|tarz(?:ı|lı)|karakter(?:i|li)|imaj/iu],
  [["DRIVING_ENGAGEMENT", "DESIGN"], /sportif|genç ve dinamik|dinamik görün/iu],
  [["MINIMALISM"], /gösterişsiz|gösterişten uzak|sade ve entelektüel|minimal/iu],
  [["PRESTIGE"], /prestijli|premium dursun|lüks görünsün/iu],
  [["ADVENTURE"], /macera ruhu|doğa ve macera/iu],
  [["TECHNOLOGY"], /teknolojik ve fütüristik|fütüristik his|dijital karakter/iu],
  [["DESIGN", "MINIMALISM"], /çok kurumsal görünmesin|sıradan bir aile otomobili istemiyorum/iu],
];

const CANCEL = /^(?:fark etmez|farketmez|bilmiyorum|bunlar önemli değil|önemli değil|en mantıklısını seç|persona önemli değil)[.!\s]*$/iu;
const EXPLICIT_CANCEL = /(?:tarz|karakter|imaj|persona)[^.!?]{0,24}(?:fark etmez|farketmez|önemli değil)|en mantıklısını seç/iu;

export function explicitPersonaTraits(text: string): readonly VehiclePersonaTrait[] {
  return [...new Set(EXPLICIT_RULES.flatMap(([traits, pattern]) => pattern.test(text) ? traits : []))];
}

export function isPersonaCancellation(text: string): boolean {
  return CANCEL.test(text.trim());
}

function promptedPersonaTraits(text: string): readonly VehiclePersonaTrait[] {
  return PERSONA_OPTIONS.find((option) => text.toLocaleLowerCase("tr-TR").includes(option.label.toLocaleLowerCase("tr-TR")))?.traits ?? [];
}

export function derivePersonaPreference(messages: readonly CarsConversationMessage[]): CarsPersonaPreferenceState {
  let state: CarsPersonaPreferenceState = { activated: false, requestedTraits: [] };
  let userTurn = 0;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role !== "user") continue;
    userTurn += 1;
    const previous = messages[index - 1];
    const answeredPersonaPrompt = previous?.role === "assistant" && previous.optionSet?.purpose === "PERSONA";
    if ((answeredPersonaPrompt && isPersonaCancellation(message.content)) || (state.activated && EXPLICIT_CANCEL.test(message.content))) {
      state = { activated: false, requestedTraits: [], sourceTurn: userTurn };
      continue;
    }
    const explicit = explicitPersonaTraits(message.content);
    const prompted = answeredPersonaPrompt ? promptedPersonaTraits(message.content) : [];
    const traits = prompted.length > 0 ? prompted : explicit;
    if (traits.length > 0) {
      state = {
        activated: true,
        activationSource: answeredPersonaPrompt ? "ADVISOR_PROMPT_RESPONSE" : "USER_EXPLICIT",
        requestedTraits: traits,
        sourceTurn: userTurn,
      };
    }
  }
  return state;
}

export function neutralPersonaLabels(traits: readonly VehiclePersonaTrait[]): readonly string[] {
  const labels: Record<VehiclePersonaTrait, string> = {
    DESIGN: "tasarım odaklı", DRIVING_ENGAGEMENT: "sportif ve dinamik", COMFORT: "konforlu",
    PRACTICALITY: "pratik", TECHNOLOGY: "teknolojik ve fütüristik", PRESTIGE: "prestijli",
    VALUE: "rasyonel ve değer odaklı", ADVENTURE: "doğa ve macera odaklı", FAMILY: "aile odaklı",
    URBAN: "şehir odaklı", COMMERCIAL: "ticari", SUSTAINABILITY: "sürdürülebilir", MINIMALISM: "sade ve gösterişsiz",
  };
  return traits.map((trait) => labels[trait]);
}

export function shouldAskPersonaQuestion(
  trace: CarsConversationTrace,
  candidateCount: number,
  hasTechnicalQuestion: boolean,
): boolean {
  const basicsKnown = trace.requirements.some((entry) => entry.key === "BUDGET_MAX_TRY")
    && trace.requirements.some((entry) => entry.key.startsWith("USAGE_"))
    && trace.requirements.some((entry) => entry.key === "BODY_TYPE")
    && trace.requirements.some((entry) => entry.key === "FUEL" || entry.key === "FUEL_EXCLUDED")
    && trace.requirements.some((entry) => ["MIN_SEATS", "PARTY_SIZE", "MIN_CARGO_L"].includes(entry.key));
  return candidateCount > 1 && !hasTechnicalQuestion && basicsKnown
    && !trace.personaPreference?.activated && !trace.askedQuestionPurposes.includes("PERSONA");
}
