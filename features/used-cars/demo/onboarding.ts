export type DemoGateStatus = "COMPLETE" | "ACTION_REQUIRED" | "LOCKED";

export interface DemoOnboardingGate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: DemoGateStatus;
  readonly owner: "DEALER" | "EXPIYA";
}

export const DEMO_ONBOARDING_GATES: readonly DemoOnboardingGate[] = Object.freeze([
  { id: "company", title: "Firma ve ticaret bilgileri", description: "Vergi numarası ve ticaret sicili örnek kayıtları alındı.", status: "COMPLETE", owner: "DEALER" },
  { id: "identity", title: "Kurumsal kimlik doğrulaması", description: "Expiya operasyon ekibinin incelemesi bekleniyor.", status: "ACTION_REQUIRED", owner: "EXPIYA" },
  { id: "contract", title: "Sözleşme", description: "Kimlik doğrulaması tamamlandıktan sonra açılır.", status: "LOCKED", owner: "DEALER" },
  { id: "payment", title: "Üyelik ve ödeme", description: "Sözleşme tamamlandıktan sonra açılır.", status: "LOCKED", owner: "DEALER" },
  { id: "operations", title: "Operasyon kontrolü", description: "Şube, yetkili kullanıcı ve süreç yeterliliği incelenir.", status: "LOCKED", owner: "EXPIYA" },
]);

export const canDemoDealerPublish = (gates: readonly DemoOnboardingGate[]) =>
  gates.length > 0 && gates.every(gate => gate.status === "COMPLETE");

