import type { AppliancesConversationState, AppliancesRuntimeOutcome } from "../contracts";
import { deterministicPayloadHash } from "../persistence/service";
import type { AppliancesConversationStore } from "../persistence/types";
import type { RecommendationAuthority } from "../recommendation/current.server";

type InformationalTurnInput = {
  readonly store: AppliancesConversationStore;
  readonly conversationId: string;
  readonly messageId: string;
  readonly expectedRevision: number;
  readonly message: string;
  readonly now?: Date;
  readonly washingMachineAuthority?: RecommendationAuthority;
};

export function isAppliancesPriceInformationRequest(message: string): boolean {
  const priceSubject = /(?:fiyat|ücret|kaç\s*(?:tl|lira)|en\s+(?:ucuz|uygun\s+fiyatlı))/iu.test(message);
  const directQuestion = /[?？]/u.test(message) || /(?:hangisi|hangileri|ne\s+kadar|kaç\s*(?:tl|lira)|söyler\s+misin|gösterir\s+misin)/iu.test(message);
  return priceSubject && directQuestion;
}

export function isSoftCheapPreferenceWithoutMaximum(message: string): boolean {
  return /(?:en\s+ucuz|ekonomik|hesaplı|mümkün\s+olduğunca\s+(?:ucuz|uygun\s+fiyatlı)|uygun\s+fiyatlı(?:\s+olsun)?)/iu.test(message)
    && !/\d/u.test(message)
    && !/(?:üst\s+sınır|karar\s+filtresi|filtre(?:le|ye))/iu.test(message)
    && !isAppliancesPriceInformationRequest(message);
}

function unavailable(state: AppliancesConversationState, revision: number): AppliancesRuntimeOutcome {
  const category = state.productType === "DRYER" ? "kurutma makinesi" : state.productType === "REFRIGERATOR" ? "buzdolabı" : state.productType === "DISHWASHER" ? "bulaşık makinesi" : state.productType === "VACUUM" ? "kablolu torbasız süpürge" : "robot süpürge";
  return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: `${category} kataloğu için doğrulanmış güncel fiyat projeksiyonu bu sürümde yok. Bu nedenle en ucuz modeli söyleyemem; fiyatı bir seçim veya öneri ölçütü olarak da kullanmıyorum.`, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
}

function washingMachinePriceResponse(bundle: RecommendationAuthority, revision: number): AppliancesRuntimeOutcome {
  if (bundle.price.status !== "READY") return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: "Çamaşır makinesi fiyat projeksiyonu güncel ve kullanılabilir değil. Bu nedenle katalogdaki en düşük güncel fiyatı güvenilir biçimde söyleyemem; fiyatı seçim veya öneri ölçütü olarak kullanmıyorum.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
  type PriceProduct = { productId: string; status: string; representativePriceTRY?: number; observationRefs: readonly string[]; asOf: string };
  const products = bundle.price.projection.products as readonly PriceProduct[];
  const covered = products.filter((item) => item.status === "PRICE_AVAILABLE" && typeof item.representativePriceTRY === "number").sort((a, b) => a.representativePriceTRY! - b.representativePriceTRY! || a.productId.localeCompare(b.productId));
  const unknown = products.filter((item) => item.status !== "PRICE_AVAILABLE");
  const catalogProducts = (bundle.authority.catalog as { products?: readonly { productId: string; brandId: string; manufacturerModelIdentifier: string }[] }).products ?? [];
  const identity = new Map(catalogProducts.map((item) => [item.productId, `${item.brandId.charAt(0).toLocaleUpperCase("tr-TR")}${item.brandId.slice(1)} ${item.manufacturerModelIdentifier}`]));
  const lowest = covered[0];
  if (!lowest) return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: "Çamaşır makinesi kataloğunda kullanılabilir, güncel ve doğrulanmış fiyat gözlemi yok. Bu nedenle en ucuz modeli söyleyemem.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
  const observations = bundle.price.projection.observations as readonly Record<string, unknown>[];
  const sources = [...new Set(observations.filter((item) => lowest.observationRefs.includes(String(item.observationId))).map((item) => String(item.sourceReference)).filter(value => /^https?:\/\//u.test(value)))];
  const lowestName = identity.get(lowest.productId);
  if (!lowestName) return { kind: "FAILED_CLOSED", message: "Fiyatı bulunan ürünün adı doğrulanamadığı için fiyat bilgisini gösteremiyorum." };
  const unknownNames = unknown.map((item) => identity.get(item.productId)).filter((value): value is string => Boolean(value));
  const unknownText = unknownNames.length ? ` Fiyatı bilinmeyen ürünler: ${unknownNames.join(", ")}.` : unknown.length ? ` Ayrıca ${unknown.length} ürünün güncel fiyatı bilinmiyor.` : "";
  const sourceText = sources.length ? ` Kaynak: ${sources.join(", ")}.` : "";
  return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: `${products.length} doğrulanmış ürünün ${covered.length} tanesinde güncel fiyat bulundu. Güncel fiyatı bulunan ürünler arasında en düşük temsili fiyat ${lowestName} için ${lowest.representativePriceTRY!.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL. Bu, tüm katalogda kesin olarak en ucuz olduğu anlamına gelmez.${unknownText} Fiyat tarihi: ${lowest.asOf}.${sourceText} Bu bilgi yalnız fiyat yanıtıdır; karar bağlamını, sıralamayı veya bütçe filtresini değiştirmez.`, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
}

export async function runAppliancesPriceInformationTurn(input: InformationalTurnInput) {
  if (!isAppliancesPriceInformationRequest(input.message)) return undefined;
  const loaded = await input.store.load(input.conversationId);
  if (!loaded) return { status: "STATE_UNAVAILABLE" as const };
  const payloadHash = deterministicPayloadHash({ action: "TURN", conversationId: input.conversationId, messageId: input.messageId, expectedRevision: input.expectedRevision, message: input.message });
  const replay = loaded.messages[input.messageId];
  if (replay) return replay.payloadHash === payloadHash ? { status: "OK" as const, outcome: replay.outcome.publicOutcome!, state: loaded.state, replayed: true } : { status: "MESSAGE_PAYLOAD_CONFLICT" as const };
  if (loaded.state.revision !== input.expectedRevision) return { status: "REVISION_CONFLICT" as const };
  const revision = loaded.state.revision + 1;
  const state = { ...loaded.state, revision, updatedAt: (input.now ?? new Date()).toISOString() };
  const baseOutcome = loaded.state.productType === "WASHING_MACHINE" && input.washingMachineAuthority ? washingMachinePriceResponse(input.washingMachineAuthority, revision) : unavailable(state, revision);
  const outcome = loaded.state.lastQuestionKey ? { ...baseOutcome, resumeQuestionKey: loaded.state.lastQuestionKey } : baseOutcome;
  const saved = await input.store.commit({ expectedRevision: loaded.state.revision, messageId: input.messageId, payloadHash, nextState: state, events: [], outcomeKind: "CONTEXT_MUTATED", publicOutcome: outcome });
  return saved.status === "OK" ? { status: "OK" as const, outcome: saved.outcome.publicOutcome!, state: saved.outcome.state, replayed: false } : { status: saved.status };
}
