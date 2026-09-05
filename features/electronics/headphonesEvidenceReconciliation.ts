export const HEADPHONES_RECONCILIATION_SCHEMA_VERSION =
  "electronics-headphones-exact-evidence-reconciliation/v1" as const;

export type TerminalStatus =
  | "ADMITTED"
  | "REJECTED_INSUFFICIENT_TR_APPLICABILITY"
  | "REJECTED_IDENTITY_AMBIGUOUS"
  | "DUPLICATE";

export interface HeadphonesReconciliationRecord {
  readonly asin: string;
  readonly listingTitle: string;
  readonly discoverySegment: string;
  readonly observedConfigurationClues: readonly string[];
  readonly manufacturer: string;
  readonly exactCommercialModel: string;
  readonly modelCode: string | null;
  readonly regionalSuffix: string | null;
  readonly formFactor: string;
  readonly connectivity: readonly string[];
  readonly identityRelevantVariant: string | null;
  readonly bundleTopology: string;
  readonly exactConfigurationKey: string | null;
  readonly status: TerminalStatus;
  readonly reason: string;
  readonly sourceIds: readonly string[];
}

export interface EvidenceSource {
  readonly sourceId: string;
  readonly publisher: string;
  readonly jurisdiction: "TR" | "GLOBAL";
  readonly sourceType: "PRODUCT" | "SUPPORT" | "MANUAL" | "WARRANTY" | "CONFORMITY" | "AUTHORIZED_DISTRIBUTOR";
  readonly url: string;
  readonly establishesTurkiyeApplicability: boolean;
}

export function validateHeadphonesCandidate(input: {
  readonly records: readonly HeadphonesReconciliationRecord[];
  readonly sources: readonly EvidenceSource[];
  readonly facts: readonly { productKey: string; factKey: string; value: unknown; sourceIds: readonly string[] }[];
  readonly activationPermitted: boolean;
  readonly rankingInputs: readonly string[];
}): readonly string[] {
  const issues: string[] = [];
  const sourceIds = new Set(input.sources.map((source) => source.sourceId));
  if (input.records.length !== 30) issues.push(`EXPECTED_30_TERMINAL_RECORDS:${input.records.length}`);
  if (new Set(input.records.map((row) => row.asin)).size !== input.records.length) issues.push("DUPLICATE_ASIN_RECORD");
  if (input.activationPermitted) issues.push("CANDIDATE_MUST_NOT_ACTIVATE");
  if (input.rankingInputs.some((value) => ["brand", "price", "amazonPosition", "affiliate"].includes(value))) {
    issues.push("FORBIDDEN_COMMERCE_OR_BRAND_RANKING_INPUT");
  }
  for (const row of input.records) {
    if (!/^B[A-Z0-9]{9}$/.test(row.asin)) issues.push(`INVALID_ASIN:${row.asin}`);
    if (!row.reason || !row.discoverySegment || !row.bundleTopology) issues.push(`INCOMPLETE_TERMINAL_RECORD:${row.asin}`);
    if (row.status === "ADMITTED") {
      if (!row.exactConfigurationKey || row.sourceIds.length === 0) issues.push(`ADMISSION_WITHOUT_IDENTITY:${row.asin}`);
      if (!row.sourceIds.some((id) => input.sources.find((source) => source.sourceId === id)?.establishesTurkiyeApplicability)) {
        issues.push(`ADMISSION_WITHOUT_TR_APPLICABILITY:${row.asin}`);
      }
    }
    for (const sourceId of row.sourceIds) if (!sourceIds.has(sourceId)) issues.push(`UNKNOWN_SOURCE:${row.asin}:${sourceId}`);
  }
  const admittedKeys = new Set(input.records.filter((row) => row.status === "ADMITTED").map((row) => row.exactConfigurationKey));
  for (const fact of input.facts) {
    if (!admittedKeys.has(fact.productKey)) issues.push(`FACT_FOR_UNADMITTED_PRODUCT:${fact.productKey}`);
    if (fact.sourceIds.length === 0 || fact.sourceIds.some((id) => !sourceIds.has(id))) issues.push(`UNSOURCED_FACT:${fact.productKey}:${fact.factKey}`);
  }
  return Object.freeze(issues);
}
