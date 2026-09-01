export interface DemoMembershipPlan {
  readonly code: "STARTER" | "GROWTH" | "ENTERPRISE";
  readonly name: string;
  readonly audience: string;
  readonly stockLimit: number | "CUSTOM";
  readonly branchLimit: number | "CUSTOM";
  readonly analytics: "BASIC" | "ADVANCED";
  readonly feedIntegration: boolean;
  readonly organicRankingBenefit: false;
}

export const DEMO_MEMBERSHIP_PLANS: readonly DemoMembershipPlan[] = Object.freeze([
  { code: "STARTER", name: "Başlangıç", audience: "Tek şubeli kurumsal satıcı", stockLimit: 30, branchLimit: 1, analytics: "BASIC", feedIntegration: false, organicRankingBenefit: false },
  { code: "GROWTH", name: "Büyüme", audience: "Çok şubeli galeri ve yetkili satıcı", stockLimit: 150, branchLimit: 5, analytics: "ADVANCED", feedIntegration: true, organicRankingBenefit: false },
  { code: "ENTERPRISE", name: "Kurumsal", audience: "Filo ve yüksek hacimli operasyon", stockLimit: "CUSTOM", branchLimit: "CUSTOM", analytics: "ADVANCED", feedIntegration: true, organicRankingBenefit: false },
]);
