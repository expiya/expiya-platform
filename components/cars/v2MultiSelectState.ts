export type V2MultiSelectionState = Readonly<Record<string, readonly string[]>>;

export function toggleV2MultiSelection(selected: readonly string[], optionId: string, maximumSelections: number): readonly string[] {
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  return selected.length < maximumSelections ? [...selected, optionId] : selected;
}

export function selectedV2OptionLabels(selectedIds: readonly string[], options: readonly { readonly id: string; readonly label: string }[]): readonly string[] {
  const labels = selectedIds.map((id) => options.find((option) => option.id === id)?.label);
  return labels.every((label): label is string => Boolean(label)) ? labels : [];
}

export function clearSubmittedV2MultiSelection(state: V2MultiSelectionState, messageId: string): V2MultiSelectionState {
  if (!(messageId in state)) return state;
  const next = { ...state }; delete next[messageId]; return next;
}
