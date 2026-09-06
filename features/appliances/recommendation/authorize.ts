import { createHash } from "node:crypto";
import { canonicalize } from "@/features/decision/v2/fingerprint/canonicalize";
import type { AppliancesConversationState } from "../contracts";
import { constructRecommendation, type RecommendationArtifact } from "./construct";
import type { RecommendationAuthority } from "./current.server";

export interface AppliancesDecisionAuthorization {
  readonly version: "appliances-decision-authorization/v2";
  readonly conversationId: string;
  readonly contextRevision: number;
  readonly catalogRelease: string;
  readonly catalogDigest: string;
  readonly semanticAuthorityVersion: string;
  readonly semanticAuthorityDigest: string;
  readonly exactProductId: string;
  readonly configurationIdentity: string;
  readonly artifactFingerprint: string;
  readonly authorityFingerprint: string;
}
const hash = (value: unknown) => createHash("sha256").update(canonicalize(value)).digest("hex");

/** Final authorization is a server-only deterministic gate, not a bearer token or model verdict. */
export function authorizeRecommendation(bundle: RecommendationAuthority, state: AppliancesConversationState, artifact: RecommendationArtifact | undefined): AppliancesDecisionAuthorization | undefined {
  if (!artifact || state.ended || state.pendingConfirmation || artifact.artifactKind !== "SINGLE_PRODUCT_RECOMMENDATION" || artifact.exactProductIdentities.length !== 1 || artifact.contextRevision !== state.revision) return undefined;
  // A once-fresh price snapshot must not survive expiry in an in-process held result.
  if (bundle.price.status === "READY" && (!Number.isFinite(bundle.now.getTime()) || Date.parse(String(bundle.price.projection.expiresAt)) <= bundle.now.getTime())) return undefined;
  const rebuilt = constructRecommendation(bundle, state, artifact.selectionEvidence);
  if (rebuilt.status !== "CONSTRUCTED" || hash(rebuilt.artifact) !== hash(artifact)) return undefined;
  const identity = artifact.exactProductIdentities[0];
  const core = { version: "appliances-decision-authorization/v2" as const, conversationId: state.conversationId, contextRevision: state.revision, catalogRelease: state.pinnedCatalogRelease, catalogDigest: state.pinnedCatalogDigest, semanticAuthorityVersion: state.pinnedSemanticVersion, semanticAuthorityDigest: state.pinnedSemanticDigest, exactProductId: identity.productId, configurationIdentity: identity.configurationIdentity, artifactFingerprint: artifact.deterministicArtifactFingerprint };
  return { ...core, authorityFingerprint: hash(core) };
}
export function authorizationMatches(a: AppliancesDecisionAuthorization | undefined, b: AppliancesDecisionAuthorization | undefined): boolean { return !!a && !!b && hash(a) === hash(b); }
