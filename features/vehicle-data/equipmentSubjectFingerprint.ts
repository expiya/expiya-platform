import { createHash } from "node:crypto";

export const EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY = {
  policyId: "EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_V1",
  version: "1.0.0",
  hashAlgorithm: "SHA-256",
  encoding: "UTF-8",
  unicodeNormalization: "NFKC",
  subjectIdIncluded: false,
  excludedFields: ["assertionId", "linkId", "subjectId", "supersedesAssertionId", "supersedesTrimLinkId", "createdAt", "reviewedAt", "reviewState", "verificationState", "actorDisplayName", "approvalId", "absolutePath", "serializationTimestamp", "collectionOrder", "correctionContext"],
} as const;

type JsonPrimitive = string | number | boolean | null;
export type CanonicalFingerprintValue = JsonPrimitive | readonly CanonicalFingerprintValue[] | { readonly [key: string]: CanonicalFingerprintValue };

function canonicalize(value: CanonicalFingerprintValue): string {
  if (typeof value === "string") return JSON.stringify(value.normalize("NFKC"));
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, CanonicalFingerprintValue>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key.normalize("NFKC"))}:${canonicalize(record[key])}`).join(",")}}`;
}

export function canonicalFingerprintJson(value: CanonicalFingerprintValue): string {
  const excluded = new Set<string>(EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.excludedFields);
  const omitExcluded = (candidate: CanonicalFingerprintValue): CanonicalFingerprintValue => {
    if (candidate === null || typeof candidate !== "object") return candidate;
    if (Array.isArray(candidate)) return candidate.map(omitExcluded);
    return Object.fromEntries(Object.entries(candidate).filter(([key]) => !excluded.has(key)).map(([key, nested]) => [key, omitExcluded(nested)]));
  };
  return canonicalize(omitExcluded(value));
}

export function calculateEquipmentSubjectContentFingerprint(value: CanonicalFingerprintValue): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalFingerprintJson(value), "utf8").digest("hex")}`;
}

export function assertEquipmentSubjectContentFingerprint(value: string): asserts value is `sha256:${string}` {
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) throw new Error("EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_INVALID");
}

export interface EquipmentSubjectSuccessor {
  readonly subjectId: string;
  readonly supersedesSubjectId?: string;
  readonly scopeKey: string;
}

export function validateEquipmentSubjectSuccessors(records: readonly EquipmentSubjectSuccessor[]): void {
  const byId = new Map(records.map((item) => [item.subjectId, item]));
  const successorByTarget = new Map<string, string>();
  for (const record of records) {
    const targetId = record.supersedesSubjectId;
    if (!targetId) continue;
    const target = byId.get(targetId);
    if (!target) throw new Error("EQUIPMENT_SUBJECT_SUPERSESSION_TARGET_MISSING");
    if (target.scopeKey !== record.scopeKey) throw new Error("EQUIPMENT_SUBJECT_SUPERSESSION_SCOPE_MISMATCH");
    if (successorByTarget.has(targetId)) throw new Error("EQUIPMENT_SUBJECT_MULTIPLE_TERMINAL_SUCCESSORS");
    successorByTarget.set(targetId, record.subjectId);
    const visited = new Set<string>([record.subjectId]);
    let cursor: EquipmentSubjectSuccessor | undefined = target;
    while (cursor) {
      if (visited.has(cursor.subjectId)) throw new Error("EQUIPMENT_SUBJECT_SUPERSESSION_CYCLE");
      visited.add(cursor.subjectId);
      cursor = cursor.supersedesSubjectId ? byId.get(cursor.supersedesSubjectId) : undefined;
    }
  }
}
