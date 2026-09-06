import { createHash } from "node:crypto";

export const XPY_BOUNDED_SOFT_RANKING_VERSION = "xpy-bounded-soft-ranking/v1" as const;

export type XpySoftRankingAvailability =
  | { readonly status: "ACTIVE"; readonly authority: readonly XpySoftRankingAuthorityReference[]; readonly scoreCap: number; readonly selectionAuthority: "DOMAIN_SELECTION_CONTRACT_ONLY" }
  | { readonly status: "FAILED_CLOSED"; readonly reason: "PRODUCT_AUTHORITY_REQUIRED"; readonly requiredClarification: string; readonly conflictingAuthority?: readonly string[] };

export interface XpySoftRankingAuthorityReference {
  readonly authorityId: string;
  readonly version: string;
  readonly digest: string;
  readonly decisionUse: "BOUNDED_SOFT_RANKING_ONLY";
}

export interface XpySoftPreference {
  readonly eventId: string;
  readonly preferenceKey: string;
  readonly status: "ACTIVE" | "SUPERSEDED" | "CLEARED";
}

export interface XpyCandidateSoftSignal {
  readonly exactCandidateId: string;
  readonly preferenceKey: string;
  readonly mappingRef: string;
  readonly evidenceRef: string;
  readonly evidenceState: "KNOWN_MATCH" | "KNOWN_NO_MATCH" | "UNKNOWN" | "CONFLICTED";
  readonly contribution: number;
  readonly reasonCode: string;
  readonly authority: XpySoftRankingAuthorityReference;
}

export interface XpySoftRankingTrace {
  readonly exactCandidateId: string;
  readonly score: number;
  readonly contributions: readonly {
    readonly eventId: string;
    readonly preferenceKey: string;
    readonly mappingRef: string;
    readonly evidenceRef: string;
    readonly contribution: number;
    readonly reasonCode: string;
  }[];
  readonly neutralEvidence: readonly { readonly preferenceKey: string; readonly evidenceRef: string; readonly state: "UNKNOWN" | "CONFLICTED" }[];
}

export interface XpyBoundedSoftRankingResult {
  readonly version: typeof XPY_BOUNDED_SOFT_RANKING_VERSION;
  readonly orderedCandidateIds: readonly string[];
  readonly retainedCandidateIds: readonly string[];
  readonly topCandidateIds: readonly string[];
  readonly selectionOutcome: "SELECTED_SINGLE" | "TIED_TOP_SET" | "NON_DOMINATED_SET";
  readonly traces: readonly XpySoftRankingTrace[];
  readonly deterministicFingerprint: string;
}

/**
 * Domain-neutral Y mechanism. Domain Packs own every mapping and contribution.
 * This function never creates candidates, interprets language, or infers unknown facts.
 */
export function rankWithBoundedSoftSignals(input: {
  readonly eligibleCandidateIds: readonly string[];
  readonly preferences: readonly XpySoftPreference[];
  readonly signals: readonly XpyCandidateSoftSignal[];
  readonly scoreCap: number;
  readonly singleSelectionAuthorized: boolean;
}): XpyBoundedSoftRankingResult {
  if (!Number.isFinite(input.scoreCap) || input.scoreCap <= 0) throw new TypeError("XPY_SOFT_RANKING_INVALID_CAP");
  const eligible = [...new Set(input.eligibleCandidateIds)].sort();
  if (eligible.length !== input.eligibleCandidateIds.length) throw new TypeError("XPY_SOFT_RANKING_DUPLICATE_CANDIDATE");
  const eligibleSet = new Set(eligible);
  if (input.signals.some(signal => !eligibleSet.has(signal.exactCandidateId))) throw new TypeError("XPY_SOFT_RANKING_SIGNAL_OUTSIDE_ELIGIBLE_SET");
  const active = new Map(input.preferences.filter(row => row.status === "ACTIVE").map(row => [row.preferenceKey, row]));
  const traces = eligible.map(exactCandidateId => {
    const contributions: Array<XpySoftRankingTrace["contributions"][number]> = [];
    const neutralEvidence: Array<XpySoftRankingTrace["neutralEvidence"][number]> = [];
    for (const signal of input.signals.filter(row => row.exactCandidateId === exactCandidateId).sort(compareSignal)) {
      const event = active.get(signal.preferenceKey);
      if (!event) continue;
      validateSignal(signal, input.scoreCap);
      if (signal.evidenceState === "UNKNOWN" || signal.evidenceState === "CONFLICTED") {
        neutralEvidence.push({ preferenceKey: signal.preferenceKey, evidenceRef: signal.evidenceRef, state: signal.evidenceState });
      } else if (signal.evidenceState === "KNOWN_MATCH") {
        contributions.push({ eventId: event.eventId, preferenceKey: signal.preferenceKey, mappingRef: signal.mappingRef, evidenceRef: signal.evidenceRef, contribution: signal.contribution, reasonCode: signal.reasonCode });
      }
    }
    return { exactCandidateId, score: Math.min(input.scoreCap, contributions.reduce((sum, row) => sum + row.contribution, 0)), contributions, neutralEvidence };
  });
  const ordered = [...traces].sort((a, b) => b.score - a.score || a.exactCandidateId.localeCompare(b.exactCandidateId));
  const topScore = ordered[0]?.score;
  const topCandidateIds = topScore === undefined ? [] : ordered.filter(row => row.score === topScore).map(row => row.exactCandidateId);
  const hasPositiveAdvantage = topScore !== undefined && topScore > 0 && ordered.some(row => row.score < topScore);
  const selectionOutcome = topCandidateIds.length === 1 && hasPositiveAdvantage && input.singleSelectionAuthorized
    ? "SELECTED_SINGLE" as const
    : hasPositiveAdvantage || (topCandidateIds.length > 1 && topScore !== undefined && topScore > 0)
      ? "TIED_TOP_SET" as const
      : "NON_DOMINATED_SET" as const;
  const core = { version: XPY_BOUNDED_SOFT_RANKING_VERSION, orderedCandidateIds: ordered.map(row => row.exactCandidateId), retainedCandidateIds: eligible, topCandidateIds, selectionOutcome, traces: ordered };
  return Object.freeze({ ...core, deterministicFingerprint: createHash("sha256").update(JSON.stringify(canonical(core))).digest("hex") });
}

function validateSignal(signal: XpyCandidateSoftSignal, cap: number): void {
  if (signal.authority.decisionUse !== "BOUNDED_SOFT_RANKING_ONLY" || !signal.authority.authorityId || !signal.authority.version || !signal.authority.digest) throw new TypeError("XPY_SOFT_RANKING_AUTHORITY_REQUIRED");
  if (!signal.mappingRef || !signal.evidenceRef || !signal.reasonCode || !Number.isFinite(signal.contribution) || signal.contribution <= 0 || signal.contribution > cap) throw new TypeError("XPY_SOFT_RANKING_INVALID_SIGNAL");
  if (/affiliate|amazon|seller|catalog[_ -]?order|popularity|payout|commerce/iu.test(`${signal.mappingRef}|${signal.evidenceRef}|${signal.reasonCode}|${signal.authority.authorityId}`)) throw new TypeError("XPY_SOFT_RANKING_FORBIDDEN_SOURCE");
}

function compareSignal(a: XpyCandidateSoftSignal, b: XpyCandidateSoftSignal): number { return a.preferenceKey.localeCompare(b.preferenceKey) || a.mappingRef.localeCompare(b.mappingRef) || a.evidenceRef.localeCompare(b.evidenceRef) || a.reasonCode.localeCompare(b.reasonCode); }
function canonical(value: unknown): unknown { return Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value; }
