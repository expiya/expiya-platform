// Generated ACTIVE target. Install only through an approved atomic composite activation.
import payload from "./releases/v0.1.2-catalog-v0.55.4-2026-08-20/authority.json";
import sourceManifest from "./releases/v0.1.2-catalog-v0.55.4-2026-08-20/manifest.json";
const expected = Object.freeze({ releaseId: "v0.1.2-catalog-v0.55.4-2026-08-20", payloadChecksum: "sha256:c22d1b1dc6357e6e1cea229e1262f23929f13872e3a59e4ec2002d994aa124cd", manifestChecksum: "sha256:a4a13aaf1bf91d79ad497073ddc81cde6a926c3b2238696feead45c93d44c088", compositeBindingChecksum: "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082", dailyLifeRelease: "v1.0.1-catalog-v0.55.4-2026-08-20", dailyLifeChecksum: "sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233" });
if (sourceManifest.materializedReleaseId !== expected.releaseId || sourceManifest.payloadChecksum !== expected.payloadChecksum || sourceManifest.manifestChecksum !== expected.manifestChecksum || sourceManifest.productionCompositeBindingChecksum !== expected.compositeBindingChecksum || sourceManifest.boundEquipmentDailyLifeRelease !== expected.dailyLifeRelease || sourceManifest.boundEquipmentDailyLifeChecksum !== expected.dailyLifeChecksum) throw new Error("ACTIVE_EQUIPMENT_PUBLIC_EXPLANATION_AUTHORITY_BINDING_INVALID");
export const activeEquipmentPublicExplanationAuthorityPayload = payload;
export const activeEquipmentPublicExplanationAuthorityManifest = Object.freeze({ ...sourceManifest, releaseId: expected.releaseId, payloadSha256: expected.payloadChecksum, activationPerformed: true });
export const activeEquipmentPublicExplanationAuthorityRelease = expected.releaseId;
export const activeEquipmentPublicExplanationAuthorityPayloadChecksum = expected.payloadChecksum;
export const activeEquipmentPublicExplanationAuthorityManifestChecksum = expected.manifestChecksum;
export const activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum = expected.compositeBindingChecksum;
