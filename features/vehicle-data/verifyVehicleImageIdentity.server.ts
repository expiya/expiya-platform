import sharp from "sharp";

export const MINIMUM_EXACT_VEHICLE_VISUAL_SIMILARITY = 0.95;

export interface VehicleVisualIdentity {
  readonly brand: string;
  readonly model: string;
  readonly generation?: string;
  readonly bodyStyle: string;
  readonly modelYear: number;
}

export interface VehicleImageIdentityVerification {
  readonly status: "VERIFIED_EXACT" | "REJECTED";
  readonly similarityScore: number;
  readonly metadataExact: boolean;
  readonly threshold: typeof MINIMUM_EXACT_VEHICLE_VISUAL_SIMILARITY;
  readonly reasonCodes: readonly string[];
}

const normalize = (value: string | undefined) => value?.normalize("NFKC").trim().toLocaleUpperCase("tr-TR") ?? "";

function metadataExact(reference: VehicleVisualIdentity, candidate: VehicleVisualIdentity): boolean {
  return normalize(reference.brand) === normalize(candidate.brand)
    && normalize(reference.model) === normalize(candidate.model)
    && normalize(reference.generation) === normalize(candidate.generation)
    && normalize(reference.bodyStyle) === normalize(candidate.bodyStyle)
    && reference.modelYear === candidate.modelYear;
}

async function normalizedPixels(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize(64, 64, { fit: "cover", position: "centre" }).greyscale().normalize().raw().toBuffer();
}

export async function calculateVehicleImageSimilarity(reference: Buffer, candidate: Buffer): Promise<number> {
  const [left, right] = await Promise.all([normalizedPixels(reference), normalizedPixels(candidate)]);
  if (left.length !== right.length || left.length === 0) return 0;
  let absoluteDifference = 0;
  for (let index = 0; index < left.length; index += 1) absoluteDifference += Math.abs(left[index]! - right[index]!);
  return Math.max(0, Math.min(1, 1 - absoluteDifference / (left.length * 255)));
}

export async function verifyVehicleImageIdentity(input: {
  readonly governedReferenceBytes: Buffer;
  readonly candidateBytes: Buffer;
  readonly governedReferenceIdentity: VehicleVisualIdentity;
  readonly candidateIdentity: VehicleVisualIdentity;
  readonly rightsVerified: boolean;
}): Promise<VehicleImageIdentityVerification> {
  const exactMetadata = metadataExact(input.governedReferenceIdentity, input.candidateIdentity);
  const similarityScore = await calculateVehicleImageSimilarity(input.governedReferenceBytes, input.candidateBytes);
  const reasonCodes = [
    ...(!input.rightsVerified ? ["RIGHTS_NOT_VERIFIED"] : []),
    ...(!exactMetadata ? ["IDENTITY_METADATA_MISMATCH"] : []),
    ...(similarityScore < MINIMUM_EXACT_VEHICLE_VISUAL_SIMILARITY ? ["VISUAL_SIMILARITY_BELOW_95_PERCENT"] : []),
  ];
  return Object.freeze({
    status: reasonCodes.length === 0 ? "VERIFIED_EXACT" : "REJECTED",
    similarityScore,
    metadataExact: exactMetadata,
    threshold: MINIMUM_EXACT_VEHICLE_VISUAL_SIMILARITY,
    reasonCodes: Object.freeze(reasonCodes),
  });
}
