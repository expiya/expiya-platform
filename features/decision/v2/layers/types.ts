import type { VehiclePersonaTrait } from "../domain/conversationEvent";

export type LayerCompatibility = { readonly catalogReleaseVersion: string; readonly catalogFingerprint: string; readonly layerVersion: string };
export type DailyLifeDecisionUse = "SOFT_UNTIL_CONFIRMED" | "ILLUSTRATIVE_ONLY" | "NONE" | "DIRECT_FILTER";
export interface DailyLifeLayerSignal { readonly exactVariantId: string; readonly mappingId: string; readonly authority: string; readonly mappingClass: string; readonly decisionUse: DailyLifeDecisionUse; readonly rankingEffect: -1 | 0 | 1; readonly explanationFactId?: string }
export interface DailyLifeLayerSnapshot extends LayerCompatibility { readonly signals: readonly DailyLifeLayerSignal[] }
export interface PersonaLayerSignal { readonly exactVariantId: string; readonly trait: VehiclePersonaTrait; readonly authority: string; readonly decisionUse?: "SOFT_PREFERENCE_ONLY"; readonly matchStrength: 1 | 2 | 3; readonly explanationFactId?: string }
export interface PersonaLayerSnapshot extends LayerCompatibility { readonly signals: readonly PersonaLayerSignal[] }
export interface LayerDiagnostic { readonly code: "DAILY_LIFE_LAYER_INCOMPATIBLE" | "PERSONA_LAYER_INCOMPATIBLE" | "LAYER_SIGNAL_OUTSIDE_CATALOG" | "LAYER_CHECKSUM_MISMATCH" | "LAYER_SCHEMA_INVALID" | "LAYER_CANDIDATE_COVERAGE_MISMATCH" | "PERSONA_SAFE_TRAIT_PROJECTION_UNAVAILABLE"; readonly referenceId?: string }
