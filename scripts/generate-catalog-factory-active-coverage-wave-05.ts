import { generateWave05OwnerReview } from "@/features/catalog-factory/wave05OwnerReview/generate";

async function main() {
  const result = await generateWave05OwnerReview();
  console.log(JSON.stringify({ status: result.preflight.status, packageDigest: result.manifest.packageDigest, candidateDigest: result.packet.candidateDigest, reconciliation: result.packet.reconciliation }, null, 2));
}

void main();
