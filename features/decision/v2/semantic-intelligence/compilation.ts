import { createHash } from "node:crypto";
import { canonicalize } from "../fingerprint/canonicalize";
import type { ProposedConstraintMutation, ProposedPersonaMutation } from "../interpretation/types";
import type { CatalogCapabilityRegistry } from "./catalogCapability";
import type { AutomotiveSemanticResult, AutomotiveSemanticSignal, DecisionCompilationResult } from "./types";

function operator(value: unknown): string { return value && typeof value === "object" && "operator" in value ? String((value as { operator: unknown }).operator) : "EQUALS"; }
function projectionValue(value: unknown): unknown { return value && typeof value === "object" && "value" in value ? (value as { value: unknown }).value : value; }
function normalizedText(value: string): string { return value.normalize("NFKC").toLocaleLowerCase("tr-TR"); }
function sourceExplicitlySupportsProjection(signal: AutomotiveSemanticSignal): boolean {
  if (!signal.projectionHint) return false;
  const source = normalizedText(signal.sourceSpan);
  const value = projectionValue(signal.projectionHint.normalizedValue);
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return false;
  if (values.every((item) => typeof item === "number")) return values.every((item) => source.includes(String(item).replace(".", ",")) || source.includes(String(item)));
  const aliases: Readonly<Record<string, readonly string[]>> = {
    SUV: ["suv"], Sedan: ["sedan"], Hatchback: ["hatchback", "hb"], Wagon: ["station wagon", "wagon"], Coupe: ["coupe", "coupé"], Convertible: ["cabrio", "convertible"],
    BEV: ["elektrikli", "elektrik"], HEV: ["tam hibrit", "şarjsız hibrit"], PHEV: ["plug-in", "plug in", "şarjlı hibrit"], MHEV: ["mild hibrit", "hafif hibrit"], GASOLINE: ["benzin"], DIESEL: ["dizel", "mazot"], LPG: ["lpg"],
    Automatic: ["otomatik"], Manual: ["manuel"], FWD: ["önden çekiş"], RWD: ["arkadan itiş", "arkadan çekiş"], AWD: ["dört çeker", "4x4", "awd"],
  };
  return values.every((item) => typeof item === "string" && (aliases[item] ?? [normalizedText(item)]).some((alias) => source.includes(normalizedText(alias))));
}
function explicitPersonaMutation(signal: AutomotiveSemanticSignal, userText: string): ProposedPersonaMutation | undefined {
  if (signal.polarity !== "POSITIVE" || signal.explicitness !== "USER_EXPLICIT" || signal.confirmationStatus !== "CONFIRMED_BY_USER" || signal.confidence < 0.8 || !normalizedText(userText).includes(normalizedText(signal.sourceSpan))) return undefined;
  const source = normalizedText(signal.sourceSpan);
  const trait: ProposedPersonaMutation["traits"][number] | undefined = ["PERFORMANCE_ORIENTED_VEHICLE", "AGILE_RESPONSE", "FAMILY_SPORTING_BALANCE"].includes(signal.concept) && /performans|sportif|çevik|sürüş hiss/u.test(source) ? "DRIVING_ENGAGEMENT"
    : signal.concept === "EFFORTLESS_LONG_DISTANCE" && /yormayan|yormasın|konfor|rahat/u.test(source) ? "COMFORT"
    : signal.concept === "FAMILY_SPORTING_BALANCE" && /aile/u.test(source) ? "FAMILY"
    : signal.concept === "LOW_RUNNING_COST" && /ekonomik|düşük maliyet|az yak/u.test(source) ? "VALUE"
    : signal.concept === "OFF_ROAD_CAPABILITY" && /arazi|off[ -]?road/u.test(source) ? "ADVENTURE"
    : signal.concept === "CARGO_CARRIER" && /yük|eşya|ticari/u.test(source) ? "COMMERCIAL"
    : undefined;
  return trait ? Object.freeze({ operation: "ACTIVATE" as const, traits: Object.freeze([trait]), sourceSpan: signal.sourceSpan }) : undefined;
}
export function compileAutomotiveSemantics(input: { readonly result: AutomotiveSemanticResult; readonly registry: CatalogCapabilityRegistry; readonly userText: string; readonly minimumConfidence?: number }): DecisionCompilationResult {
  const accepted: ProposedConstraintMutation[] = []; const persona: ProposedPersonaMutation[] = []; const withheld: DecisionCompilationResult["withheldSignals"][number][] = [];
  const signals: readonly AutomotiveSemanticSignal[] = [...input.result.concepts, ...input.result.archetypes, ...input.result.qualitativeNeeds];
  for (const signal of signals) {
    const personaMutation = explicitPersonaMutation(signal, input.userText);
    if (personaMutation && !persona.some((item) => item.traits[0] === personaMutation.traits[0])) persona.push(personaMutation);
    const entry = signal.projectionHint ? input.registry.entries.find((candidate) => candidate.fieldId === signal.projectionHint!.fieldId) : undefined;
    const sourceIsVerbatim = normalizedText(input.userText).includes(normalizedText(signal.sourceSpan));
    const reason = signal.confirmationStatus !== "CONFIRMED_BY_USER" ? "UNCONFIRMED" : signal.explicitness !== "USER_EXPLICIT" ? "INFERRED" : signal.confidence < (input.minimumConfidence ?? 0.8) ? "LOW_CONFIDENCE" : !entry || entry.status === "UNSUPPORTED" ? "UNSUPPORTED_FIELD" : !sourceIsVerbatim || !sourceExplicitlySupportsProjection(signal) ? "INFERRED" : entry.status !== "EVALUABLE" || !entry.supportedOperators.includes(operator(signal.projectionHint!.normalizedValue) as never) ? "INSUFFICIENT_COVERAGE" : signal.polarity === "NEGATIVE" && operator(signal.projectionHint!.normalizedValue) !== "EXCLUDES" ? "NEGATIVE_WITHOUT_SAFE_OPERATOR" : undefined;
    if (reason) { withheld.push({ signalId: signal.id, reason }); continue; }
    accepted.push({ operation: "ADD", fieldId: signal.projectionHint!.fieldId, normalizedValue: signal.projectionHint!.normalizedValue, explicitness: "EXPLICIT_PREFERENCE", confidence: signal.confidence, sourceSpan: signal.sourceSpan });
  }
  const payload = { contractVersion: "ASIL-DECISION-COMPILATION-0.1", messageId: input.result.messageId, decisionMutations: accepted, personaMutations: persona, withheldSignals: withheld, decisionImpact: accepted.length || persona.length ? "PROPOSED_MUTATIONS" : "NONE" } as const;
  return Object.freeze({ ...payload, decisionMutations: Object.freeze(accepted), personaMutations: Object.freeze(persona), withheldSignals: Object.freeze(withheld), compilationFingerprint: `sha256:${createHash("sha256").update(canonicalize(payload)).digest("hex")}` });
}

export function mergeDecisionCompilation<T extends { readonly constraintMutations: readonly ProposedConstraintMutation[]; readonly personaMutations: readonly ProposedPersonaMutation[] }>(interpretation: T, compilation: DecisionCompilationResult): T {
  if (compilation.decisionImpact === "NONE") return interpretation;
  const existing = new Set(interpretation.constraintMutations.map((mutation) => `${mutation.fieldId}:${canonicalize(mutation.normalizedValue)}`));
  const additions = compilation.decisionMutations.filter((mutation) => !existing.has(`${mutation.fieldId}:${canonicalize(mutation.normalizedValue)}`));
  const existingTraits = new Set(interpretation.personaMutations.flatMap((mutation) => mutation.traits));
  const personaAdditions = compilation.personaMutations.filter((mutation) => mutation.traits.some((trait) => !existingTraits.has(trait)));
  return Object.freeze({ ...interpretation, constraintMutations: Object.freeze([...interpretation.constraintMutations, ...additions]), personaMutations: Object.freeze([...interpretation.personaMutations, ...personaAdditions]) });
}
