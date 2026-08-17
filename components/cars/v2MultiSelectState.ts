export type V2MultiSelectionState = Readonly<Record<string, readonly string[]>>;

export function clearSubmittedV2MultiSelection(state: V2MultiSelectionState, messageId: string): V2MultiSelectionState {
  if (!(messageId in state)) return state;
  const next = { ...state }; delete next[messageId]; return next;
}
