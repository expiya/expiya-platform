import type { DecisionFieldDefinition, DecisionFieldRegistry } from "./types";

const hard = (definition: Omit<DecisionFieldDefinition, "missingValuePolicy" | "requiredFactAuthority" | "decisionUse" | "policyVersion">): DecisionFieldDefinition => Object.freeze({
  ...definition, missingValuePolicy: "NOT_EVALUABLE", requiredFactAuthority: "CATALOG_MEDIUM_OR_HIGH_WITH_PROVENANCE",
  decisionUse: "HARD_FILTER_ALLOWED", policyVersion: "1.0.0",
});
const metadata = (fieldId: string, decisionUse: "DEFERRED_TO_AFFORDABILITY" | "NOT_FOR_FILTERING"): DecisionFieldDefinition => Object.freeze({
  fieldId, snapshotPath: "", valueType: "NUMBER", supportedOperators: [], missingValuePolicy: "NOT_EVALUABLE",
  requiredFactAuthority: "CATALOG_MEDIUM_OR_HIGH_WITH_PROVENANCE", decisionUse, policyVersion: "1.0.0", readFact: () => undefined,
});

export const V2_DECISION_FIELD_REGISTRY_V1: DecisionFieldRegistry = Object.freeze({
  policyId: "v2-decision-field-registry", policyVersion: "1.0.0",
  fields: Object.freeze([
    hard({ fieldId: "fuelType", snapshotPath: "decisionFacts.powertrain.fuelType", valueType: "ENUM", supportedOperators: ["EQUALS", "ONE_OF", "EXCLUDES"], enumValues: ["GASOLINE", "DIESEL", "LPG", "MHEV", "HEV", "PHEV", "BEV", "HYDROGEN"], readFact: (variant) => variant.decisionFacts.powertrain.fuelType }),
    hard({ fieldId: "transmission", snapshotPath: "decisionFacts.powertrain.transmission", valueType: "STRING", supportedOperators: ["EQUALS", "ONE_OF", "EXCLUDES"], readFact: (variant) => variant.decisionFacts.powertrain.transmission }),
    hard({ fieldId: "bodyStyle", snapshotPath: "decisionFacts.bodyStyle", valueType: "STRING", supportedOperators: ["EQUALS", "ONE_OF", "EXCLUDES"], readFact: (variant) => variant.decisionFacts.bodyStyle }),
    hard({ fieldId: "drivenWheels", snapshotPath: "decisionFacts.powertrain.drivenWheels", valueType: "STRING", supportedOperators: ["EQUALS", "ONE_OF", "EXCLUDES"], readFact: (variant) => variant.decisionFacts.powertrain.drivenWheels }),
    hard({ fieldId: "seats", snapshotPath: "decisionFacts.dimensions.seats", valueType: "NUMBER", supportedOperators: ["EQUALS", "MINIMUM", "MAXIMUM"], unit: "COUNT", readFact: (variant) => variant.decisionFacts.dimensions.seats }),
    hard({ fieldId: "luggageLitres", snapshotPath: "decisionFacts.dimensions.luggageLitres", valueType: "NUMBER", supportedOperators: ["MINIMUM", "MAXIMUM"], unit: "LITRE", readFact: (variant) => variant.decisionFacts.dimensions.luggageLitres }),
    hard({ fieldId: "cargoVolumeLitres", snapshotPath: "decisionFacts.dimensions.cargoVolumeLitres", valueType: "NUMBER", supportedOperators: ["MINIMUM", "MAXIMUM"], unit: "LITRE", readFact: (variant) => variant.decisionFacts.dimensions.cargoVolumeLitres }),
    hard({ fieldId: "payloadKg", snapshotPath: "decisionFacts.dimensions.payloadKg", valueType: "NUMBER", supportedOperators: ["MINIMUM", "MAXIMUM"], unit: "KG", readFact: (variant) => variant.decisionFacts.dimensions.payloadKg }),
    hard({ fieldId: "powerKw", snapshotPath: "decisionFacts.powertrain.powerKw", valueType: "NUMBER", supportedOperators: ["MINIMUM", "MAXIMUM"], unit: "KW", readFact: (variant) => variant.decisionFacts.powertrain.powerKw }),
    hard({ fieldId: "electricRangeKm", snapshotPath: "decisionFacts.efficiency.electricRangeKm", valueType: "NUMBER", supportedOperators: ["MINIMUM", "MAXIMUM"], unit: "KM", readFact: (variant) => variant.decisionFacts.efficiency.electricRangeKm }),
    hard({ fieldId: "combinedLitresPer100Km", snapshotPath: "decisionFacts.efficiency.combinedLitresPer100Km", valueType: "NUMBER", supportedOperators: ["MAXIMUM"], unit: "L_PER_100_KM", readFact: (variant) => variant.decisionFacts.efficiency.combinedLitresPer100Km }),
    hard({ fieldId: "combinedKwhPer100Km", snapshotPath: "decisionFacts.efficiency.combinedKwhPer100Km", valueType: "NUMBER", supportedOperators: ["MAXIMUM"], unit: "KWH_PER_100_KM", readFact: (variant) => variant.decisionFacts.efficiency.combinedKwhPer100Km }),
    metadata("price", "DEFERRED_TO_AFFORDABILITY"), metadata("budget", "DEFERRED_TO_AFFORDABILITY"),
    metadata("persona", "NOT_FOR_FILTERING"), metadata("dailyLife", "NOT_FOR_FILTERING"),
    metadata("cargoCapacityClass", "NOT_FOR_FILTERING"), metadata("maneuverability", "NOT_FOR_FILTERING"),
    metadata("comfort", "NOT_FOR_FILTERING"), metadata("prestige", "NOT_FOR_FILTERING"), metadata("elegance", "NOT_FOR_FILTERING"),
  ]),
});
