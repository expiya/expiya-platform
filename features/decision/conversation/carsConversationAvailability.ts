export const CARS_CONVERSATION_AVAILABILITY = Object.freeze({
  publicState: "MAINTENANCE" as const,
  reasonCode: "CARS_CONVERSATION_VALIDATION_IN_PROGRESS" as const,
  title: "Araç danışmanı geçici olarak kullanım dışı",
  message: "Karar motorunu kapsamlı sohbet senaryolarıyla doğruluyoruz. Doğrulama tamamlanana kadar yeni araç danışmanı görüşmesi başlatılamaz.",
});

export function isPublicCarsConversationEnabled(
  environment: Pick<NodeJS.ProcessEnv, "NODE_ENV"> = process.env,
): boolean {
  // Unit and replay suites exercise the engine behind the public maintenance gate.
  return environment.NODE_ENV === "test";
}
