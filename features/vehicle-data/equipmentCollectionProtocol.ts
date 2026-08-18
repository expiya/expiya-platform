import { createHash } from "node:crypto";

import type { EquipmentEvidenceAssertion, EquipmentEvidenceLocator, EquipmentResearchLedgerEntry, EquipmentReviewEvent } from "@/types/equipmentEvidence";

export const EQUIPMENT_COLLECTION_PROTOCOL_VERSION = "1.0.1" as const;
export const EQUIPMENT_OPERATION_IDS = Object.freeze({ pilotId: "EE-PILOT-001", researchCycleId: "EE-PILOT-001-CYCLE-001", firstBatchId: "EE-PILOT-001-BATCH-001" });
export const EQUIPMENT_SOURCE_PRIORITY_POLICY_V1 = Object.freeze([
  "OFFICIAL_TR_EQUIPMENT_LIST", "OFFICIAL_TR_CONFIGURATOR", "OFFICIAL_TR_TECH_SPEC", "OFFICIAL_TR_BROCHURE", "OFFICIAL_TR_DISTRIBUTOR_PRODUCT_PAGE", "GLOBAL_MANUFACTURER_WITH_EXPLICIT_TR_APPLICABILITY",
] as const);

export function createEquipmentOperationalRecordId(prefix: "EE-RES" | "EE-AST" | "EE-LINK-TRIM" | "EE-LINK-PKG" | "EE-REV", stableKey: string): string {
  return `${prefix}-${createHash("sha256").update(stableKey.normalize("NFKC")).digest("hex").slice(0, 20).toUpperCase()}`;
}

export function validateEquipmentEvidenceLocator(locator: EquipmentEvidenceLocator): readonly string[] {
  if (locator.kind === "PDF_PAGE") return Number.isInteger(locator.pageNumber) && locator.pageNumber > 0 ? [] : ["PDF_PAGE_NUMBER_INVALID"];
  if (locator.kind === "HTML_SECTION") return locator.heading || locator.table || locator.elementReference ? [] : ["HTML_LOCATOR_EMPTY"];
  if (locator.kind === "CONFIGURATOR_PATH") return locator.steps.length > 0 && locator.steps.every(Boolean) ? [] : ["CONFIGURATOR_PATH_EMPTY"];
  return locator.recordPath.startsWith("$") || locator.recordPath.startsWith("/") ? [] : ["STRUCTURED_RECORD_PATH_INVALID"];
}

function jsonPathValue(value: unknown, recordPath: string): unknown {
  if (!recordPath.startsWith("$.") || !recordPath.slice(2).split(".").every(Boolean)) return undefined;
  return recordPath.slice(2).split(".").reduce<unknown>((current, key) => current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined, value);
}

export function validateEquipmentEvidenceLocatorAgainstArtifact(locator: EquipmentEvidenceLocator, artifact: string, expectedContent?: string): readonly string[] {
  if (locator.kind === "STRUCTURED_RECORD") {
    let parsed: unknown;
    try { parsed = JSON.parse(artifact); } catch { return ["HTML_LOCATOR_NOT_FOUND"]; }
    const resolved = jsonPathValue(parsed, locator.recordPath);
    if (resolved === undefined) return ["HTML_LOCATOR_NOT_FOUND"];
    if (expectedContent !== undefined && (typeof resolved !== "string" || resolved.normalize("NFKC") !== expectedContent.normalize("NFKC"))) return ["HTML_LOCATOR_CONTENT_MISMATCH"];
    return [];
  }
  if (locator.kind !== "HTML_SECTION") return [];
  if (!locator.elementReference) return ["HTML_LOCATOR_NOT_FOUND"];
  const id = locator.elementReference.startsWith("#") ? locator.elementReference.slice(1) : undefined;
  const escaped = (id ?? locator.elementReference).replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = id ? new RegExp(`id=["']${escaped}["']`, "gu") : new RegExp(escaped, "gu");
  const count = artifact.match(pattern)?.length ?? 0;
  if (count === 0) return ["HTML_LOCATOR_NOT_FOUND"];
  if (count > 1) return ["HTML_LOCATOR_NOT_UNIQUE"];
  if (expectedContent !== undefined && !artifact.includes(expectedContent)) return ["HTML_LOCATOR_CONTENT_MISMATCH"];
  return [];
}

export function validateResearchLedger(entries: readonly EquipmentResearchLedgerEntry[]): readonly string[] {
  const issues: string[] = [], keys = new Set<string>();
  for (const item of entries) {
    const key = `${item.researchCycleId}|${item.exactVariantId}|${item.featureCode}`;
    if (keys.has(key)) issues.push("DUPLICATE_RESEARCH_DISPOSITION"); keys.add(key);
    if (item.disposition === "NOT_RESEARCHED" && (item.sourceIds.length || item.assertionIds.length)) issues.push("NOT_RESEARCHED_HAS_EVIDENCE");
    if (item.disposition === "RESEARCHED_CONCLUSIVE" && item.assertionIds.length === 0) issues.push("CONCLUSIVE_WITHOUT_ASSERTION");
  }
  return issues;
}

const allowedTransitions = new Set(["|COLLECTED", "COLLECTED|SECOND_REVIEW_REQUIRED", "SECOND_REVIEW_REQUIRED|SECOND_REVIEW_PASSED", "SECOND_REVIEW_REQUIRED|CONFLICT_REVIEW_REQUIRED", "SECOND_REVIEW_PASSED|OWNER_APPROVAL_REQUIRED", "SECOND_REVIEW_PASSED|APPROVED", "CONFLICT_REVIEW_REQUIRED|SECOND_REVIEW_REQUIRED", "OWNER_APPROVAL_REQUIRED|APPROVED"]);
export function validateReviewEvents(events: readonly EquipmentReviewEvent[], assertions: readonly EquipmentEvidenceAssertion[]): readonly string[] {
  const issues: string[] = [], ids = new Set<string>(), last = new Map<string, EquipmentReviewEvent>();
  const actors = new Map<string, { collector?: string; secondReviewer?: string }>();
  for (const event of events) {
    if (ids.has(event.reviewEventId)) issues.push("DUPLICATE_REVIEW_EVENT"); ids.add(event.reviewEventId);
    const prior = last.get(`${event.subjectType}|${event.subjectId}`);
    if ((prior?.toState ?? event.fromState) !== event.fromState || !allowedTransitions.has(`${event.fromState ?? ""}|${event.toState}`)) issues.push("INVALID_REVIEW_TRANSITION");
    const subject = `${event.subjectType}|${event.subjectId}`, actorProjection = actors.get(subject) ?? {};
    if (event.toState === "COLLECTED") { if (event.actorRole !== "EQUIPMENT_COLLECTOR_PRIMARY") issues.push("COLLECTED_ROLE_INVALID"); else actorProjection.collector = event.actorInstanceId; }
    if (event.toState === "SECOND_REVIEW_PASSED") {
      if (event.actorRole !== "EQUIPMENT_REVIEWER_SECONDARY") issues.push("SECOND_REVIEW_ROLE_INVALID");
      if (!actorProjection.collector || actorProjection.collector === event.actorInstanceId) issues.push("SELF_REVIEW_NOT_ALLOWED");
      actorProjection.secondReviewer = event.actorInstanceId;
    }
    if (event.toState === "APPROVED" && event.fromState === "OWNER_APPROVAL_REQUIRED") {
      if (event.actorRole !== "EQUIPMENT_OWNER_APPROVER") issues.push("OWNER_APPROVAL_ROLE_INVALID");
      if (event.actorInstanceId === actorProjection.collector || event.actorInstanceId === actorProjection.secondReviewer) issues.push("OWNER_APPROVER_NOT_INDEPENDENT");
    }
    actors.set(subject, actorProjection);
    last.set(`${event.subjectType}|${event.subjectId}`, event);
  }
  for (const assertion of assertions.filter((item) => item.availabilityStatus === "NOT_AVAILABLE")) {
    const state = last.get(`ASSERTION|${assertion.assertionId}`)?.toState;
    if (state !== "SECOND_REVIEW_PASSED" && state !== "OWNER_APPROVAL_REQUIRED" && state !== "APPROVED") issues.push("NEGATIVE_ASSERTION_SECOND_REVIEW_MISSING");
  }
  return issues;
}

export function hasPassedSecondReview(events: readonly EquipmentReviewEvent[], subjectType: EquipmentReviewEvent["subjectType"], subjectId: string): boolean {
  const state = events.filter((item) => item.subjectType === subjectType && item.subjectId === subjectId).at(-1)?.toState;
  return state === "SECOND_REVIEW_PASSED" || state === "OWNER_APPROVAL_REQUIRED" || state === "APPROVED";
}
