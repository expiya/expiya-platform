import type { CatalogSnapshot } from "../catalog/types";
import { lookupCatalogModel } from "../catalog/lookup";
import { parseAutomotiveSemanticResult } from "./schema";
import { createAutomotiveSemanticRequest } from "./prompt";
import type { AutomotiveReferenceAnalogy, AutomotiveSemanticModel, AutomotiveSemanticResult } from "./types";

export async function interpretAutomotiveSemantics(input: { readonly model?: AutomotiveSemanticModel; readonly messageId: string; readonly userText: string }): Promise<AutomotiveSemanticResult> {
  if (!input.model) return boundedSemanticFallback(input.messageId, input.userText, "PROVIDER_UNAVAILABLE");
  try { const parsed = parseAutomotiveSemanticResult(await input.model.interpretAutomotiveSemantics(createAutomotiveSemanticRequest(input.messageId, input.userText))); if (parsed.messageId !== input.messageId) throw new TypeError("ASIL_MESSAGE_ID_MISMATCH"); return parsed; } catch (error) { const message = error instanceof Error ? error.message : ""; return boundedSemanticFallback(input.messageId, input.userText, message === "ASIL_MESSAGE_ID_MISMATCH" ? "MESSAGE_ID_MISMATCH" : /structured|parse|schema|zod/iu.test(message) ? "INVALID_STRUCTURED_OUTPUT" : /UNAVAILABLE|TIMEOUT|RATE_LIMIT|CREDIT|CANCELLED/iu.test(message) ? "PROVIDER_UNAVAILABLE" : "UNKNOWN_PROVIDER_FAILURE"); }
}

export function boundedSemanticFallback(messageId: string, userText: string, fallbackReason: AutomotiveSemanticResult["fallbackReason"] = "PROVIDER_UNAVAILABLE"): AutomotiveSemanticResult {
  return Object.freeze({ schemaVersion: "ASIL-0.1", messageId, concepts: [], archetypes: [], analogies: [], qualitativeNeeds: [], ambiguities: Object.freeze([{ code: "OPEN_AUTOMOTIVE_MEANING_REQUIRES_PROVIDER_OR_CONFIRMATION", sourceSpan: userText.slice(0, 500) || "(boş)", clarificationCandidates: Object.freeze(["Bunu günlük kullanım ihtiyacınla biraz daha açık anlatır mısın?", "Özellikle gövde, kullanım veya sürüş hissinden hangisini kastediyorsun?"]) }]), candidateInterpretations: [], requestedFacts: [], conversationalAct: "OTHER", providerStatus: "BOUNDED_FALLBACK", fallbackReason });
}

export function resolveReferenceAnalogy(snapshot: CatalogSnapshot, analogy: AutomotiveReferenceAnalogy) {
  const lookup = lookupCatalogModel(snapshot, { rawText: analogy.rawText, brand: analogy.parsedBrandText, model: analogy.parsedModelText, purpose: "REFERENCE" });
  if (lookup.kind === "EXACT_MODEL_FAMILY") return Object.freeze({ status: "CATALOG_CONFIRMED_REFERENCE" as const, familyId: lookup.familyId, canonicalLabel: `${lookup.canonicalBrand} ${lookup.canonicalModel}`, decisionAuthority: "NONE_SEMANTIC_REFERENCE_ONLY" as const });
  if (lookup.kind === "POSSIBLE_TYPO" || lookup.kind === "AMBIGUOUS") return Object.freeze({ status: "CONFIRMATION_REQUIRED" as const, options: lookup.canonicalOptions, decisionAuthority: "NONE" as const });
  return Object.freeze({ status: "WORLD_KNOWLEDGE_HYPOTHESIS_ONLY" as const, decisionAuthority: "NONE" as const, requestedAuthority: "CATALOG" as const });
}
