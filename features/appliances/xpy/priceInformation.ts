import type { AppliancesConversationState, AppliancesProductType, AppliancesRuntimeOutcome } from "../contracts";

export type AppliancesPriceSnapshot = {
  readonly status: "READY" | "UNAVAILABLE";
  readonly products: readonly { readonly productId: string; readonly status: string; readonly representativePriceTRY?: number; readonly observationRefs: readonly string[]; readonly asOf: string }[];
  readonly observations: readonly Record<string, unknown>[];
  readonly identities: ReadonlyMap<string, string>;
};

export type PriceInformationProposal = { readonly kind: "PRICE_INFORMATION"; readonly message: string } | { readonly kind: "NOT_PRICE_INFORMATION" };

export function proposePriceInformation(message: string): PriceInformationProposal {
  const subject = /(?:fiyat|ücret|kaç\s*(?:tl|lira)|en\s+(?:ucuz|uygun\s+fiyatlı))/iu.test(message);
  const question = /[?？]/u.test(message) || /(?:hangisi|hangileri|ne\s+kadar|kaç\s*(?:tl|lira)|söyler\s+misin|gösterir\s+misin)/iu.test(message);
  return subject && question ? { kind: "PRICE_INFORMATION", message } : { kind: "NOT_PRICE_INFORMATION" };
}

const categoryName = (type: AppliancesProductType) => type === "DRYER" ? "kurutma makinesi" : type === "REFRIGERATOR" ? "buzdolabı" : type === "DISHWASHER" ? "bulaşık makinesi" : type === "VACUUM" ? "kablolu torbasız süpürge" : "robot süpürge";

/** Pure X resolver: informational only; it cannot mutate decision state. */
export function resolvePriceInformation(input: { readonly state: AppliancesConversationState; readonly snapshot?: AppliancesPriceSnapshot }): Extract<AppliancesRuntimeOutcome, { kind: "RESPOND" }> {
  const revision = input.state.revision + 1;
  let message: string;
  if (input.state.productType !== "WASHING_MACHINE" || !input.snapshot) {
    message = `${categoryName(input.state.productType)} kataloğu için doğrulanmış güncel fiyat bilgisi bu sürümde yok. Bu nedenle en ucuz modeli söyleyemem; fiyatı bir seçim veya öneri ölçütü olarak da kullanmıyorum.`;
  } else if (input.snapshot.status !== "READY") {
    message = "Çamaşır makinesi fiyat bilgileri güncel ve kullanılabilir değil. Bu nedenle katalogdaki en düşük güncel fiyatı güvenilir biçimde söyleyemem; fiyatı seçim veya öneri ölçütü olarak kullanmıyorum.";
  } else {
    const covered = input.snapshot.products.filter(item => item.status === "PRICE_AVAILABLE" && typeof item.representativePriceTRY === "number").sort((a, b) => a.representativePriceTRY! - b.representativePriceTRY! || a.productId.localeCompare(b.productId));
    const unknown = input.snapshot.products.filter(item => item.status !== "PRICE_AVAILABLE");
    const lowest = covered[0];
    if (!lowest) message = "Çamaşır makinesi kataloğunda kullanılabilir, güncel ve doğrulanmış fiyat bilgisi yok. Bu nedenle en ucuz modeli söyleyemem.";
    else {
      const sources = [...new Set(input.snapshot.observations.filter(item => lowest.observationRefs.includes(String(item.observationId))).map(item => String(item.sourceReference)).filter(Boolean))];
      const unknownNames = unknown.map(item => input.snapshot!.identities.get(item.productId) ?? item.productId).join(", ");
      message = `${input.snapshot.products.length} ürünün ${covered.length} tanesinde güncel fiyat bulundu. Güncel fiyatı bulunan ürünler arasında en düşük temsili fiyat ${input.snapshot.identities.get(lowest.productId) ?? lowest.productId} için ${lowest.representativePriceTRY!.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL. Bu, tüm katalogda kesin olarak en ucuz olduğu anlamına gelmez; fiyatı bilinmeyen ${unknown.length} ürün var: ${unknownNames}. Fiyat tarihi: ${lowest.asOf}; kaynak: ${sources.join(", ") || lowest.observationRefs.join(", ")}. Bu bilgi yalnız fiyat yanıtıdır; karar bağlamını, sıralamayı veya bütçe filtresini değiştirmez.`; 
    }
  }
  return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision, ...(input.state.lastQuestionKey ? { resumeQuestionKey: input.state.lastQuestionKey } : {}) };
}
