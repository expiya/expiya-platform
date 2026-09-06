export type SalesConversationPhase = "OPEN_CONVERSATION" | "INTENT_NURTURE_1" | "INTENT_NURTURE_2" | "END_WITHOUT_PURCHASE_INTENT" | "PURCHASE_INTENT_ESTABLISHED";

export function salesConversationPhase(input: { readonly turn: number; readonly vehicleIntentEstablished: boolean }): SalesConversationPhase {
  if (input.vehicleIntentEstablished) return "PURCHASE_INTENT_ESTABLISHED";
  if (input.turn <= 3) return "OPEN_CONVERSATION";
  if (input.turn === 4) return "INTENT_NURTURE_1";
  if (input.turn === 5) return "INTENT_NURTURE_2";
  return "END_WITHOUT_PURCHASE_INTENT";
}

export function salesConversationGuidance(phase: SalesConversationPhase): string | undefined {
  if (phase === "INTENT_NURTURE_1") return "Sohbeti senin için somut bir araç seçimine çevirelim mi? Yakın zamanda araç almayı düşünüyorsan aracı en çok nerede ve ne için kullanacağını anlatman yeterli.";
  if (phase === "INTENT_NURTURE_2") return "Sana katalogdan doğru aracı çıkarabilmem için netleştirmem gereken tek şey şu: Yakın zamanda araç almayı düşünüyor musun? Evetse en önemli kullanım ihtiyacını tek cümleyle söyle; gerisini birlikte daraltırım.";
  if (phase === "END_WITHOUT_PURCHASE_INTENT") return "Şu anda araç alma niyetin oluşmadığı için görüşmeyi burada kapatıyorum. Araç almaya karar verdiğinde kullanımını birkaç cümleyle anlat; katalogdaki doğru aracı birlikte buluruz.";
  return undefined;
}
