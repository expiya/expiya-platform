import { SalesRequestForm } from "@/components/cars/SalesRequestForm";
import { XpyStagePage } from "@/components/xpy/XpyStageTemplates";
import { intents } from "@/features/sales-request/contracts";
import { CARS_EXPERIENCE } from "@/features/xpy/visualPacks";
export default async function SalesRequestPage({ params, searchParams }: { readonly params: Promise<{ intent: string }>; readonly searchParams: Promise<{ handoff?: string; returnTo?: string }> }) { const [{ intent }, { handoff, returnTo }] = await Promise.all([params, searchParams]); const safeReturnTo = returnTo?.startsWith("/cars/variant/") ? returnTo : "/analysis?pilot=v3.8"; return <XpyStagePage adapter={CARS_EXPERIENCE} current="STAGE_3_ACTION"><SalesRequestForm intent={intents.includes(intent as never) ? intent : ""} handoff={handoff ?? ""} returnTo={safeReturnTo}/></XpyStagePage>; }
