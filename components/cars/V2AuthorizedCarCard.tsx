import type { DecisionSafePublicCard } from "@/features/decision/v2/presentation/publicCardSchema";
import { XpyDecisionCard } from "@/components/xpy/XpyDecisionCard";
import { CARS_STAGE_ONE_PRESENTATION } from "@/features/decision/v2/presentation/stageOneAdapter";

export type EquipmentExplanationCardAction = Readonly<{ actionId: string; label: "Bu aracı anlat" }>;
export function V2AuthorizedCarCard({ card, position = 1, equipmentAction, onEquipmentExplanation, equipmentExplanationPending = false }: { readonly card: DecisionSafePublicCard; readonly position?: number; readonly equipmentAction?: EquipmentExplanationCardAction; readonly onEquipmentExplanation?: (actionId: string) => void; readonly equipmentExplanationPending?: boolean }) {
  void position;
  return <XpyDecisionCard card={CARS_STAGE_ONE_PRESENTATION.project(card)} action={equipmentAction ? <button type="button" aria-label={`${card.title} için doğrulanmış donanım açıklamasını aç`} disabled={equipmentExplanationPending} onClick={() => onEquipmentExplanation?.(equipmentAction.actionId)} className="w-full rounded-xl border border-neutral-700 px-4 py-3 text-sm font-medium disabled:opacity-50">{equipmentExplanationPending ? "Açılıyor…" : equipmentAction.label}</button> : undefined}/>;
}
