import { SECRETARY_NEGATIVE_COMPOUNDS, SECRETARY_ROUTE_DESCRIPTORS, SECRETARY_UMBRELLAS, choicesFor, containsPhrase, findSecretaryPhraseSpans, normalizeSecretaryPhrase, type ActiveSecretaryDepartmentId, type SecretaryRouteChoice, type SecretaryRouteDescriptor, type SecretaryUmbrella } from "./secretaryRoutingPack";
export type SecretaryResultKind = "GREETING" | "CLARIFY_DESTINATION" | "PROPOSE_NAVIGATION" | "FAQ_RESPONSE" | "UNSUPPORTED_DESTINATION" | "SAFETY_WARNING" | "SESSION_FROZEN";
export type SecretaryOutcome = { readonly kind: Exclude<SecretaryResultKind, "PROPOSE_NAVIGATION">; readonly message: string; readonly link?: string; readonly choices?: readonly SecretaryRouteChoice[] } | { readonly kind: "PROPOSE_NAVIGATION"; readonly departmentId: ActiveSecretaryDepartmentId; readonly destination: string; readonly message: string };
export interface SecretarySessionContext { readonly priorClearViolations?: number }
const clearAbusePatterns = [/\b(aptal|salak|gerizekalı|gerizekali)\b/iu, /\b(seni öldür|sizi öldür|geber|katledeceğim|katledecegim)\b/iu, /\b(siktir|orospu|piç|pic)\b/iu];
type Mention = { readonly start: number; readonly end: number; readonly tokenCount: number; readonly descriptor?: SecretaryRouteDescriptor; readonly umbrella?: SecretaryUmbrella };
const overlaps = (left: Pick<Mention, "start" | "end">, right: Pick<Mention, "start" | "end">) => left.start < right.end && right.start < left.end;
const routingIntentTokens = new Set(["almak", "alacağım", "arıyorum", "bakıyorum", "istiyorum", "lazım", "bulunuyor", "satıyor", "satıyorsunuz"]);
const negationTokens = new Set(["değil", "degil", "istemiyorum", "istemem", "aramıyorum", "bakmıyorum", "almıyorum"]);
function hasRoutingIntent(words: readonly string[]): boolean { return words.some(token => routingIntentTokens.has(token)) || words.some((token, index) => token === "var" && ["mı", "mi", "mu", "mü"].includes(words[index + 1] ?? "")); }
function governedMentions(message: string): readonly Mention[] {
  const words = message.split(" ").filter(Boolean);
  const blocked = SECRETARY_NEGATIVE_COMPOUNDS.flatMap(phrase => findSecretaryPhraseSpans(message, phrase));
  const candidates: Mention[] = [
    ...SECRETARY_ROUTE_DESCRIPTORS.flatMap(descriptor => descriptor.aliases.flatMap(alias => findSecretaryPhraseSpans(message, alias).map(span => ({ ...span, descriptor })))),
    ...SECRETARY_UMBRELLAS.flatMap(umbrella => umbrella.aliases.flatMap(alias => findSecretaryPhraseSpans(message, alias).map(span => ({ ...span, umbrella })))),
  ].filter(mention => !blocked.some(span => overlaps(mention, span)) && !negationTokens.has(words[mention.end] ?? ""));
  const ordered = candidates.sort((left, right) => right.tokenCount - left.tokenCount || Number(Boolean(right.descriptor)) - Number(Boolean(left.descriptor)) || left.start - right.start);
  const selected: Mention[] = [];
  for (const candidate of ordered) if (!selected.some(existing => overlaps(existing, candidate))) selected.push(candidate);
  return Object.freeze(selected.sort((left, right) => left.start - right.start));
}
export function classifySecretaryMessage(rawMessage: string, context: SecretarySessionContext = {}): SecretaryOutcome {
  const message = normalizeSecretaryPhrase(rawMessage);
  if (clearAbusePatterns.some(pattern => pattern.test(message))) return (context.priorClearViolations ?? 0) >= 1 ? { kind: "SESSION_FROZEN", message: "Bu oturumdaki görüşmeyi sonlandırdım. Yeni bir oturum başlatarak tekrar deneyebilirsiniz." } : { kind: "SAFETY_WARNING", message: "Size yardımcı olmak isterim; lütfen görüşmeyi saygılı bir dille sürdürelim." };
  if (/^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|hey)$/u.test(message) || (/^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|hey)\b/u.test(message) && !hasRoutingIntent(message.split(" ")))) return { kind: "GREETING", message: "Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz." };
  if (containsPhrase(message, "expiya nedir") || containsPhrase(message, "nasıl çalışıyor")) return { kind: "FAQ_RESPONSE", message: "Expiya, ihtiyaçlarınızı netleştirip doğru karar bölümüne yönlendiren bir karar platformudur.", link: "/expiya-nedir" };
  if (/\b(kargo|sipariş|siparis|teslimat)\b/u.test(message)) return { kind: "FAQ_RESPONSE", message: "Expiya sipariş almaz veya kargo göndermez; ürün seçimini kolaylaştıran bir karar platformudur." };
  if (containsPhrase(message, "hangi bölümler") || containsPhrase(message, "aktif bölümler")) return { kind: "FAQ_RESPONSE", message: "Şu anda Otomobil, Ev Ürünleri, Elektronik, Bebek & Çocuk ve Mobilite bölümleri aktiftir." };
  if (containsPhrase(message, "sekreter ne yapar") || containsPhrase(message, "sekreterin görevi")) return { kind: "FAQ_RESPONSE", message: "Sekreter, isteğinizi anlayıp sizi yalnızca aktif ve uygun bölüme yönlendirir; ürün önerisi veya sıralaması yapmaz." };
  if (containsPhrase(message, "hediye")) return { kind: "CLARIFY_DESTINATION", message: "Elbette. Hangi tür ürün için hediye arıyorsunuz?" };
  const mentions = governedMentions(message);
  const choices = [...new Map(mentions.flatMap(mention => mention.descriptor ? [{ label: mention.descriptor.localizedLabel, departmentId: mention.descriptor.departmentId, destination: mention.descriptor.destination }] : mention.umbrella ? choicesFor(mention.umbrella) : []).map(choice => [choice.destination, choice])).values()];
  const uniqueDescriptor = choices.length === 1 ? SECRETARY_ROUTE_DESCRIPTORS.find(item => item.destination === choices[0].destination) : undefined;
  if (uniqueDescriptor && mentions.every(mention => mention.descriptor?.destination === uniqueDescriptor.destination)) return { kind: "PROPOSE_NAVIGATION", departmentId: uniqueDescriptor.departmentId, destination: uniqueDescriptor.destination, message: `${uniqueDescriptor.localizedLabel} bölümüne yönlendiriliyorsunuz.` };
  if (mentions.length === 1 && mentions[0].umbrella) return { kind: "CLARIFY_DESTINATION", message: mentions[0].umbrella.question, choices };
  if (mentions.length > 1) return { kind: "CLARIFY_DESTINATION", message: "Birden fazla ürün belirttiniz. Önce hangisiyle başlayalım?", choices };
  if (SECRETARY_NEGATIVE_COMPOUNDS.some(phrase => containsPhrase(message, phrase))) return { kind: "UNSUPPORTED_DESTINATION", message: "Bu ürün veya hizmet için şu anda aktif bir Expiya bölümü bulunmuyor. Başka bir ürün kategorisiyle yardımcı olabilirim." };
  return { kind: "UNSUPPORTED_DESTINATION", message: "Bu ürün için şu anda aktif bir Expiya bölümü bulamadım. Başka bir ürün kategorisiyle yardımcı olabilirim." };
}
