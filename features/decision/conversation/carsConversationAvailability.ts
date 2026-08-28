export const CARS_CONVERSATION_AVAILABILITY = Object.freeze({
  publicState: "MAINTENANCE" as const,
  reasonCode: "CARS_CONVERSATION_VALIDATION_IN_PROGRESS" as const,
  title: "Araç danışmanı geçici olarak kullanım dışı",
  message: "Karar motorunu kapsamlı sohbet senaryolarıyla doğruluyoruz. Doğrulama tamamlanana kadar yeni araç danışmanı görüşmesi başlatılamaz.",
});

export function isPublicCarsConversationEnabled(
  environment: Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "CARS_CONVERSATION_LOCAL_TESTING">> = process.env,
  pilotAuthenticated = false,
): boolean {
  // An authenticated invitation-only pilot may exercise the production
  // conversation without opening the public maintenance gate.
  if (pilotAuthenticated) return true;
  // Unit and replay suites exercise the engine behind the public maintenance gate.
  if (environment.NODE_ENV === "test") return true;
  // Manual browser testing is explicitly opt-in and can never open production.
  return environment.NODE_ENV === "development" && environment.CARS_CONVERSATION_LOCAL_TESTING === "true";
}
