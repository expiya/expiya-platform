import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  createVehiclePersonaSafeTraitResolver, validateVehiclePersonaSafeTraitRelease,
  vehiclePersonaSafeTraitLifecycleManifestSchema, vehiclePersonaSafeTraitManifestSchema,
  vehiclePersonaSafeTraitPointerSchema, vehiclePersonaSafeTraitReleaseSchema,
} from "./vehiclePersonaSafeTraits";


interface PersonaActivationAuthorityInput {
  readonly releaseVersion: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly pointerChecksum: string;
  readonly activationEvent?: { readonly activationEventId: string; readonly catalogFingerprint: string; readonly releases: { readonly persona: string } };
  readonly activationResult?: { readonly status: string; readonly activationEventId: string; readonly rollbackPerformed: boolean; readonly releases: { readonly persona: string }; readonly pointerChecksums: { readonly personaPointer: string } };
  readonly postValidation?: { readonly status: string };
  readonly rollbackResultPresent: boolean;
}

export function validatePersonaActivationAuthority(input: PersonaActivationAuthorityInput): readonly string[] {
  const errors: string[] = [];
  if (!input.activationEvent || !input.activationResult || !input.postValidation) return Object.freeze(["PERSONA_ACTIVATION_CHAIN_MISSING"]);
  if (input.activationEvent.releases.persona !== input.releaseVersion || input.activationResult.releases.persona !== input.releaseVersion || input.activationResult.activationEventId !== input.activationEvent.activationEventId) errors.push("PERSONA_ACTIVATION_RELEASE_MISMATCH");
  if (input.activationEvent.catalogFingerprint !== input.catalogFingerprint) errors.push("PERSONA_ACTIVATION_FINGERPRINT_MISMATCH");
  if (input.activationResult.pointerChecksums.personaPointer !== input.pointerChecksum) errors.push("PERSONA_ACTIVATION_POINTER_CHECKSUM_MISMATCH");
  if (input.activationResult.status !== "ACTIVATED_AND_POST_VALIDATED" || input.postValidation.status !== "PASSED") errors.push("PERSONA_POST_VALIDATION_NOT_PASSED");
  if (input.activationResult.rollbackPerformed || input.rollbackResultPresent) errors.push("PERSONA_ACTIVATION_ROLLED_BACK");
  return Object.freeze(errors);
}

export async function loadActiveVehiclePersonaSafeTraits(input: {
  readonly repositoryRoot: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly catalogVariantIds: readonly string[];
  readonly catalogFamilies: readonly { familyId: string; variantIds: readonly string[] }[];
}) {
  const base = path.join(input.repositoryRoot, "data/production/personas/safe-traits");
  const rawPointer = await readFile(path.join(base, "active.json"), "utf8");
  const pointer = vehiclePersonaSafeTraitPointerSchema.parse(JSON.parse(rawPointer));
  const releaseRoot = path.join(base, "releases", pointer.activeReleaseVersion);
  const [rawPayload, rawManifest] = await Promise.all([
    readFile(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8"),
    readFile(path.join(releaseRoot, "manifest.json"), "utf8"),
  ]);
  const release = vehiclePersonaSafeTraitReleaseSchema.parse(JSON.parse(rawPayload));
  const parsedManifest = JSON.parse(rawManifest) as unknown;
  const canonicalManifest = vehiclePersonaSafeTraitManifestSchema.safeParse(parsedManifest);
  const lifecycleManifest = canonicalManifest.success ? undefined : vehiclePersonaSafeTraitLifecycleManifestSchema.parse(parsedManifest);
  const manifest = canonicalManifest.success ? canonicalManifest.data : lifecycleManifest!;
  const errors = canonicalManifest.success ? [...validateVehiclePersonaSafeTraitRelease({
    release, manifest, pointer, rawPayload, catalogRelease: input.catalogRelease,
    catalogFingerprint: input.catalogFingerprint, catalogVariantIds: input.catalogVariantIds,
    catalogFamilies: input.catalogFamilies,
  })] : validateLifecycleRelease({ release, manifest: lifecycleManifest!, pointer, rawPayload, ...input });
  if (lifecycleManifest) {
    const governanceRoot = path.join(input.repositoryRoot, "data/production/catalog/governance", input.catalogRelease, "activation-attempts");
    const attempts = await readdir(governanceRoot, { withFileTypes: true });
    let chain: Pick<PersonaActivationAuthorityInput, "activationEvent" | "activationResult" | "postValidation" | "rollbackResultPresent"> | undefined;
    for (const attempt of attempts.filter((entry) => entry.isDirectory())) {
      const attemptRoot = path.join(governanceRoot, attempt.name);
      try {
        const activationEvent = JSON.parse(await readFile(path.join(attemptRoot, "activation-event.json"), "utf8")) as NonNullable<PersonaActivationAuthorityInput["activationEvent"]>;
        if (activationEvent.releases.persona !== release.releaseVersion) continue;
        const activationResult = JSON.parse(await readFile(path.join(attemptRoot, "activation-result.json"), "utf8")) as NonNullable<PersonaActivationAuthorityInput["activationResult"]>;
        const postValidation = JSON.parse(await readFile(path.join(attemptRoot, "post-validation.json"), "utf8")) as NonNullable<PersonaActivationAuthorityInput["postValidation"]>;
        const rollbackResultPresent = await readFile(path.join(attemptRoot, "rollback-result.json")).then(() => true).catch(() => false);
        chain = { activationEvent, activationResult, postValidation, rollbackResultPresent };
        break;
      } catch { continue; }
    }
    errors.push(...validatePersonaActivationAuthority({
      releaseVersion: release.releaseVersion,
      catalogRelease: input.catalogRelease,
      catalogFingerprint: input.catalogFingerprint,
      pointerChecksum: `sha256:${createHash("sha256").update(rawPointer).digest("hex")}`,
      activationEvent: chain?.activationEvent,
      activationResult: chain?.activationResult,
      postValidation: chain?.postValidation,
      rollbackResultPresent: chain?.rollbackResultPresent ?? false,
    }));
  }
  if (errors.length > 0) return Object.freeze({ status: "UNAVAILABLE" as const, errors });
  return Object.freeze({ status: "READY" as const, release, manifest, pointer, resolver: createVehiclePersonaSafeTraitResolver(release), errors });
}

function validateLifecycleRelease(input: {
  readonly release: z.infer<typeof vehiclePersonaSafeTraitReleaseSchema>;
  readonly manifest: z.infer<typeof vehiclePersonaSafeTraitLifecycleManifestSchema>;
  readonly pointer: z.infer<typeof vehiclePersonaSafeTraitPointerSchema>;
  readonly rawPayload: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly catalogVariantIds: readonly string[];
  readonly catalogFamilies: readonly { familyId: string; variantIds: readonly string[] }[];
}): string[] {
  const errors: string[] = [];
  const hash = `sha256:${createHash("sha256").update(input.rawPayload).digest("hex")}`;
  if (hash !== input.manifest.payloadSha256 || hash !== input.pointer.payloadSha256) errors.push("PAYLOAD_CHECKSUM_MISMATCH");
  if (input.release.releaseVersion !== input.manifest.releaseVersion || input.release.releaseVersion !== input.pointer.activeReleaseVersion) errors.push("RELEASE_VERSION_MISMATCH");
  if ([input.release.compatibleCatalogRelease, input.manifest.compatibleCatalogRelease, input.pointer.compatibleCatalogRelease].some((value) => value !== input.catalogRelease)) errors.push("CATALOG_RELEASE_INCOMPATIBLE");
  if ([input.release.compatibleCatalogFingerprint, input.manifest.compatibleCatalogFingerprint, input.pointer.compatibleCatalogFingerprint].some((value) => value !== input.catalogFingerprint)) errors.push("CATALOG_FINGERPRINT_INCOMPATIBLE");
  const variantIds = input.release.variants.map((variant) => variant.exactVariantId);
  if (new Set(variantIds).size !== variantIds.length) errors.push("DUPLICATE_VARIANT_ID");
  if (JSON.stringify([...variantIds].sort()) !== JSON.stringify([...input.catalogVariantIds].sort())) errors.push("VARIANT_COVERAGE_MISMATCH");
  const expectedFamilies = new Map(input.catalogFamilies.map((family) => [family.familyId, family]));
  if (input.release.families.length !== expectedFamilies.size || input.release.families.some((family) => !expectedFamilies.has(family.familyId))) errors.push("FAMILY_COVERAGE_MISMATCH");
  const familyByVariant = new Map(input.catalogFamilies.flatMap((family) => family.variantIds.map((variantId) => [variantId, family.familyId] as const)));
  if (input.release.variants.some((variant) => familyByVariant.get(variant.exactVariantId) !== variant.familyId)) errors.push("VARIANT_FAMILY_MISMATCH");
  if (input.manifest.familyCount !== input.release.families.length || input.manifest.variantCount !== input.release.variants.length) errors.push("MANIFEST_COUNT_MISMATCH");
  if (input.release.schemaVersion !== input.pointer.schemaVersion) errors.push("SCHEMA_VERSION_MISMATCH");
  return errors;
}
