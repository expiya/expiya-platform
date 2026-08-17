import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  createVehiclePersonaSafeTraitResolver, validateVehiclePersonaSafeTraitRelease,
  vehiclePersonaSafeTraitManifestSchema, vehiclePersonaSafeTraitPointerSchema, vehiclePersonaSafeTraitReleaseSchema,
} from "./vehiclePersonaSafeTraits";

export async function loadActiveVehiclePersonaSafeTraits(input: {
  readonly repositoryRoot: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly catalogVariantIds: readonly string[];
  readonly catalogFamilies: readonly { familyId: string; variantIds: readonly string[] }[];
}) {
  const base = path.join(input.repositoryRoot, "data/production/personas/safe-traits");
  const pointer = vehiclePersonaSafeTraitPointerSchema.parse(JSON.parse(await readFile(path.join(base, "active.json"), "utf8")));
  const releaseRoot = path.join(base, "releases", pointer.activeReleaseVersion);
  const [rawPayload, rawManifest] = await Promise.all([
    readFile(path.join(releaseRoot, "vehicle-persona-safe-traits.json"), "utf8"),
    readFile(path.join(releaseRoot, "manifest.json"), "utf8"),
  ]);
  const release = vehiclePersonaSafeTraitReleaseSchema.parse(JSON.parse(rawPayload));
  const manifest = vehiclePersonaSafeTraitManifestSchema.parse(JSON.parse(rawManifest));
  const errors = validateVehiclePersonaSafeTraitRelease({
    release, manifest, pointer, rawPayload, catalogRelease: input.catalogRelease,
    catalogFingerprint: input.catalogFingerprint, catalogVariantIds: input.catalogVariantIds,
    catalogFamilies: input.catalogFamilies,
  });
  if (errors.length > 0) return Object.freeze({ status: "UNAVAILABLE" as const, errors });
  return Object.freeze({ status: "READY" as const, release, manifest, pointer, resolver: createVehiclePersonaSafeTraitResolver(release), errors });
}
