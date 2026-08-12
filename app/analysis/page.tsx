import { CarsConversation } from "@/components/cars/CarsConversation";

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | string[] }>;
}) {
  const queryValue = (await searchParams).query;
  const query = Array.isArray(queryValue) ? queryValue[0] ?? "" : queryValue ?? "";
  return <CarsConversation initialQuery={query} />;
}
