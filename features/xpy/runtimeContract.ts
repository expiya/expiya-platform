import type { XpyDomainPackRegistration } from "./contracts";

/** Executable ownership baseline. It versions the existing runtime; it is not another engine. */
export const XPY_RUNTIME_VERSION = "XPY_RUNTIME/v0.1" as const;

export const XPY_RUNTIME_CONTRACT = Object.freeze({
  version: XPY_RUNTIME_VERSION,
  order: ["PREFLIGHT", "X", "VALIDATION", "P", "Y", "COMMIT", "PRESENT"] as const,
  x: {
    owns: ["INFORMATION", "ADVISORY", "ACKNOWLEDGEMENT", "SOCIAL", "OFF_TOPIC", "CLOSING", "SAFETY", "DOMAIN_LANGUAGE"] as const,
    forbids: ["CONTEXT_WRITE", "CANDIDATE_EVALUATION", "SUFFICIENCY", "SELECTION", "AUTHORIZATION"] as const,
  },
  p: {
    owns: ["ONE_HIGHEST_MATERIALITY_QUESTION", "STRUCTURED_CHOICES", "UNCERTAINTY", "FREE_TEXT", "LOOP_SUPPRESSION"] as const,
    forbids: ["DOMAIN_SEMANTICS_INVENTION", "CANDIDATE_SELECTION", "AUTHORIZATION"] as const,
  },
  y: {
    owns: ["VALIDATED_CONTEXT", "CANDIDATES", "SUFFICIENCY", "SELECTION", "AUTHORIZATION", "EXACT_IDENTITY"] as const,
    forbids: ["CONVERSATIONAL_INVENTION"] as const,
  },
  envelopes: ["X_RESPOND", "P_ASK", "P_CLARIFY", "X_ORIENTATION_PLUS_P", "Y_DECISION_READY", "Y_FAILED_CLOSED"] as const,
  packPorts: ["SEMANTICS", "QUESTIONS", "MATERIALITY", "CATALOG", "EVIDENCE", "SUFFICIENCY", "SELECTION", "PRESENTATION"] as const,
  persistence: ["VERSION_COMPATIBILITY", "AUTHORITY_FINGERPRINT", "REPLAY", "RECOVERY", "ONE_COMMIT"] as const,
  compatibility: "LEGACY_DOMAIN_ENGINES_MAY_ONLY_RUN_BEHIND_XPY_PORTS",
});

// SHA-256 of JSON.stringify(XPY_RUNTIME_CONTRACT). Guarded by runtimeContract.test.ts.
export const XPY_RUNTIME_DIGEST = "96a533872b3b47c594e982cf5a71e3eb50c226aef65b3f4214b71a29b87ed6ee" as const;

export interface XpyRuntimeBinding {
  readonly version: typeof XPY_RUNTIME_VERSION;
  readonly digest: typeof XPY_RUNTIME_DIGEST;
  readonly domainPackId: string;
  readonly category: string;
}

export function bindXpyRuntime(pack: XpyDomainPackRegistration, category: string): XpyRuntimeBinding {
  if (pack.runtimeVersion !== XPY_RUNTIME_VERSION || pack.runtimeDigest !== XPY_RUNTIME_DIGEST) throw new TypeError("XPY_RUNTIME_BINDING_UNSUPPORTED");
  if (!pack.categories.includes(category)) throw new TypeError("XPY_RUNTIME_CATEGORY_UNREGISTERED");
  return Object.freeze({ version: XPY_RUNTIME_VERSION, digest: XPY_RUNTIME_DIGEST, domainPackId: pack.domainPackId, category });
}

export function assertXpyRuntimeBinding(binding: XpyRuntimeBinding): void {
  if (binding.version !== XPY_RUNTIME_VERSION || binding.digest !== XPY_RUNTIME_DIGEST) throw new TypeError("XPY_RUNTIME_BINDING_UNSUPPORTED");
}
