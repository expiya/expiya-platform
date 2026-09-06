import { SECRETARY_NEGATIVE_COMPOUNDS, SECRETARY_ROUTE_DESCRIPTORS, SECRETARY_UMBRELLAS, choicesFor, containsPhrase, normalizeSecretaryPhrase, type ActiveSecretaryDepartmentId, type SecretaryRouteChoice } from "./secretaryRoutingPack";
export type SecretaryResultKind = "GREETING" | "CLARIFY_DESTINATION" | "PROPOSE_NAVIGATION" | "FAQ_RESPONSE" | "UNSUPPORTED_DESTINATION" | "SAFETY_WARNING" | "SESSION_FROZEN";
export type SecretaryOutcome = { readonly kind: Exclude<SecretaryResultKind, "PROPOSE_NAVIGATION">; readonly message: string; readonly link?: string; readonly choices?: readonly SecretaryRouteChoice[] } | { readonly kind: "PROPOSE_NAVIGATION"; readonly departmentId: ActiveSecretaryDepartmentId; readonly destination: string; readonly message: string };
export interface SecretarySessionContext { readonly priorClearViolations?: number }
const clearAbusePatterns = [/\b(aptal|salak|gerizekalı|gerizekali)\b/iu, /\b(seni öldür|sizi öldür|geber|katledeceğim|katledecegim)\b/iu, /\b(siktir|orospu|piç|pic)\b/iu];
export function classifySecretaryMessage(rawMessage: string, context: SecretarySessionContext = {}): SecretaryOutcome {
  const message = normalizeSecretaryPhrase(rawMessage);
  if (clearAbusePatterns.some(pattern => pattern.test(message))) return (context.priorClearViolations ?? 0) >= 1 ? { kind: "SESSION_FROZEN", message: "Bu oturumdaki görüşmeyi sonlandırdım. Yeni bir oturum başlatarak tekrar deneyebilirsiniz." } : { kind: "SAFETY_WARNING", message: "Size yardımcı olmak isterim; lütfen görüşmeyi saygılı bir dille sürdürelim." };
  if (/^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|hey)$/u.test(message)) return { kind: "GREETING", message: "Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz." };
  if (containsPhrase(message, "expiya nedir") || containsPhrase(message, "nasıl çalışıyor")) return { kind: "FAQ_RESPONSE", message: "Expiya, ihtiyaçlarınızı netleştirip doğru karar bölümüne yönlendiren bir karar platformudur.", link: "/expiya-nedir" };
  if (/\b(kargo|sipariş|siparis|teslimat)\b/u.test(message)) return { kind: "FAQ_RESPONSE", message: "Expiya sipariş almaz veya kargo göndermez; ürün seçimini kolaylaştıran bir karar platformudur." };
  if (containsPhrase(message, "hangi bölümler") || containsPhrase(message, "aktif bölümler")) return { kind: "FAQ_RESPONSE", message: "Şu anda Otomobil, Ev Ürünleri, Elektronik ve Bebek & Çocuk bölümleri aktiftir." };
  if (containsPhrase(message, "sekreter ne yapar") || containsPhrase(message, "sekreterin görevi")) return { kind: "FAQ_RESPONSE", message: "Sekreter, isteğinizi anlayıp sizi yalnızca aktif ve uygun bölüme yönlendirir; ürün önerisi veya sıralaması yapmaz." };
  if (SECRETARY_NEGATIVE_COMPOUNDS.some(phrase => containsPhrase(message, phrase))) return { kind: "UNSUPPORTED_DESTINATION", message: "Bu ürün veya hizmet için şu anda aktif bir Expiya bölümü bulunmuyor. Başka bir ürün kategorisiyle yardımcı olabilirim." };
  if (containsPhrase(message, "hediye")) return { kind: "CLARIFY_DESTINATION", message: "Elbette. Hangi tür ürün için hediye arıyorsunuz?" };
  const matches = SECRETARY_ROUTE_DESCRIPTORS.filter(descriptor => descriptor.aliases.some(alias => containsPhrase(message, alias)));
  const longest = Math.max(0, ...matches.flatMap(match => match.aliases.filter(alias => containsPhrase(message, alias)).map(alias => normalizeSecretaryPhrase(alias).split(" ").length)));
  const strongest = matches.filter(match => match.aliases.some(alias => containsPhrase(message, alias) && normalizeSecretaryPhrase(alias).split(" ").length === longest));
  const distinct = [...new Map(strongest.map(item => [item.destination, item])).values()];
  if (distinct.length === 1) { const match = distinct[0]; return { kind: "PROPOSE_NAVIGATION", departmentId: match.departmentId, destination: match.destination, message: `${match.localizedLabel} bölümüne yönlendiriliyorsunuz.` }; }
  if (distinct.length > 1) return { kind: "CLARIFY_DESTINATION", message: "Birden fazla ürün belirttiniz. Önce hangisiyle başlayalım?", choices: distinct.map(item => ({ label: item.localizedLabel, departmentId: item.departmentId, destination: item.destination })) };
  const umbrella = SECRETARY_UMBRELLAS.find(item => item.aliases.some(alias => containsPhrase(message, alias)));
  if (umbrella) return { kind: "CLARIFY_DESTINATION", message: umbrella.question, choices: choicesFor(umbrella) };
  return { kind: "UNSUPPORTED_DESTINATION", message: "Bu ürün için şu anda aktif bir Expiya bölümü bulamadım. Başka bir ürün kategorisiyle yardımcı olabilirim." };
}
