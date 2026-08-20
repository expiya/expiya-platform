import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import authorityPointer from "@/data/production/equipment-public-explanation-authority/active.json";
import dailyLifePointer from "@/data/production/equipment-daily-life/active.json";

export type ActiveEquipmentIntegrationPolicy = Readonly<{
  state: "ACTIVE";
  publicEffect: "ENABLED";
  pilotExactVariantIds: readonly string[];
  authorityRelease: string;
  authorityPayloadChecksum: string;
  dailyLifeRelease: string;
  dailyLifePayloadChecksum: string;
  productionCompositeChecksum: string;
  integrationRelease: string;
  integrationPayloadChecksum: string;
  integrationManifestChecksum: string;
}>;

type ActivePointer = Readonly<{
  state: "ACTIVE";
  publicEffect: "ENABLED";
  activeIntegrationPolicyRelease: string;
  productionPayloadChecksum: string;
  productionManifestChecksum: string;
  productionCompositeChecksum: string;
  activationEventId: string;
  activationEventChecksum: string;
  pilotExactVariantIds: readonly string[];
  authorityRelease: string;
  authorityPayloadChecksum: string;
  dailyLifeRelease: string;
  dailyLifePayloadChecksum: string;
}>;

const sha = (bytes: string) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const checksumPattern = /^sha256:[a-f0-9]{64}$/u;

export function loadActiveEquipmentPublicExplanationIntegration(root = process.cwd()): Readonly<{ status: "ACTIVE"; policy: ActiveEquipmentIntegrationPolicy }> | Readonly<{ status: "DISABLED"; reason: string }> {
  const base = join(root, "data/production/equipment-public-explanation-integration");
  const pointerPath = join(base, "active.json");
  if (!existsSync(pointerPath)) return { status: "DISABLED", reason: "ACTIVE_POINTER_MISSING" };
  try {
    const pointer = JSON.parse(readFileSync(pointerPath, "utf8")) as ActivePointer;
    if (pointer.state !== "ACTIVE" || pointer.publicEffect !== "ENABLED") return { status: "DISABLED", reason: "ACTIVE_POINTER_STATE_INVALID" };
    const releaseDir = join(base, "releases", pointer.activeIntegrationPolicyRelease);
    const payloadPath = join(releaseDir, "policy.json");
    const manifestPath = join(releaseDir, "manifest.json");
    const activationPath = join(base, "governance/activation-events", pointer.activationEventId, "activation-event.json");
    if (![payloadPath, manifestPath, activationPath].every(existsSync)) return { status: "DISABLED", reason: "ACTIVE_CHAIN_ARTIFACT_MISSING" };
    const payloadText = readFileSync(payloadPath, "utf8");
    const manifestText = readFileSync(manifestPath, "utf8");
    const activationText = readFileSync(activationPath, "utf8");
    if (sha(payloadText) !== pointer.productionPayloadChecksum || sha(manifestText) !== pointer.productionManifestChecksum || sha(activationText) !== pointer.activationEventChecksum) return { status: "DISABLED", reason: "ACTIVE_CHAIN_CHECKSUM_MISMATCH" };
    const payload = JSON.parse(payloadText) as Record<string, unknown>;
    const activation = JSON.parse(activationText) as Record<string, unknown>;
    if (payload.releaseId !== pointer.activeIntegrationPolicyRelease || activation.status !== "ACTIVATED" || activation.activationEventId !== pointer.activationEventId) return { status: "DISABLED", reason: "ACTIVE_CHAIN_BINDING_INVALID" };
    if (pointer.authorityRelease !== authorityPointer.activePublicExplanationAuthorityRelease || pointer.authorityPayloadChecksum !== authorityPointer.payloadSha256
      || pointer.dailyLifeRelease !== dailyLifePointer.activeEquipmentDailyLifeRelease || pointer.dailyLifePayloadChecksum !== dailyLifePointer.payloadSha256
      || pointer.productionCompositeChecksum !== authorityPointer.productionCompositeBindingChecksum) return { status: "DISABLED", reason: "ACTIVE_DEPENDENCY_BINDING_INVALID" };
    if (pointer.pilotExactVariantIds.length !== 2 || ![pointer.productionPayloadChecksum, pointer.productionManifestChecksum, pointer.activationEventChecksum].every((value) => checksumPattern.test(value))) return { status: "DISABLED", reason: "ACTIVE_SCOPE_OR_CHECKSUM_INVALID" };
    return { status: "ACTIVE", policy: Object.freeze({ state: "ACTIVE", publicEffect: "ENABLED", pilotExactVariantIds: Object.freeze([...pointer.pilotExactVariantIds]), authorityRelease: pointer.authorityRelease,
      authorityPayloadChecksum: pointer.authorityPayloadChecksum, dailyLifeRelease: pointer.dailyLifeRelease, dailyLifePayloadChecksum: pointer.dailyLifePayloadChecksum,
      productionCompositeChecksum: pointer.productionCompositeChecksum, integrationRelease: pointer.activeIntegrationPolicyRelease,
      integrationPayloadChecksum: pointer.productionPayloadChecksum, integrationManifestChecksum: pointer.productionManifestChecksum }) };
  } catch {
    return { status: "DISABLED", reason: "ACTIVE_CHAIN_PARSE_FAILED" };
  }
}
