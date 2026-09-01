export type LegalArtifactKind = "B2C_TERMS" | "B2C_PRIVACY_NOTICE" | "DEALER_MEMBERSHIP_AGREEMENT" | "DEALER_DPA" | "LEAD_HANDOFF_DISCLOSURE" | "COMMUNICATION_CONSENT" | "VIDEO_SESSION_NOTICE" | "AI_ASSISTANT_DISCLOSURE" | "SPONSORSHIP_TERMS" | "TAXONOMY_DATA_LICENSE" | "PROVIDER_DPA" | "COOKIE_NOTICE";
export type LegalArtifactStatus = "DRAFT" | "LEGAL_APPROVED" | "ACTIVE" | "SUPERSEDED" | "RETIRED";
export interface LegalArtifact {
  readonly artifactId: string;
  readonly kind: LegalArtifactKind;
  readonly version: string;
  readonly locale: "tr-TR";
  readonly contentChecksum: string | null;
  readonly status: LegalArtifactStatus;
  readonly legalApproverId: string | null;
  readonly effectiveAt: string | null;
  readonly expiresAt: string | null;
  readonly supersedesArtifactId: string | null;
  readonly productionUseAuthorized: false;
}

export const requiredUsedCarsLegalArtifacts: readonly LegalArtifact[] = Object.freeze([
  "B2C_TERMS", "B2C_PRIVACY_NOTICE", "DEALER_MEMBERSHIP_AGREEMENT", "DEALER_DPA", "LEAD_HANDOFF_DISCLOSURE", "COMMUNICATION_CONSENT", "VIDEO_SESSION_NOTICE", "AI_ASSISTANT_DISCLOSURE", "SPONSORSHIP_TERMS", "TAXONOMY_DATA_LICENSE", "PROVIDER_DPA", "COOKIE_NOTICE",
].map((kind, index) => ({ artifactId: `LEGAL-DRAFT-${String(index + 1).padStart(2, "0")}`, kind: kind as LegalArtifactKind, version: kind === "DEALER_MEMBERSHIP_AGREEMENT" ? "0.2-draft-eids-ietts" : "0.1-draft", locale: "tr-TR" as const, contentChecksum: null, status: "DRAFT" as const, legalApproverId: null, effectiveAt: null, expiresAt: null, supersedesArtifactId: null, productionUseAuthorized: false as const })));

export function validateLegalArtifact(artifact: LegalArtifact, now: string) {
  const codes: string[] = [];
  if (!/^sha256:[a-f0-9]{64}$/u.test(artifact.contentChecksum ?? "")) codes.push("CONTENT_CHECKSUM_REQUIRED");
  if (["LEGAL_APPROVED", "ACTIVE"].includes(artifact.status) && !artifact.legalApproverId) codes.push("LEGAL_APPROVER_REQUIRED");
  if (artifact.status === "ACTIVE" && !artifact.effectiveAt) codes.push("EFFECTIVE_DATE_REQUIRED");
  if (artifact.effectiveAt && artifact.effectiveAt > now) codes.push("NOT_YET_EFFECTIVE");
  if (artifact.expiresAt && artifact.expiresAt <= now) codes.push("ARTIFACT_EXPIRED");
  if (artifact.status === "SUPERSEDED" && !artifact.supersedesArtifactId) codes.push("SUPERSEDE_REFERENCE_REQUIRED");
  if (artifact.status !== "ACTIVE") codes.push("ARTIFACT_NOT_ACTIVE");
  return Object.freeze({ usable: codes.length === 0, codes: Object.freeze(codes), productionUseAuthorized: false as const });
}

export function assessLegalArtifactCoverage(artifacts: readonly LegalArtifact[], now: string) {
  const kinds = requiredUsedCarsLegalArtifacts.map((artifact) => artifact.kind);
  const missing = kinds.filter((kind) => !artifacts.some((artifact) => artifact.kind === kind && validateLegalArtifact(artifact, now).usable));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), productionUseAuthorized: false as const });
}
