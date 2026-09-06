import { XpyStagePage } from "@/components/xpy/XpyStageTemplates";
import { APPLIANCES_EXPERIENCE } from "@/features/xpy/visualPacks";
import type { Metadata } from "next";
import { AppliancesStageTwoExperience } from "./AppliancesStageTwoExperience";

export const metadata: Metadata = { title: "Expiya Appliances · Aşama 2", description: "Seçilen ev ürünü için teknik değerlendirme ve günlük kullanım açıklamaları." };

export default async function AppliancesEvaluationPage({ searchParams }: { readonly searchParams: Promise<{ handoff?: string | string[] }> }) {
  const value = (await searchParams).handoff;
  const handoff = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  return <XpyStagePage adapter={APPLIANCES_EXPERIENCE} current="STAGE_2_EVALUATION"><AppliancesStageTwoExperience handoff={handoff}/></XpyStagePage>;
}
