import type { ExternalCommerceActionProjection } from "@/features/appliances/commerce/providerContracts";

export function ExternalCommerceAction({ action }: { readonly action: ExternalCommerceActionProjection }) {
  return <aside className="rounded-xl border border-neutral-800 bg-neutral-900 p-4" aria-label="Harici satış kanalı">
    <a className="inline-flex min-h-11 items-center font-semibold text-emerald-300 underline underline-offset-4" href={action.href} target="_blank" rel={action.rel}>{action.label}</a>
    <p className="mt-2 text-xs leading-5 text-amber-200">{action.disclosure}</p>
    <p className="mt-1 text-xs text-neutral-400">Kaynak: {action.sourceLabel} · {new Date(action.retrievedAt).toLocaleString("tr-TR")}</p>
  </aside>;
}
