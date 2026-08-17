export const HUMAN_CONTEXT_KINDS = [
  "FIRST_CAR", "BUYING_FOR_OTHER", "EXCITEMENT", "URGENCY", "UNCERTAINTY",
  "ANXIETY", "DISAPPOINTMENT", "LIFE_CHANGE", "HUMOR",
] as const;

export type HumanContextKind = typeof HUMAN_CONTEXT_KINDS[number];
