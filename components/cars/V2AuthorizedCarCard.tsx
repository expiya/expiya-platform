import Image from "next/image";
import type { DecisionSafePublicCard } from "@/features/decision/v2/presentation/publicCardSchema";

export function V2AuthorizedCarCard({ card }: { readonly card: DecisionSafePublicCard }) {
  const details = [card.modelYear, card.fuelLabel, card.transmissionLabel, card.bodyTypeLabel].filter(Boolean).join(" · ");
  return <article className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
    <div className="relative aspect-[16/9] bg-neutral-100 dark:bg-neutral-800"><Image src={card.image} alt={`${card.brand} ${card.model} araç görseli`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /></div>
    <div className="space-y-2 p-4">
      {card.imageStatus !== "EXACT" && card.imageStatus !== "PLACEHOLDER" ? <p className="text-xs text-neutral-500">Temsilî görsel{card.representedModel ? `: ${card.representedModel}` : ""}</p> : null}
      {card.imageAttribution ? <p className="text-xs text-neutral-500">Görsel: {card.imageAttribution}</p> : null}
      <h2 className="font-semibold text-neutral-950 dark:text-neutral-50">{card.title}</h2>
      {details ? <p className="text-sm text-neutral-500 dark:text-neutral-400">{details}</p> : null}
      {card.verifiedPublicPrice ? <p className="font-medium">{card.verifiedPublicPrice.amountTry.toLocaleString("tr-TR")} TL</p> : null}
      <p className="text-sm">{card.decisionSummary.recommendation}</p>
      {card.caveats.map((caveat) => <p key={caveat} className="text-xs text-amber-700 dark:text-amber-300">{caveat}</p>)}
    </div>
  </article>;
}
