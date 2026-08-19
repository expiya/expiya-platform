import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { loadActiveVehiclePersonaSafeTraits } from "@/features/vehicle-data/vehiclePersonaSafeTraits.server";
import { selectOwnerApprovedSafePersonaSignals } from "@/features/vehicle-data/vehiclePersonaSafeTraits";
import type { VehiclePersonaSafeTraitRelease } from "@/types/vehiclePersonaSafeTraits";
import type { CatalogSnapshot } from "../catalog/types";
import type { LayerDiagnostic } from "./types";
import { TECHNICAL_DAILY_LIFE_RELEASE_PATTERN } from "@/features/vehicle-data/technicalDailyLifeReleaseName";

const releaseId = z.string().regex(TECHNICAL_DAILY_LIFE_RELEASE_PATTERN);
const catalogReleaseId = z.string().regex(/^v\d+\.\d+\.\d+$/u);
const pointerSchema = z.object({ state: z.literal("ACTIVE"), activeTechnicalDailyLifeRelease: releaseId, compatibleCatalogRelease: catalogReleaseId, schemaVersion: z.literal(1) });
const manifestSchema = z.object({ releaseId: z.string().trim().min(1), schemaVersion: z.literal(1), compatibleCatalogRelease: z.string().trim().min(1), contentChecksum: z.string().regex(/^sha256:[a-f0-9]{64}$/u), sourceAuthority: z.literal("OWNER_EDITORIAL"), validationStatus: z.enum(["VALIDATED", "VALIDATED_PRE_ACTIVATION"]), activationPerformed: z.boolean().optional(), compatibilityRebind: z.object({ catalogFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u) }).passthrough().optional() });
const mappingSchema = z.object({ mappingId: z.string().trim().min(1), interpretationClass: z.enum(["DECISION_SAFE", "GUIDED_APPROXIMATION", "ILLUSTRATIVE_ONLY"]), rankingEffect: z.enum(["DIRECT_FILTER", "SOFT_UNTIL_CONFIRMED", "NONE"]), sourceAuthority: z.string().trim().min(1), decisionUse: z.array(z.string().trim().min(1)) });
const layerSchema = z.object({ metadata: z.object({ activeCatalogVersion: z.string().trim().min(1), activeVariantCount: z.number().int().nonnegative(), dailyLifeLayerVersion: z.string().trim().min(1) }), fields: z.array(z.object({ usageMappings: z.array(mappingSchema) })) });
const canonicalCatalogRelease = (value: string): string => value.replace(/^v(?=\d)/u, "");
type ReadyPersonaLayer = { readonly status: "READY" | "READY_NO_APPROVED_SIGNALS"; readonly technicalCompatibility: "READY"; readonly editorialApproval: "OWNER_APPROVED" | "NO_APPROVED_SIGNALS"; readonly rankingEnabled: boolean; readonly releaseVersion: string; readonly contentChecksum: string; readonly sourceAuthority: "OWNER_EDITORIAL"; readonly decisionUse: "SOFT_PREFERENCE_ONLY"; readonly candidateCoverage: number; readonly approvedFamilyCount: number; readonly signals: readonly { readonly exactVariantId: string; readonly trait: import("../domain/conversationEvent").VehiclePersonaTrait; readonly authority: "OWNER_EDITORIAL"; readonly decisionUse: "SOFT_PREFERENCE_ONLY"; readonly matchStrength: 1 }[] };
export interface DailyLifeActivationAuthorityInput { readonly manifestValidationStatus: "VALIDATED" | "VALIDATED_PRE_ACTIVATION"; readonly manifestActivationPerformed?: boolean; readonly manifestReleaseId: string; readonly manifestCatalogRelease: string; readonly manifestCatalogFingerprint?: string; readonly manifestPayloadChecksum: string; readonly actualPayloadChecksum: string; readonly pointerState: string; readonly pointerReleaseId: string; readonly pointerCatalogRelease: string; readonly pointerChecksum: string; readonly activeCatalogRelease: string; readonly activeCatalogFingerprint: string; readonly activationEvent?: { readonly activationEventId: string; readonly releases: { readonly dailyLife: string }; readonly catalogFingerprint: string }; readonly activationResult?: { readonly status: string; readonly activationEventId: string; readonly releases: { readonly dailyLife: string }; readonly pointerChecksums: { readonly dailyPointer: string }; readonly rollbackPerformed: boolean }; readonly postValidation?: { readonly status: string }; readonly rollbackResultPresent: boolean }
export function validateDailyLifeActivationAuthority(input: DailyLifeActivationAuthorityInput): readonly string[] {
  const issues: string[] = [];
  if (input.pointerState !== "ACTIVE" || input.pointerReleaseId !== input.manifestReleaseId) issues.push("DAILY_LIFE_ACTIVE_POINTER_MISMATCH");
  if (canonicalCatalogRelease(input.pointerCatalogRelease) !== canonicalCatalogRelease(input.activeCatalogRelease) || canonicalCatalogRelease(input.manifestCatalogRelease) !== canonicalCatalogRelease(input.activeCatalogRelease) || input.manifestCatalogFingerprint !== input.activeCatalogFingerprint) issues.push("DAILY_LIFE_CATALOG_COMPATIBILITY_MISMATCH");
  if (input.manifestPayloadChecksum !== input.actualPayloadChecksum) issues.push("DAILY_LIFE_PAYLOAD_CHECKSUM_MISMATCH");
  if (input.manifestValidationStatus === "VALIDATED_PRE_ACTIVATION") {
    if (!input.activationEvent || !input.activationResult || !input.postValidation) issues.push("DAILY_LIFE_ACTIVATION_CHAIN_MISSING");
    else {
      if (input.activationEvent.releases.dailyLife !== input.manifestReleaseId || input.activationResult.releases.dailyLife !== input.manifestReleaseId || input.activationResult.activationEventId !== input.activationEvent.activationEventId) issues.push("DAILY_LIFE_ACTIVATION_RELEASE_MISMATCH");
      if (input.activationEvent.catalogFingerprint !== input.activeCatalogFingerprint) issues.push("DAILY_LIFE_ACTIVATION_FINGERPRINT_MISMATCH");
      if (input.activationResult.pointerChecksums.dailyPointer !== input.pointerChecksum) issues.push("DAILY_LIFE_ACTIVATION_POINTER_CHECKSUM_MISMATCH");
      if (input.activationResult.status !== "ACTIVATED_AND_POST_VALIDATED" || input.postValidation.status !== "PASSED") issues.push("DAILY_LIFE_POST_VALIDATION_NOT_PASSED");
      if (input.activationResult.rollbackPerformed || input.rollbackResultPresent) issues.push("DAILY_LIFE_ACTIVATION_ROLLED_BACK");
    }
  }
  return issues;
}
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
    if (manifest.validationStatus === "VALIDATED_PRE_ACTIVATION") {
      const governanceRoot = path.join(repositoryRoot, "data/production/catalog/governance", `v${canonicalCatalogRelease(snapshot.authority.releaseVersion)}`, "activation-attempts");
      const attemptDirectories = await readdir(governanceRoot, { withFileTypes: true });
      let chain: { event: DailyLifeActivationAuthorityInput["activationEvent"]; result: DailyLifeActivationAuthorityInput["activationResult"]; post: DailyLifeActivationAuthorityInput["postValidation"]; rollback: boolean } | undefined;
      for (const directory of attemptDirectories.filter((item) => item.isDirectory())) {
        const attemptRoot = path.join(governanceRoot, directory.name);
        try {
          const event = JSON.parse(await readFile(path.join(attemptRoot, "activation-event.json"), "utf8")) as NonNullable<DailyLifeActivationAuthorityInput["activationEvent"]>;
          if (event.releases.dailyLife !== manifest.releaseId) continue;
          const result = JSON.parse(await readFile(path.join(attemptRoot, "activation-result.json"), "utf8")) as NonNullable<DailyLifeActivationAuthorityInput["activationResult"]>;
          const post = JSON.parse(await readFile(path.join(attemptRoot, "post-validation.json"), "utf8")) as NonNullable<DailyLifeActivationAuthorityInput["postValidation"]>;
          chain = { event, result, post, rollback: await readFile(path.join(attemptRoot, "rollback-result.json")).then(() => true).catch(() => false) }; break;
        } catch { continue; }
      }
      const pointerRaw = await readFile(path.join(base, "active.json"), "utf8"),pointerChecksum=`sha256:${createHash("sha256").update(pointerRaw).digest("hex")}`;
      const authorityIssues = validateDailyLifeActivationAuthority({ manifestValidationStatus:manifest.validationStatus,manifestActivationPerformed:manifest.activationPerformed,manifestReleaseId:manifest.releaseId,manifestCatalogRelease:manifest.compatibleCatalogRelease,manifestCatalogFingerprint:manifest.compatibilityRebind?.catalogFingerprint,manifestPayloadChecksum:manifest.contentChecksum,actualPayloadChecksum:checksum,pointerState:pointer.state,pointerReleaseId:pointer.activeTechnicalDailyLifeRelease,pointerCatalogRelease:pointer.compatibleCatalogRelease,pointerChecksum,activeCatalogRelease:snapshot.authority.releaseVersion,activeCatalogFingerprint:snapshot.authority.catalogFingerprint,activationEvent:chain?.event,activationResult:chain?.result,postValidation:chain?.post,rollbackResultPresent:chain?.rollback??false });
      if (authorityIssues.length) diagnostics.push({ code:"DAILY_LIFE_LAYER_INCOMPATIBLE",referenceId:authorityIssues.join(",") });
    }
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
