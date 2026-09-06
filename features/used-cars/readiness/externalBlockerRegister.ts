import { usedCarsDeliveryWorkstreams, type DeliveryOwner, type DeliveryWave } from "./deliveryWorkstreams";
import { getLaunchDomainStatuses, type LaunchDomain } from "./launchControl";

export interface ExternalBlockerRecord {
  readonly blockerId: string;
  readonly domain: LaunchDomain;
  readonly prerequisite: string;
  readonly wave: DeliveryWave;
  readonly primaryOwner: DeliveryOwner;
  readonly supportingOwners: readonly DeliveryOwner[];
  readonly requiresExternalDecision: boolean;
  readonly requiresRealEnvironment: boolean;
  readonly exitEvidence: readonly string[];
  readonly autoCloseAllowed: false;
  readonly productionEffectAuthorized: false;
}

export function createExternalBlockerRegister(): readonly ExternalBlockerRecord[] {
  const workstreams = new Map(usedCarsDeliveryWorkstreams.map((item) => [item.domain, item]));
  return Object.freeze(getLaunchDomainStatuses().flatMap((status) => status.missing.map((prerequisite) => {
    const workstream = workstreams.get(status.domain);
    if (!workstream) throw new Error(`WORKSTREAM_NOT_FOUND:${status.domain}`);
    return Object.freeze({ blockerId: `${status.domain}:${prerequisite}`, domain: status.domain, prerequisite, wave: workstream.wave, primaryOwner: workstream.primaryOwner, supportingOwners: workstream.supportingOwners, requiresExternalDecision: workstream.requiresExternalDecision, requiresRealEnvironment: workstream.requiresRealEnvironment, exitEvidence: workstream.exitEvidence, autoCloseAllowed: false as const, productionEffectAuthorized: false as const });
  })));
}

export function validateExternalBlockerRegister(records: readonly ExternalBlockerRecord[]) {
  const currentIds = getLaunchDomainStatuses().flatMap((status) => status.missing.map((key) => `${status.domain}:${key}`));
  const recordIds = records.map((item) => item.blockerId);
  const missing = currentIds.filter((id) => !recordIds.includes(id));
  const stale = recordIds.filter((id) => !currentIds.includes(id));
  const duplicates = recordIds.filter((id, index) => recordIds.indexOf(id) !== index);
  const unsafe = records.filter((item) => item.autoCloseAllowed || item.productionEffectAuthorized || item.exitEvidence.length === 0).map((item) => item.blockerId);
  return Object.freeze({ valid: missing.length === 0 && stale.length === 0 && duplicates.length === 0 && unsafe.length === 0, missing: Object.freeze(missing), stale: Object.freeze(stale), duplicates: Object.freeze(duplicates), unsafe: Object.freeze(unsafe), externalActionsAuthorized: false as const });
}
