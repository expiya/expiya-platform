import { createHash } from "node:crypto";
/* eslint-disable @typescript-eslint/no-explicit-any -- validator intentionally accepts immutable JSON artifacts */

export const SCALE_WAVE_OWNER_MANIFEST_VERSION = "1.0.0";
export const SCALE_WAVE_OWNER_CANONICAL_VERSION = "CANONICAL_JSON_SORTED_KEYS_V1";

export type AvailabilityProvisionKey =
  | "STANDARD+INCLUDED"
  | "OPTIONAL+FACTORY_OPTION"
  | "PACKAGE_DEPENDENT+PACKAGE_OPTION"
  | "NOT_AVAILABLE+NOT_OFFERED";

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  return typeof value === "string" ? value.normalize("NFKC") : value;
}

export function scaleWaveOwnerManifestChecksum(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")}`;
}

export function validateScaleWaveOwnerManifest(input: {
  manifest: Record<string, any>;
  passedReviewEvents: readonly Record<string, any>[];
  ownerActorValid: boolean;
  expectedR1Checksum: string;
  recomputeFingerprint: (subject: Record<string, any>) => string;
}): string[] {
  const { manifest } = input, issues: string[] = [];
  if (!input.ownerActorValid) issues.push("OWNER_ACTOR_INVALID");
  if (manifest.subjectCount !== 67 || manifest.assertionCount !== 65 || manifest.trimLinkCount !== 2 || manifest.subjects?.length !== 67) issues.push("MANIFEST_COUNTS_INVALID");
  if (manifest.distributions?.BYD?.assertions !== 33 || manifest.distributions?.BYD?.trimLinks !== 1 || manifest.distributions?.Nissan?.assertions !== 32 || manifest.distributions?.Nissan?.trimLinks !== 1 || manifest.distributions?.Volvo?.subjects !== 0) issues.push("MANIFEST_BRAND_DISTRIBUTION_INVALID");
  if (manifest.r1CycleChecksum !== input.expectedR1Checksum) issues.push("R1_CHECKSUM_MISMATCH");
  if (manifest.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") issues.push("DECISION_AUTHORITY_INVALID");
  const reviews = new Map(input.passedReviewEvents.filter((event) => event.toState === "SECOND_REVIEW_PASSED").map((event) => [`${event.subjectType}:${event.subjectId}`, event]));
  const seen = new Set<string>();
  for (const subject of manifest.subjects ?? []) {
    const key = `${subject.subjectType}:${subject.subjectId}`;
    if (seen.has(key)) issues.push("DUPLICATE_SUBJECT");
    seen.add(key);
    const review = reviews.get(key);
    if (!review || review.eventId !== subject.independentReviewEventId) issues.push("TERMINAL_SECOND_REVIEW_PASSED_REQUIRED");
    if (subject.contentFingerprint !== input.recomputeFingerprint(subject.fingerprintInput)) issues.push("CONTENT_FINGERPRINT_MISMATCH");
    if (subject.subjectType === "ASSERTION") {
      const combination = `${subject.availabilityStatus}+${subject.provisionMode}` as AvailabilityProvisionKey;
      if (!["STANDARD+INCLUDED", "OPTIONAL+FACTORY_OPTION", "PACKAGE_DEPENDENT+PACKAGE_OPTION", "NOT_AVAILABLE+NOT_OFFERED"].includes(combination)) issues.push("INVALID_AVAILABILITY_PROVISION_COMBINATION");
      if (subject.availabilityStatus === "NOT_AVAILABLE") {
        if (subject.evidencePolarity !== "NEGATIVE" || subject.locator?.kind !== "PDF_PAGE" || !subject.locator.row || !subject.locator.column || !subject.legend?.negativeMeaning) issues.push("NEGATIVE_EXACT_CELL_AND_LEGEND_REQUIRED");
      }
    }
  }
  const { manifestChecksum, ...payload } = manifest;
  if (scaleWaveOwnerManifestChecksum(payload) !== manifestChecksum) issues.push("MANIFEST_CHECKSUM_MISMATCH");
  if (manifest.approvalEventsCreated !== 0 || manifest.materializationsCreated !== 0 || manifest.activePointerChanged !== false || manifest.decisionEngineEffect !== "ZERO") issues.push("PREPARATION_BOUNDARY_VIOLATION");
  return [...new Set(issues)].sort();
}
