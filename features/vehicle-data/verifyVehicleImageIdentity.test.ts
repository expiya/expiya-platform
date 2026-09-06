import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { verifyVehicleImageIdentity } from "./verifyVehicleImageIdentity.server";

const identity = { brand: "Toyota", model: "Corolla", generation: "E210", bodyStyle: "Sedan", modelYear: 2026 };
const image = (color: string) => sharp({ create: { width: 120, height: 80, channels: 3, background: color } }).png().toBuffer();

describe("exact vehicle image identity verification", () => {
  it("accepts only a rights-verified, metadata-exact image above the 95 percent threshold", async () => {
    const bytes = await image("#334155");
    await expect(verifyVehicleImageIdentity({ governedReferenceBytes: bytes, candidateBytes: bytes, governedReferenceIdentity: identity, candidateIdentity: identity, rightsVerified: true }))
      .resolves.toMatchObject({ status: "VERIFIED_EXACT", similarityScore: 1, metadataExact: true, reasonCodes: [] });
  });

  it("rejects visual, metadata, and rights uncertainty independently", async () => {
    const [reference, candidate] = await Promise.all([image("#000000"), image("#ffffff")]);
    const result = await verifyVehicleImageIdentity({ governedReferenceBytes: reference, candidateBytes: candidate, governedReferenceIdentity: identity, candidateIdentity: { ...identity, model: "Camry" }, rightsVerified: false });
    expect(result).toMatchObject({ status: "REJECTED", metadataExact: false });
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["RIGHTS_NOT_VERIFIED", "IDENTITY_METADATA_MISMATCH", "VISUAL_SIMILARITY_BELOW_95_PERCENT"]));
  });
});
