import { createHash } from "node:crypto";

export const EPEI_ACTIVATION_POLICY_ID = "EPEI_EVENT_BOUND_ATOMIC_ACTIVATION_V2" as const;
export const EPEI_ACTIVATION_POLICY_VERSION = "2.0.0" as const;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (text: string) => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const strictInstant = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) && Number.isFinite(Date.parse(value));

export type EventBoundActivationInputs = Readonly<{ launchManifestId: string; launchManifestChecksum: string; foundationProductionReleaseId: string; foundationPayloadChecksum: string; foundationManifestChecksum: string; runtimeContractCompositeChecksum: string; activationPolicyChecksum: string; productionReleaseId: string; productionPayloadChecksum: string; productionManifestChecksum: string; productionCompositeChecksum: string;
  activationAuthorizationManifestId: string; activationAuthorizationManifestChecksum: string; ownerAuthorization: Readonly<{ eventId: string; eventChecksum: string; ownerActorId: "EQUIPMENT_OWNER_001"; authorizedAt: string; synthetic: boolean; timeSource: string }>;
  activationEvent: Readonly<{ eventId: string; eventChecksum: string; authorizationEventId: string; authorizationEventChecksum: string; activatedAt: string; synthetic: boolean; timeSource: string; applyResult: "SUCCESS" }>;
  pilotExactVariantIds: readonly string[]; pilotScopeChecksum: string; authorityRelease: string; authorityPayloadChecksum: string; dailyLifeRelease: string; dailyLifePayloadChecksum: string; rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER"; priorActivationEventChecksums?: readonly string[] }>;

export function deriveEventBoundIntegrationTargets(input: EventBoundActivationInputs, mode: "PRODUCTION" | "TEST_ONLY" = "PRODUCTION") {
  const issues: string[] = [];
  if (input.productionReleaseId.endsWith("-candidate")) issues.push("CANDIDATE_RELEASE_REJECTED");
  const approvedLaunchFoundationPairs = new Map([
    ["EPEI-PILOT-LAUNCH-V3", "v1.0.1-catalog-v0.55.4-2026-08-20"],
    ["EPEI-PILOT-LAUNCH-V4", "v1.0.2-catalog-v0.55.4-2026-08-22"],
    ["EPEI-PILOT-LAUNCH-V5", "v1.0.3-catalog-v0.55.4-2026-08-22"],
    ["EPEI-PILOT-LAUNCH-V6", "v1.0.4-catalog-v0.55.4-2026-08-22"],
    ["EPEI-PILOT-LAUNCH-V7", "v1.0.5-catalog-v0.55.4-2026-08-22"],
    ["EPEI-PILOT-LAUNCH-V8", "v1.0.6-catalog-v0.55.4-2026-08-22"],
    ["EPEI-PILOT-LAUNCH-V9", "v1.0.7-catalog-v0.55.4-2026-08-22"],
  ]);
  if (approvedLaunchFoundationPairs.get(input.launchManifestId) !== input.foundationProductionReleaseId) issues.push("SINGLE_LAUNCH_BINDING_MISMATCH");
  if (input.productionReleaseId !== "v0.1.0-catalog-v0.55.4-2026-08-20" || input.productionPayloadChecksum !== "sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5" || input.productionManifestChecksum !== "sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff") issues.push("PRODUCTION_BINDING_MISMATCH");
  if (input.productionCompositeChecksum !== "sha256:34eae64907d0fc62a73f5d2691a12f440f8adbba40a243dff08cfa9509fcc082") issues.push("COMPOSITE_BINDING_MISMATCH");
  for (const value of [input.launchManifestChecksum, input.foundationPayloadChecksum, input.foundationManifestChecksum, input.runtimeContractCompositeChecksum, input.activationPolicyChecksum, input.productionPayloadChecksum, input.productionManifestChecksum, input.productionCompositeChecksum, input.activationAuthorizationManifestChecksum, input.ownerAuthorization.eventChecksum, input.activationEvent.eventChecksum, input.pilotScopeChecksum, input.authorityPayloadChecksum, input.dailyLifePayloadChecksum]) if (!/^sha256:[a-f0-9]{64}$/u.test(value)) issues.push("CHECKSUM_FORMAT_INVALID");
  if (!strictInstant(input.ownerAuthorization.authorizedAt) || !strictInstant(input.activationEvent.activatedAt) || Date.parse(input.ownerAuthorization.authorizedAt) > Date.parse(input.activationEvent.activatedAt)) issues.push("REAL_TIME_ORDER_INVALID");
  if (input.ownerAuthorization.ownerActorId !== "EQUIPMENT_OWNER_001" || input.activationEvent.authorizationEventId !== input.ownerAuthorization.eventId || input.activationEvent.authorizationEventChecksum !== input.ownerAuthorization.eventChecksum) issues.push("OWNER_AUTHORIZATION_BINDING_INVALID");
  if (mode === "PRODUCTION" && (input.ownerAuthorization.synthetic || input.activationEvent.synthetic || input.ownerAuthorization.timeSource !== "SYSTEM_CLOCK_AT_APPLY" || input.activationEvent.timeSource !== "SYSTEM_CLOCK_AT_APPLY")) issues.push("SYNTHETIC_OR_FAKE_EVENT_REJECTED");
  if (input.pilotExactVariantIds.length !== 2 || new Set(input.pilotExactVariantIds).size !== 2) issues.push("PILOT_SCOPE_INVALID");
  if (input.priorActivationEventChecksums?.includes(input.activationEvent.eventChecksum)) issues.push("DUPLICATE_ACTIVATION_REJECTED");
  if (issues.length) return Object.freeze({ ok: false as const, issues: Object.freeze(issues), pointer: null, pointerChecksum: null, generatedModule: null, generatedModuleChecksum: null });
  const pointer = Object.freeze({ schemaVersion: "2.0.0", state: "ACTIVE", publicEffect: "ENABLED", launchManifestId: input.launchManifestId, launchManifestChecksum: input.launchManifestChecksum,
    foundationProductionReleaseId: input.foundationProductionReleaseId, foundationPayloadChecksum: input.foundationPayloadChecksum, foundationManifestChecksum: input.foundationManifestChecksum, runtimeContractCompositeChecksum: input.runtimeContractCompositeChecksum,
    activeIntegrationPolicyRelease: input.productionReleaseId,
    productionPayloadChecksum: input.productionPayloadChecksum, productionManifestChecksum: input.productionManifestChecksum, productionCompositeChecksum: input.productionCompositeChecksum,
    authorityRelease: input.authorityRelease, authorityPayloadChecksum: input.authorityPayloadChecksum, dailyLifeRelease: input.dailyLifeRelease, dailyLifePayloadChecksum: input.dailyLifePayloadChecksum,
    activationAuthorizationManifestId: input.activationAuthorizationManifestId, activationAuthorizationManifestChecksum: input.activationAuthorizationManifestChecksum,
    ownerActivationAuthorizationEventId: input.ownerAuthorization.eventId, ownerActivationAuthorizationEventChecksum: input.ownerAuthorization.eventChecksum,
    activationEventId: input.activationEvent.eventId, activationEventChecksum: input.activationEvent.eventChecksum, activatedAt: input.activationEvent.activatedAt,
    rollbackTarget: input.rollbackTarget, pilotExactVariantIds: Object.freeze([...input.pilotExactVariantIds]), pilotScopeChecksum: input.pilotScopeChecksum, activationPolicyId: EPEI_ACTIVATION_POLICY_ID, activationPolicyVersion: EPEI_ACTIVATION_POLICY_VERSION,
    decisionEngineEffect: "ZERO" });
  const pointerText = json(pointer); const pointerChecksum = sha(pointerText);
  const publicPolicy = { state: "ACTIVE", publicEffect: "ENABLED", pilotExactVariantIds: input.pilotExactVariantIds, authorityRelease: input.authorityRelease, authorityPayloadChecksum: input.authorityPayloadChecksum, dailyLifeRelease: input.dailyLifeRelease, dailyLifePayloadChecksum: input.dailyLifePayloadChecksum, productionCompositeChecksum: input.productionCompositeChecksum, integrationRelease: input.productionReleaseId, integrationPayloadChecksum: input.productionPayloadChecksum, integrationManifestChecksum: input.productionManifestChecksum } as const;
  const generatedModule = `// Generated ACTIVE Equipment Public Explanation Integration.\nconst pointer = Object.freeze(${JSON.stringify(pointer, null, 2)} as const);\nconst policy = Object.freeze(${JSON.stringify(publicPolicy, null, 2)} as const);\nconst expectedPointerChecksum = "${pointerChecksum}" as const;\nexport const activeEquipmentPublicExplanationIntegration = pointer;\nexport const activeEquipmentPublicExplanationIntegrationPolicy = policy;\nexport const activeEquipmentPublicExplanationIntegrationPointerChecksum = expectedPointerChecksum;\n`;
  return Object.freeze({ ok: true as const, issues: Object.freeze([]), pointer, pointerText, pointerChecksum, generatedModule, generatedModuleChecksum: sha(generatedModule) });
}

export function simulateAtomicIntegrationInstall(input: Readonly<{ transformationOk: boolean; pointerWriteOk: boolean; moduleWriteOk: boolean; postValidationOk: boolean }>) {
  const success = input.transformationOk && input.pointerWriteOk && input.moduleWriteOk && input.postValidationOk;
  return Object.freeze(success ? { installed: true, activePointer: "ACTIVE", generatedModule: "ACTIVE", publicEffect: "ENABLED", rollbackApplied: false, decisionEngineEffect: "ZERO" }
    : { installed: false, activePointer: "ABSENT", generatedModule: "DISABLED_UNCONFIGURED", publicEffect: "DISABLED_NOT_ACTIVE", rollbackApplied: true, rollbackTarget: "DISABLED_NO_ACTIVE_INTEGRATION_POINTER", failedActivationEventPreserved: true, decisionEngineEffect: "ZERO" });
}

export type EventBoundFoundationCutoverInputs = Readonly<{
  releaseId: string;
  payloadChecksum: string;
  manifestChecksum: string;
  ownerAuthorizationEventId: string;
  ownerAuthorizationEventChecksum: string;
  cutoverEvent: Readonly<{ eventId: string; eventChecksum: string; authorizationEventId: string; cutoverAt: string; status: "CUTOVER_ACTIVE"; synthetic: boolean }>;
}>;

export function deriveEventBoundFoundationTargets(input: EventBoundFoundationCutoverInputs, mode: "PRODUCTION" | "TEST_ONLY" = "PRODUCTION") {
  const issues: string[] = [];
  if (input.releaseId.endsWith("-candidate")) issues.push("CANDIDATE_RELEASE_REJECTED");
  if (![input.payloadChecksum, input.manifestChecksum, input.ownerAuthorizationEventChecksum, input.cutoverEvent.eventChecksum].every((value) => /^sha256:[a-f0-9]{64}$/u.test(value))) issues.push("CHECKSUM_FORMAT_INVALID");
  if (input.cutoverEvent.authorizationEventId !== input.ownerAuthorizationEventId || !strictInstant(input.cutoverEvent.cutoverAt) || input.cutoverEvent.status !== "CUTOVER_ACTIVE") issues.push("CUTOVER_EVENT_BINDING_INVALID");
  if (mode === "PRODUCTION" && input.cutoverEvent.synthetic) issues.push("SYNTHETIC_EVENT_REJECTED");
  if (issues.length) return Object.freeze({ ok: false as const, issues: Object.freeze(issues), pointer: null, pointerChecksum: null, generatedModule: null, generatedModuleChecksum: null });
  const pointer = Object.freeze({ schemaVersion: "1.0.0", state: "ACTIVE", activeFoundationRelease: input.releaseId, payloadChecksum: input.payloadChecksum, manifestChecksum: input.manifestChecksum,
    ownerAuthorizationEventId: input.ownerAuthorizationEventId, ownerAuthorizationEventChecksum: input.ownerAuthorizationEventChecksum, cutoverEventId: input.cutoverEvent.eventId,
    cutoverEventChecksum: input.cutoverEvent.eventChecksum, cutoverAt: input.cutoverEvent.cutoverAt, sequencePolicyId: "REC_OFFER_AUDIT_SEQUENCE_V1", acceptanceSequence: 1, revealSequence: 2,
    rollbackTarget: "SAFE_PREDECESSOR_ROUTE_STORE", decisionEngineEffect: "ZERO" });
  const pointerText = json(pointer);
  const pointerChecksum = sha(pointerText);
  const generatedModule = `// Generated ACTIVE REC Offer Audit Foundation.\nexport const activeRecOfferAuditFoundation = Object.freeze(${JSON.stringify(pointer, null, 2)} as const);\nexport const activeRecOfferAuditFoundationPointerChecksum = "${pointerChecksum}" as const;\n`;
  return Object.freeze({ ok: true as const, issues: Object.freeze([]), pointer, pointerText, pointerChecksum, generatedModule, generatedModuleChecksum: sha(generatedModule) });
}
