import { SalesAdvisorExperience } from "@/components/cars/SalesAdvisorExperience";
import { activeCatalogPayload } from "@/data/production/catalog/activeCatalog.generated";

export function generateStaticParams() {
  return activeCatalogPayload.records.map((record) => ({ exactVariantId: record.variant.id }));
}

export default async function VariantPage({ params, searchParams }: { readonly params: Promise<{ exactVariantId: string }>; readonly searchParams: Promise<{ handoff?: string }> }) {
  const [{ exactVariantId }, { handoff }] = await Promise.all([params, searchParams]);
  return <SalesAdvisorExperience exactVariantId={decodeURIComponent(exactVariantId)} token={handoff ?? ""}/>;
}
