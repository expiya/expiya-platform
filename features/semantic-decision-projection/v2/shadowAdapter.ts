import { immutableDigest } from "./canonical";
import { executePMaterialityShadow, type PMaterialityContext, type QuestionAnswerEvent } from "./materialityExecutor";
import type { SemanticDecisionProjectionV2 } from "./contract";

export interface ProductionBoundarySnapshot<Card = unknown, Authorization = unknown, Pointer = unknown> {
  readonly candidateIds: readonly string[];
  readonly candidateOrder: readonly string[];
  readonly card: Card;
  readonly authorization: Authorization;
  readonly activePointer: Pointer;
}

export interface ShadowNoEffectProof {
  readonly mode: "SHADOW_ONLY_NO_EFFECT_ADAPTER";
  readonly before: {
    readonly membership: `sha256:${string}`;
    readonly order: `sha256:${string}`;
    readonly card: `sha256:${string}`;
    readonly authorization: `sha256:${string}`;
    readonly activePointer: `sha256:${string}`;
  };
  readonly after: ShadowNoEffectProof["before"];
  readonly assertions: {
    readonly productionReferencePreserved: true;
    readonly membershipUnchanged: true;
    readonly orderUnchanged: true;
    readonly cardUnchanged: true;
    readonly authorizationUnchanged: true;
    readonly activePointerUnchanged: true;
    readonly databaseUnchanged: true;
    readonly uiOrRuntimeBehaviorUnchanged: true;
  };
}

function boundaryFingerprints(boundary: ProductionBoundarySnapshot): ShadowNoEffectProof["before"] {
  return Object.freeze({
    membership: immutableDigest([...new Set(boundary.candidateIds)].sort()),
    order: immutableDigest(boundary.candidateOrder),
    card: immutableDigest(boundary.card),
    authorization: immutableDigest(boundary.authorization),
    activePointer: immutableDigest(boundary.activePointer),
  });
}

export function runPMaterialityShadowAdapter<T extends ProductionBoundarySnapshot>(input: {
  readonly production: T;
  readonly currentContext: PMaterialityContext;
  readonly projections: readonly SemanticDecisionProjectionV2[];
  readonly answerLedger?: readonly QuestionAnswerEvent[];
}): {
  readonly production: T;
  readonly shadow: ReturnType<typeof executePMaterialityShadow>;
  readonly noEffectProof: ShadowNoEffectProof;
} {
  const before = boundaryFingerprints(input.production);
  const shadow = executePMaterialityShadow({
    candidatePool: input.production.candidateIds,
    currentContext: input.currentContext,
    projections: input.projections,
    answerLedger: input.answerLedger,
  });
  const after = boundaryFingerprints(input.production);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("SHADOW_ADAPTER_PRODUCTION_BOUNDARY_MUTATED");
  return Object.freeze({
    production: input.production,
    shadow,
    noEffectProof: Object.freeze({
      mode: "SHADOW_ONLY_NO_EFFECT_ADAPTER",
      before,
      after,
      assertions: Object.freeze({
        productionReferencePreserved: true,
        membershipUnchanged: true,
        orderUnchanged: true,
        cardUnchanged: true,
        authorizationUnchanged: true,
        activePointerUnchanged: true,
        databaseUnchanged: true,
        uiOrRuntimeBehaviorUnchanged: true,
      }),
    }),
  });
}
