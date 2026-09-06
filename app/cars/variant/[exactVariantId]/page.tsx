import { SalesAdvisorExperience } from "@/components/cars/SalesAdvisorExperience";
import { XpyStagePage } from "@/components/xpy/XpyStageTemplates";
import { activeCatalogPayload } from "@/data/production/catalog/activeCatalog.generated";
import { CARS_EXPERIENCE } from "@/features/xpy/visualPacks";

export function generateStaticParams() {
  return activeCatalogPayload.records.map((record) => ({ exactVariantId: record.variant.id }));
}

export default async function VariantPage({ params, searchParams }: { readonly params: Promise<{ exactVariantId: string }>; readonly searchParams: Promise<{ handoff?: string }> }) {
  const [{ exactVariantId }, { handoff }] = await Promise.all([params, searchParams]);
  return <XpyStagePage adapter={CARS_EXPERIENCE} current="STAGE_2_EVALUATION"><SalesAdvisorExperience exactVariantId={decodeURIComponent(exactVariantId)} token={handoff ?? ""}/></XpyStagePage>;
}
