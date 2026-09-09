export const ROOT_COMPOSER_MAX_GRAPHEMES = 180;
export const ROOT_COMPOSER_MAX_LINES = 2;
export const ROOT_QUESTION_MAX_GRAPHEMES = 280;
export const ROOT_REPLY_MAX_OPTIONS = 6;
export const ROOT_REPLY_MAX_LABEL_GRAPHEMES = 48;
export const ROOT_CANDIDATE_PAGE_SIZE = 6;

export type RootComposerReply = {
  readonly value: string;
  readonly label: string;
  readonly questionKey?: string;
};
export type RootCandidateReply = RootComposerReply & { readonly exactProductId: string };

export type RootBudgetPriceAuthority = {
  readonly authority?: string;
  readonly comparable?: boolean;
  readonly freshness?: string;
  readonly sourceKind?: string;
  readonly minimumTry?: number;
};

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl
  ? new Intl.Segmenter("tr", { granularity: "grapheme" })
  : undefined;

export function rootGraphemeCount(value: string): number {
  return segmenter ? Array.from(segmenter.segment(value)).length : Array.from(value).length;
}

export function validateRootComposerText(value: string): string | undefined {
  if (rootGraphemeCount(value) > ROOT_COMPOSER_MAX_GRAPHEMES) return `Mesaj en fazla ${ROOT_COMPOSER_MAX_GRAPHEMES} karakter olabilir.`;
  if (value.split(/\r?\n/u).length > ROOT_COMPOSER_MAX_LINES) return "Mesaj alanı en fazla iki satır olabilir.";
  return undefined;
}

export function safeRootQuestionCopy(value: string): string {
  if (rootGraphemeCount(value) <= ROOT_QUESTION_MAX_GRAPHEMES) return value;
  return "Kararınızı doğru değerlendirebilmem için en önemli ihtiyacınızı biraz daha kısa paylaşır mısınız?";
}

export function validateRootReplyReadiness(options: readonly RootComposerReply[]): string | undefined {
  if (options.length > ROOT_REPLY_MAX_OPTIONS) return `Hızlı yanıt alanı en fazla ${ROOT_REPLY_MAX_OPTIONS} seçenek destekler.`;
  const long = options.find(option => rootGraphemeCount(option.label) > ROOT_REPLY_MAX_LABEL_GRAPHEMES);
  if (long) return `Hızlı yanıt etiketi en fazla ${ROOT_REPLY_MAX_LABEL_GRAPHEMES} karakter olabilir: ${long.value}`;
  if (rootGraphemeCount(rootReplyDraft(options)) > ROOT_COMPOSER_MAX_GRAPHEMES) return "Hızlı yanıtların birleşik metni composer sınırını aşıyor.";
  return undefined;
}

export function toggleRootReply(
  selected: readonly RootComposerReply[],
  option: RootComposerReply,
  orderedOptions: readonly RootComposerReply[],
): readonly RootComposerReply[] {
  const key = `${option.questionKey ?? ""}:${option.value}`;
  const existing = new Set(selected.map(item => `${item.questionKey ?? ""}:${item.value}`));
  if (existing.has(key)) existing.delete(key);
  else existing.add(key);
  return orderedOptions.filter(item => existing.has(`${item.questionKey ?? ""}:${item.value}`));
}

export function rootReplyDraft(selected: readonly RootComposerReply[]): string {
  return selected.map(option => option.label).join(" ve ");
}

export function rootChoicePayload(selected: readonly RootComposerReply[]): { readonly questionKey: string; readonly values: readonly string[] } | undefined {
  const questionKey = selected[0]?.questionKey;
  if (!questionKey || selected.some(option => option.questionKey !== questionKey)) return undefined;
  return { questionKey, values: selected.map(option => option.value) };
}

export function paginateRootCandidateReplies(options: readonly RootCandidateReply[], visibleCount = ROOT_CANDIDATE_PAGE_SIZE) {
  const safeCount = Math.max(ROOT_CANDIDATE_PAGE_SIZE, Math.ceil(visibleCount / ROOT_CANDIDATE_PAGE_SIZE) * ROOT_CANDIDATE_PAGE_SIZE);
  return Object.freeze({ visible: Object.freeze(options.slice(0, safeCount)), hiddenCount: Math.max(0, options.length - safeCount), canExpand: options.length > safeCount });
}

export function rootBudgetCorrectionMessage(previous: string, next: string): string {
  return previous
    ? `Önceki bütçe tercihimi düzelt: ${previous} TL yerine kesin üst sınırım ${next} TL.`
    : `Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım ${next} TL.`;
}

export function rootBudgetWarning(amount: number, authority: RootBudgetPriceAuthority | undefined): string | undefined {
  if (!authority || authority.authority !== "GOVERNED" || authority.comparable !== true || authority.freshness !== "CURRENT" || authority.sourceKind === "COMMERCE_ONLY") return undefined;
  if (!Number.isFinite(authority.minimumTry) || Number(authority.minimumTry) <= 0 || amount >= Number(authority.minimumTry)) return undefined;
  return "Bu bütçe, güncel ve karşılaştırılabilir katalogdaki en düşük exact varyant fiyatının altında.";
}
