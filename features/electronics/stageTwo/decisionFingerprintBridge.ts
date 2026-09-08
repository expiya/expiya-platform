import type { ElectronicsConversationState, ElectronicsDecisionCard } from "../runtimeContracts";
import { electronicsDecisionFingerprint } from "../decision";
import { electronicsStageTwoDigest } from "./handoffAuthorityCandidate";

export const ELECTRONICS_STAGE_TWO_FINGERPRINT_BRIDGE_VERSION = "electronics-stage2-decision-fingerprint-bridge/v1" as const;
export type ElectronicsDecisionFingerprintSourceFormat = "NATIVE_SHA256_PREFIXED" | "LEGACY_CANONICAL_HEX";
export interface ElectronicsDecisionFingerprintTrace {
  readonly bridgeVersion: typeof ELECTRONICS_STAGE_TWO_FINGERPRINT_BRIDGE_VERSION;
  readonly sourceFormat: ElectronicsDecisionFingerprintSourceFormat;
  readonly sourceFingerprintDigest: `sha256:${string}`;
}

const HEX = /^[a-f0-9]{64}$/u;
const PREFIXED = /^sha256:[a-f0-9]{64}$/u;

function canonicalCardFingerprint(card: ElectronicsDecisionCard): string {
  const { authorizationFingerprint: _stored, ...core } = card;
  void _stored;
  return electronicsDecisionFingerprint(core);
}

export function resolveElectronicsStageTwoDecisionFingerprint(
  state: ElectronicsConversationState,
  suppliedFingerprint: string,
): { readonly fingerprint: `sha256:${string}`; readonly trace: ElectronicsDecisionFingerprintTrace } | null {
  const card = state.decisionRecord;
  if (!card || state.departmentId !== "ELECTRONICS" || card.categoryId !== state.categoryId || card.authority.contextRevision !== state.revision
    || card.authority.catalogReleaseDigest !== state.pinnedCatalogDigest || card.authority.policyDigest !== state.pinnedPolicyDigest
    || !card.exactProductId || !card.configurationIdentity) return null;

  const recomputed = canonicalCardFingerprint(card), stored = card.authorizationFingerprint;
  if (PREFIXED.test(stored)) {
    if (stored !== `sha256:${recomputed}` || suppliedFingerprint !== stored) return null;
    return {
      fingerprint: stored as `sha256:${string}`,
      trace: {
        bridgeVersion: ELECTRONICS_STAGE_TWO_FINGERPRINT_BRIDGE_VERSION,
        sourceFormat: "NATIVE_SHA256_PREFIXED",
        sourceFingerprintDigest: electronicsStageTwoDigest({ domain: "electronics-stage2-native-fingerprint-source/v1", fingerprint: stored }),
      },
    };
  }

  if (!HEX.test(stored) || stored !== recomputed) return null;
  const fingerprint = electronicsStageTwoDigest({
    domain: "electronics-stage2-legacy-decision-fingerprint-bridge/v1",
    bridgeVersion: ELECTRONICS_STAGE_TWO_FINGERPRINT_BRIDGE_VERSION,
    sourceFormat: "LEGACY_CANONICAL_HEX",
    sourceFingerprint: stored,
    conversationId: state.conversationId,
    categoryId: state.categoryId,
    decisionRevision: state.revision,
    exactProductId: card.exactProductId,
    configurationIdentity: card.configurationIdentity,
    catalogRelease: state.pinnedCatalogRelease,
    catalogDigest: state.pinnedCatalogDigest,
    policyVersion: state.pinnedPolicyVersion,
    policyDigest: state.pinnedPolicyDigest,
  });
  if (suppliedFingerprint !== stored && suppliedFingerprint !== fingerprint) return null;
  return {
    fingerprint,
    trace: {
      bridgeVersion: ELECTRONICS_STAGE_TWO_FINGERPRINT_BRIDGE_VERSION,
      sourceFormat: "LEGACY_CANONICAL_HEX",
      sourceFingerprintDigest: electronicsStageTwoDigest({ domain: "electronics-stage2-legacy-fingerprint-source/v1", fingerprint: stored }),
    },
  };
}
