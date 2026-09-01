export type ConversationPolicyAction =
  | { readonly kind: "CONTINUE"; readonly greeting?: string }
  | { readonly kind: "REDIRECT"; readonly message: string }
  | { readonly kind: "BOUNDARY"; readonly message: string; readonly terminate: boolean }
  | { readonly kind: "END"; readonly message: string };

const automotive = /(?:araç|araba|otomobil|model|marka|motor|yakıt|şanzıman|vites|suv|sedan|hatchback|pick.?up|menzil|bagaj|koltuk|lastik|fren|servis|bakım|kasko|trafik|sürüş)/iu;
const abusive = /(?:aptal|salak|gerizek[aâ]lı|şerefsiz|piç|siktir|amına|orospu|yavşak|boktan)/iu;
const explicitEnd = /^(?:görüşmeyi bitir|sohbeti bitir|konuşmayı bitir|çıkış|hoşça kal|görüşürüz|artık konuşmak istemiyorum)[.! ]*$/iu;
const unrelated = /(?:yemek tarifi|maç sonucu|burç yorumu|şiir yaz|kod yaz|borsa tavsiyesi|kripto|siyasi|seçim sonucu|hava durumu)/iu;
const greeting = /^(?:merhaba|selam|selamlar|günaydın|iyi akşamlar|iyi günler|hey)[!. ]*/iu;

export function evaluateConversationPolicy(message: string, priorBoundaryViolations: number): ConversationPolicyAction {
  const text = message.trim();
  if (explicitEnd.test(text)) return { kind: "END", message: "Elbette. Görüşmeyi burada sonlandırıyorum. Yeniden bir araç seçmek veya otomobiller hakkında bilgi almak istersen yeni bir görüşme başlatabilirsin." };
  if (abusive.test(text)) {
    const terminate = priorBoundaryViolations >= 1;
    return terminate
      ? { kind: "BOUNDARY", terminate: true, message: "Hakaret içeren ifadeler devam ettiği için görüşmeyi burada sonlandırıyorum. Yeni bir görüşmede araç seçimi veya otomotiv bilgisi konusunda saygılı biçimde yardımcı olabilirim." }
      : { kind: "BOUNDARY", terminate: false, message: "Bu şekilde hitap edildiğinde görüşmeye devam edemem. Saygılı biçimde ilerlersek araç seçimi veya otomobiller hakkındaki sorularında yardımcı olmaya hazırım." };
  }
  if (unrelated.test(text) && !automotive.test(text)) return { kind: "REDIRECT", message: "Bu konu Expiya Cars'ın araç seçimi ve otomotiv bilgi alanının dışında kalıyor. İstersen aradığın aracı, kullanım ihtiyacını veya merak ettiğin bir otomobil konusunu konuşalım." };
  const match = greeting.exec(text);
  return { kind: "CONTINUE", ...(match ? { greeting: "Merhaba!" } : {}) };
}
