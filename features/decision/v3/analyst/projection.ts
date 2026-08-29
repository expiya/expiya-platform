import type { PreferenceEvent, V3ConversationState } from "../types";
import type {
  GovernedAnalystFact,
  GovernedAnalysis,
} from "./governance";

type Projection = {
  readonly concept: string;
  readonly field?: string;
  readonly value: PreferenceEvent["normalizedValue"];
  readonly decisionUse: PreferenceEvent["decisionUse"];
};

const fuelValue = (value: GovernedAnalystFact["normalizedValue"]) => {
  const normalized = String(value).toLocaleUpperCase("tr-TR");
  if (normalized === "ELEKTRİKLİ") return "BEV";
  if (normalized === "HİBRİT") return "HEV";
  if (normalized === "BENZİNLİ") return "GASOLINE";
  if (normalized === "DİZEL") return "DIESEL";
  if (normalized === "LPG") return "LPG";
  return undefined;
};

const bodyValue = (value: GovernedAnalystFact["normalizedValue"]) => {
  const normalized = String(value)
    .toLocaleUpperCase("tr-TR")
    .replaceAll(/\s|-+/gu, "");
  if (normalized === "PICKUP") return "PICKUP";
  if (normalized === "PANELVAN") return "PANEL VAN";
  if (["SUV", "SEDAN", "HATCHBACK", "MPV"].includes(normalized))
    return normalized;
  if (normalized === "STATIONWAGON") return "STATION WAGON";
  return undefined;
};

const projectionOf = (fact: GovernedAnalystFact): Projection | undefined => {
  if (fact.concept === "primaryUsage")
    return {
      concept: "primaryUsage",
      field: "usagePurpose",
      value: fact.normalizedValue,
      decisionUse: "HARD_FILTER",
    };
  if (fact.concept === "passengerCapacity")
    return {
      concept: "minimumSeats",
      field: "seats",
      value: fact.normalizedValue,
      decisionUse: "HARD_FILTER",
    };
  if (fact.concept === "bodyStyleReference") {
    const value = bodyValue(fact.normalizedValue);
    return value
      ? {
          concept: "bodyStyle",
          field: "bodyStyle",
          value,
          decisionUse: "HARD_FILTER",
        }
      : undefined;
  }
  if (fact.concept === "fuelPreference") {
    const value = fuelValue(fact.normalizedValue);
    return value
      ? {
          concept: "fuelType",
          field: "fuelType",
          value,
          decisionUse: "HARD_FILTER",
        }
      : undefined;
  }
  if (fact.concept === "transmissionPreference")
    return {
      concept: "transmission",
      field: "transmission",
      value:
        String(fact.normalizedValue).toLocaleUpperCase("tr-TR") === "OTOMATİK"
          ? "AUTOMATIC"
          : "MANUAL",
      decisionUse: "HARD_FILTER",
    };
  if (fact.concept === "roadCondition" || fact.concept === "cargoRequirement")
    return {
      concept: fact.concept,
      field: fact.concept,
      value: fact.normalizedValue,
      decisionUse: "NONE",
    };
  if (fact.concept === "designCharacterPreference")
    return {
      concept: "distinctiveDesign",
      value: fact.normalizedValue,
      decisionUse: "SOFT_RANK",
    };
  return undefined;
};

const sameValue = (
  left: PreferenceEvent["normalizedValue"],
  right: PreferenceEvent["normalizedValue"],
) => JSON.stringify(left) === JSON.stringify(right);

export function projectGovernedAnalystFacts(
  state: V3ConversationState,
  messageId: string,
  analysis: GovernedAnalysis,
): V3ConversationState {
  const ledger = [...state.ledger];
  for (const fact of analysis.acceptedExplicitFacts) {
    const projection = projectionOf(fact);
    if (!projection) continue;
    const prior = [...ledger]
      .reverse()
      .find(
        (item) =>
          item.concept === projection.concept && item.status === "ACTIVE",
      );
    if (
      prior?.sourceMessageId === messageId &&
      sameValue(prior.normalizedValue, projection.value)
    )
      continue;
    const next: PreferenceEvent = {
      id: `${messageId}:analyst:${projection.concept}:${ledger.length}`,
      sourceMessageId: messageId,
      sourceTurn: state.revision + 1,
      sourceSpan: fact.sourceSpan,
      concept: projection.concept,
      ...(projection.field ? { field: projection.field } : {}),
      normalizedValue: projection.value,
      strength: "EXPLICIT_STRONG",
      status: "ACTIVE",
      decisionUse: projection.decisionUse,
      confidence: fact.confidence,
      authority: "USER_EXPLICIT",
      ...(prior ? { supersedes: prior.id } : {}),
      confirmationRequired: false,
    };
    if (prior)
      ledger.push({
        ...prior,
        id: `${next.id}:supersede`,
        status: "SUPERSEDED",
        decisionUse: "NONE",
        sourceMessageId: messageId,
        sourceTurn: state.revision + 1,
        sourceSpan: fact.sourceSpan,
        supersedes: prior.id,
      });
    ledger.push(next);
  }
  for (const correction of analysis.acceptedCorrections) {
    if (correction.operation === "SUPERSEDE") continue;
    const mappedConcept =
      correction.concept === "bodyStyleReference"
        ? "bodyStyle"
        : correction.concept === "fuelPreference"
          ? "fuelType"
          : correction.concept === "transmissionPreference"
            ? "transmission"
            : correction.concept === "passengerCapacity"
              ? "minimumSeats"
              : correction.concept;
    const prior = [...ledger]
      .reverse()
      .find(
        (item) => item.concept === mappedConcept && item.status === "ACTIVE",
      );
    if (!prior) continue;
    ledger.push({
      ...prior,
      id: `${messageId}:analyst-correction:${mappedConcept}:${ledger.length}`,
      sourceMessageId: messageId,
      sourceTurn: state.revision + 1,
      sourceSpan: correction.sourceSpan,
      status: correction.operation === "REJECT" ? "REJECTED" : "CLEARED",
      decisionUse: "NONE",
      supersedes: prior.id,
    });
  }
  return { ...state, ledger };
}
