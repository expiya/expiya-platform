import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { loadActiveVehiclePersonaSafeTraits } from "@/features/vehicle-data/vehiclePersonaSafeTraits.server";
import { selectOwnerApprovedSafePersonaSignals } from "@/features/vehicle-data/vehiclePersonaSafeTraits";
import type { VehiclePersonaSafeTraitRelease } from "@/types/vehiclePersonaSafeTraits";
import type { CatalogSnapshot } from "../catalog/types";
import type { LayerDiagnostic } from "./types";

const releaseId = z.string().regex(/^[A-Za-z0-9._-]+$/u);
const pointerSchema = z.object({ state: z.literal("ACTIVE"), activeTechnicalDailyLifeRelease: releaseId, compatibleCatalogRelease: releaseId, schemaVersion: z.literal(1) });
const manifestSchema = z.object({ releaseId: z.string().trim().min(1), schemaVersion: z.literal(1), compatibleCatalogRelease: z.string().trim().min(1), contentChecksum: z.string().regex(/^sha256:[a-f0-9]{64}$/u), sourceAuthority: z.literal("OWNER_EDITORIAL"), validationStatus: z.literal("VALIDATED") });
const mappingSchema = z.object({ mappingId: z.string().trim().min(1), interpretationClass: z.enum(["DECISION_SAFE", "GUIDED_APPROXIMATION", "ILLUSTRATIVE_ONLY"]), rankingEffect: z.enum(["DIRECT_FILTER", "SOFT_UNTIL_CONFIRMED", "NONE"]), sourceAuthority: z.string().trim().min(1), decisionUse: z.array(z.string().trim().min(1)) });
const layerSchema = z.object({ metadata: z.object({ activeCatalogVersion: z.string().trim().min(1), activeVariantCount: z.number().int().nonnegative(), dailyLifeLayerVersion: z.string().trim().min(1) }), fields: z.array(z.object({ usageMappings: z.array(mappingSchema) })) });
const canonicalCatalogRelease = (value: string): string => value.replace(/^v(?=\d)/u, "");
type ReadyPersonaLayer = { readonly status: "READY" | "READY_NO_APPROVED_SIGNALS"; readonly technicalCompatibility: "READY"; readonly editorialApproval: "OWNER_APPROVED" | "NO_APPROVED_SIGNALS"; readonly rankingEnabled: boolean; readonly releaseVersion: string; readonly contentChecksum: string; readonly sourceAuthority: "OWNER_EDITORIAL"; readonly decisionUse: "SOFT_PREFERENCE_ONLY"; readonly candidateCoverage: number; readonly approvedFamilyCount: number; readonly signals: readonly { readonly exactVariantId: string; readonly trait: import("../domain/conversationEvent").VehiclePersonaTrait; readonly authority: "OWNER_EDITORIAL"; readonly decisionUse: "SOFT_PREFERENCE_ONLY"; readonly matchStrength: 1 }[] };
export interface ProductionLayerAdapterResult { readonly dailyLife: { readonly status: "READY"; readonly releaseVersion: string; readonly checksum: string; readonly sourceAuthority: "OWNER_EDITORIAL"; readonly candidateCoverage: number; readonly mappings: readonly { readonly mappingId: string; readonly interpretationClass: "DECISION_SAFE" | "GUIDED_APPROXIMATION" | "ILLUSTRATIVE_ONLY"; readonly rankingEffect: "DIRECT_FILTER" | "SOFT_UNTIL_CONFIRMED" | "NONE"; readonly authority: string; readonly decisionUse: readonly string[] }[] } | { readonly status: "UNAVAILABLE" }; readonly persona: ReadyPersonaLayer | { readonly status: "UNAVAILABLE"; readonly technicalCompatibility?: "UNAVAILABLE"; readonly editorialApproval?: "UNKNOWN"; readonly rankingEnabled?: false; readonly contentChecksum?: string }; readonly diagnostics: readonly LayerDiagnostic[] }
export function projectProductionPersonaLayer(release: VehiclePersonaSafeTraitRelease, contentChecksum: string): ReadyPersonaLayer {
  const approved = selectOwnerApprovedSafePersonaSignals(release); const enabled = approved.signals.length > 0;
  return Object.freeze({
    status: enabled ? "READY" : "READY_NO_APPROVED_SIGNALS", technicalCompatibility: "READY",
    editorialApproval: enabled ? "OWNER_APPROVED" : "NO_APPROVED_SIGNALS", rankingEnabled: enabled,
    releaseVersion: release.releaseVersion, contentChecksum, sourceAuthority: "OWNER_EDITORIAL", decisionUse: "SOFT_PREFERENCE_ONLY",
    candidateCoverage: release.variants.length, approvedFamilyCount: approved.approvedFamilyCount, signals: approved.signals,
  });
}
export async function loadProductionDecisionLayers(snapshot: CatalogSnapshot, repositoryRoot = process.cwd()): Promise<ProductionLayerAdapterResult> {
  const diagnostics: LayerDiagnostic[] = [];
  try {
    const base = path.join(repositoryRoot, "data/production/technical-daily-life");
    const pointer = pointerSchema.parse(JSON.parse(await readFile(path.join(base, "active.json"), "utf8")));
    if (canonicalCatalogRelease(pointer.compatibleCatalogRelease) !== canonicalCatalogRelease(snapshot.authority.releaseVersion)) diagnostics.push({ code: "DAILY_LIFE_LAYER_INCOMPATIBLE" });
    const releaseRoot = path.join(base, "releases", pointer.activeTechnicalDailyLifeRelease);
    const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(releaseRoot, "manifest.json"), "utf8")));
    if (manifest.releaseId !== pointer.activeTechnicalDailyLifeRelease || canonicalCatalogRelease(manifest.compatibleCatalogRelease) !== canonicalCatalogRelease(snapshot.authority.releaseVersion)) diagnostics.push({ code: "DAILY_LIFE_LAYER_INCOMPATIBLE" });
    const raw = await readFile(path.join(releaseRoot, "technical-daily-life.json"), "utf8");
    const checksum = `sha256:${createHash("sha256").update(raw).digest("hex")}`;
    if (checksum !== manifest.contentChecksum) diagnostics.push({ code: "LAYER_CHECKSUM_MISMATCH" });
    const layer = layerSchema.parse(JSON.parse(raw));
    if (canonicalCatalogRelease(layer.metadata.activeCatalogVersion) !== canonicalCatalogRelease(snapshot.authority.releaseVersion) || layer.metadata.dailyLifeLayerVersion !== manifest.releaseId) diagnostics.push({ code: "DAILY_LIFE_LAYER_INCOMPATIBLE" });
    const candidateCoverage = snapshot.variants.length;
    const personaLayer = await loadActiveVehiclePersonaSafeTraits({
      repositoryRoot, catalogRelease: `v${canonicalCatalogRelease(snapshot.authority.releaseVersion)}`,
      catalogFingerprint: snapshot.authority.catalogFingerprint, catalogVariantIds: snapshot.variants.map((variant) => variant.id),
      catalogFamilies: snapshot.familyIndex.values().map((family) => ({ familyId: family.familyId, variantIds: family.variantIds })),
    });
    if (personaLayer.status !== "READY") diagnostics.push({ code: "PERSONA_LAYER_INCOMPATIBLE", referenceId: personaLayer.errors.join(",") });
    const unavailable = diagnostics.length > 0;
    const mappings = layer.fields.flatMap((field) => field.usageMappings).map((mapping) => ({ mappingId: mapping.mappingId, interpretationClass: mapping.interpretationClass, rankingEffect: mapping.rankingEffect, authority: mapping.sourceAuthority, decisionUse: mapping.decisionUse }));
    const dailyLife: ProductionLayerAdapterResult["dailyLife"] = unavailable ? { status: "UNAVAILABLE" } : { status: "READY", releaseVersion: manifest.releaseId, checksum, sourceAuthority: manifest.sourceAuthority, candidateCoverage, mappings: Object.freeze(mappings) };
    const persona: ProductionLayerAdapterResult["persona"] = personaLayer.status !== "READY" || unavailable ? { status: "UNAVAILABLE", technicalCompatibility: "UNAVAILABLE", editorialApproval: "UNKNOWN", rankingEnabled: false } : projectProductionPersonaLayer(personaLayer.release, personaLayer.manifest.payloadSha256);
    return Object.freeze({ dailyLife, persona, diagnostics: Object.freeze(diagnostics) });
  } catch (error) {
    const referenceId = error instanceof Error ? error.message : "unknown layer adapter error";
    const result: ProductionLayerAdapterResult = { dailyLife: { status: "UNAVAILABLE" }, persona: { status: "UNAVAILABLE" }, diagnostics: Object.freeze([{ code: "LAYER_SCHEMA_INVALID", referenceId }]) };
    return Object.freeze(result);
  }
}
