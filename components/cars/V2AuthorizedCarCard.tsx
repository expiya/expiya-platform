import Image from "next/image";
import { TrackedVehicleLink } from "@/components/analytics/TrackedVehicleLink";
import type { DecisionSafePublicCard } from "@/features/decision/v2/presentation/publicCardSchema";

export type EquipmentExplanationCardAction = Readonly<{ actionId: string; label: "Bu aracı anlat" }>;
export function V2AuthorizedCarCard({ card, position = 1, equipmentAction, onEquipmentExplanation, equipmentExplanationPending = false }: { readonly card: DecisionSafePublicCard; readonly position?: number; readonly equipmentAction?: EquipmentExplanationCardAction; readonly onEquipmentExplanation?: (actionId: string) => void; readonly equipmentExplanationPending?: boolean }) {
  const details = [card.modelYear, card.fuelLabel, card.transmissionLabel, card.bodyTypeLabel].filter(Boolean).join(" · ");
  return <article className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:-translate-y-1 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900"><TrackedVehicleLink href={`/decision/v2-${encodeURIComponent(card.exactVariantId)}`} ariaLabel={`${card.title} ayrıntısını aç`} surface="v2_recommendations" position={position} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black dark:focus-visible:outline-white">
    <div className="relative aspect-[16/9] bg-neutral-100 dark:bg-neutral-800"><Image src={card.image} alt={`${card.brand} ${card.model} araç görseli`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /></div>
    <div className="space-y-2 p-4">
      {card.imageStatus !== "EXACT" && card.imageStatus !== "PLACEHOLDER" ? <p className="text-xs text-neutral-500">Temsilî görsel{card.representedModel ? `: ${card.representedModel}` : ""}</p> : null}
      {card.imageAttribution ? <p className="text-xs text-neutral-500">Görsel: {card.imageAttribution}</p> : null}
      <h2 className="font-semibold text-neutral-950 dark:text-neutral-50">{card.title}</h2>
      {details ? <p className="text-sm text-neutral-500 dark:text-neutral-400">{details}</p> : null}
      {card.verifiedPublicPrice ? <div>
        <p className="font-medium">{card.verifiedPublicPrice.amountTry.toLocaleString("tr-TR")} TL</p>
        <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
          Aktif katalogda doğrulanmış resmî {card.verifiedPublicPrice.priceType === "CAMPAIGN" ? "kampanya" : "liste"} fiyatı
          {card.verifiedPublicPrice.validFrom ? ` · ${new Date(card.verifiedPublicPrice.validFrom).toLocaleDateString("tr-TR")} tarihinden itibaren` : ""}. Güncel satış fiyatını yetkili satıcıdan doğrulayın.
        </p>
      </div> : null}
      <p className="text-sm">{card.decisionSummary.recommendation}</p>
      {card.caveats.map((caveat) => <p key={caveat} className="text-xs text-amber-700 dark:text-amber-300">{caveat}</p>)}
      <p className="border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">Ayrıntılı analizi aç →</p>
    </div>
  </TrackedVehicleLink>{equipmentAction ? <div className="border-t border-neutral-100 p-4 dark:border-neutral-800"><button type="button" aria-label={`${card.title} için doğrulanmış donanım açıklamasını aç`} disabled={equipmentExplanationPending} onClick={() => onEquipmentExplanation?.(equipmentAction.actionId)} className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600">{equipmentExplanationPending ? "Açılıyor…" : equipmentAction.label}</button></div> : null}</article>;
}
