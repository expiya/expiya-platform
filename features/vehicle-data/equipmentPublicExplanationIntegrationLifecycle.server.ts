export type IntegrationProductionManifest = Readonly<{ releaseId: string; state: string; sourceCandidateReleaseId: string; sourceCandidateChecksum: string; payloadChecksum: string; activationPerformed: boolean; publicEffect: string; materializationAuthorizationEventId: string | null; materializedAt: string | null }>;
export type IntegrationActivationManifest = Readonly<{ productionReleaseId: string; productionManifestChecksum: string; ownerActivationAuthorizationEventId: string; productionCompositeChecksum: string }>;
export type IntegrationActivationEvent = Readonly<{ eventId: string; productionReleaseId: string; productionManifestChecksum: string; activationManifestChecksum: string; ownerActivationAuthorizationEventId: string; effectiveAt: string }>;
export type IntegrationActivePointer = Readonly<{ state: string; activeIntegrationPolicyRelease: string; productionManifestChecksum: string; activationManifestChecksum: string; activationEventChecksum: string; publicEffect: string }>;

const checksum = /^sha256:[a-f0-9]{64}$/u;
const instant = (value: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) && Number.isFinite(Date.parse(value)));
export function validateEquipmentIntegrationActivationChain(input: Readonly<{ candidateManifest: Readonly<{ releaseId: string; state: string; publicEffect: string; activationPerformed: boolean }>;
  productionManifest?: IntegrationProductionManifest; productionManifestChecksum?: string; activationManifest?: IntegrationActivationManifest; activationManifestChecksum?: string;
  activationEvent?: IntegrationActivationEvent; activationEventChecksum?: string; pointer?: IntegrationActivePointer }>) {
  const issues: string[] = [];
  if (input.candidateManifest.state !== "PROPOSED_NOT_ACTIVE" || input.candidateManifest.publicEffect !== "DISABLED_PENDING_EXPLICIT_APPROVAL" || input.candidateManifest.activationPerformed) issues.push("CANDIDATE_LIFECYCLE_INVALID");
  const production = input.productionManifest; const pointer = input.pointer;
  if (!production || !input.productionManifestChecksum || !checksum.test(input.productionManifestChecksum)) issues.push("IMMUTABLE_PRODUCTION_MANIFEST_MISSING");
  else {
    if (production.releaseId.endsWith("-candidate") || production.sourceCandidateReleaseId === production.releaseId || production.sourceCandidateReleaseId !== input.candidateManifest.releaseId) issues.push("CANDIDATE_PRODUCTION_IDENTITY_INVALID");
    if (!production.materializationAuthorizationEventId || !instant(production.materializedAt) || production.state !== "MATERIALIZED_NOT_ACTIVE" || production.activationPerformed || production.publicEffect !== "DISABLED_NOT_ACTIVE") issues.push("PRODUCTION_MATERIALIZATION_NOT_COMPLETE");
  }
  if (!input.activationManifest || !input.activationManifestChecksum || !checksum.test(input.activationManifestChecksum)) issues.push("ACTIVATION_MANIFEST_MISSING");
  if (!input.activationEvent || !input.activationEventChecksum || !checksum.test(input.activationEventChecksum)) issues.push("APPEND_ONLY_ACTIVATION_EVENT_MISSING");
  if (!pointer) issues.push("ACTIVE_POINTER_MISSING");
  if (production && input.activationManifest && (input.activationManifest.productionReleaseId !== production.releaseId || input.activationManifest.productionManifestChecksum !== input.productionManifestChecksum || !input.activationManifest.ownerActivationAuthorizationEventId)) issues.push("ACTIVATION_MANIFEST_BINDING_INVALID");
  if (input.activationManifest && input.activationEvent && (input.activationEvent.productionReleaseId !== input.activationManifest.productionReleaseId || input.activationEvent.productionManifestChecksum !== input.activationManifest.productionManifestChecksum || input.activationEvent.activationManifestChecksum !== input.activationManifestChecksum || input.activationEvent.ownerActivationAuthorizationEventId !== input.activationManifest.ownerActivationAuthorizationEventId || !instant(input.activationEvent.effectiveAt))) issues.push("ACTIVATION_EVENT_BINDING_INVALID");
  if (pointer && (pointer.state !== "ACTIVE" || pointer.publicEffect !== "ENABLED" || pointer.activeIntegrationPolicyRelease !== production?.releaseId || pointer.productionManifestChecksum !== input.productionManifestChecksum || pointer.activationManifestChecksum !== input.activationManifestChecksum || pointer.activationEventChecksum !== input.activationEventChecksum)) issues.push("ACTIVE_POINTER_BINDING_INVALID");
  return Object.freeze({ enabled: issues.length === 0, decisionEngineEffect: "ZERO" as const, issues: Object.freeze(issues) });
}

export function renderInstalledEquipmentIntegrationModule(pointer: IntegrationActivePointer) {
  return `// Generated ACTIVE Equipment Public Explanation Integration target.\nexport const activeEquipmentPublicExplanationIntegration = Object.freeze(${JSON.stringify(pointer, null, 2)} as const);\n`;
}
