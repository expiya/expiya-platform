import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadActiveEquipmentEvidenceStatus } from "@/features/vehicle-data/equipmentEvidenceResolver";
import {
  parseEquipmentReviewedAssociationCandidate,
  parseEquipmentReviewedAssociationManifest,
  validateEquipmentReviewedAssociationCompatibility,
} from "@/features/vehicle-data/equipmentReviewedAssociationAdapter";
import { parseEquipmentEvidenceLayer, parseEquipmentEvidenceManifest } from "@/features/vehicle-data/equipmentEvidenceSchema";
import { validateEquipmentEvidenceCompatibility } from "@/features/vehicle-data/validateEquipmentEvidenceLayer";

type Pointer = {
  activeEquipmentEvidenceRelease: string;
  compatibleCatalogRelease: string;
  compatibleCatalogFingerprint: string;
  payloadSha256: string;
  schemaVersion: string;
  state: string;
};

const sha = (raw: string) => `sha256:${createHash("sha256").update(raw).digest("hex")}`;
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonical(child)])) : value;

async function main() {
  const root = process.cwd();
  const activePointer = JSON.parse(await readFile(path.join(root, "data/production/equipment-evidence/active.json"), "utf8")) as Pointer;
  const releaseFlag = process.argv.indexOf("--release");
  const requestedRelease = releaseFlag >= 0 ? process.argv[releaseFlag + 1] : undefined;
  if (releaseFlag >= 0 && (!requestedRelease || !/^v[0-9a-z.-]+$/u.test(requestedRelease))) throw new Error("EQUIPMENT_RELEASE_ARGUMENT_INVALID");
  const release = requestedRelease ?? activePointer.activeEquipmentEvidenceRelease;
  const verifiesActiveSelection = release === activePointer.activeEquipmentEvidenceRelease;
  const catalogPointer = JSON.parse(await readFile(path.join(root, "data/production/catalog/active.json"), "utf8")) as { active_catalog_release_version: string; catalog_payload_hash: string };
  const dir = path.join(root, "data/production/equipment-evidence/releases", release);
  const [raw, rawManifest, rawCatalog] = await Promise.all([
    readFile(path.join(dir, "equipment-evidence.json"), "utf8"),
    readFile(path.join(dir, "manifest.json"), "utf8"),
    readFile(path.join(root, `data/production/catalog/releases/v${catalogPointer.active_catalog_release_version}/catalog.json`), "utf8"),
  ]);
  const payloadInput = JSON.parse(raw) as Record<string, unknown>;
  const manifestInput = JSON.parse(rawManifest) as Record<string, unknown>;
  const catalog = JSON.parse(rawCatalog) as { records: { variant: { id: string } }[] };
  const catalogRelease = `v${catalogPointer.active_catalog_release_version}`;
  const issues: { code: string; reference?: string }[] = [];
  let metrics: Record<string, unknown> = {};

  if (["1.1.0-rc", "1.2.0-rc", "1.3.0"].includes(String(payloadInput.schemaVersion))) {
    const candidate = parseEquipmentReviewedAssociationCandidate(payloadInput);
    const manifest = parseEquipmentReviewedAssociationManifest(manifestInput);
    issues.push(...validateEquipmentReviewedAssociationCompatibility({
      candidate,
      manifest,
      rawPayload: raw,
      catalogRelease,
      catalogFingerprint: catalogPointer.catalog_payload_hash,
      catalogVariantIds: catalog.records.map((item) => item.variant.id),
    }));
    const verifiedVariants = new Set(candidate.verifiedAssertions.map((item) => item.exactVariantId));
    const associationOnlyVariants = new Set(candidate.reviewedAssociations.map((item) => item.exactVariantId).filter((id) => !verifiedVariants.has(id)));
    const coveredVariants = new Set([...verifiedVariants, ...associationOnlyVariants]);
    metrics = {
      equipmentAssertions: candidate.verifiedAssertions.length,
      reviewedAssociations: candidate.reviewedAssociations.length,
      verifiedTrimLinks: candidate.verifiedTrimLinks.length,
      exactVerifiedVariants: verifiedVariants.size,
      associationOnlyVariants: associationOnlyVariants.size,
      coveredVariants: coveredVariants.size,
      uncoveredVariants: candidate.coverage.uncoveredCoverage.exactVariantCount,
      projections: candidate.projections.length,
    };
    if (candidate.schemaVersion === "1.3.0" && (candidate.verifiedAssertions.length !== 126 || verifiedVariants.size !== 8 || coveredVariants.size !== 10)) {
      issues.push({ code: "OWNER_REVIEWED_MANUAL_METRICS_INVALID" });
    }
    if (candidate.schemaVersion === "1.3.0") {
      const files = manifest.files;
      if (!Array.isArray(files)) issues.push({ code: "OWNER_REVIEWED_MANIFEST_FILES_INVALID" });
      else for (const entry of files) {
        const file = entry as { path?: unknown; sha256?: unknown };
        if (typeof file.path !== "string" || !/^[a-z0-9-]+\.json$/u.test(file.path) || typeof file.sha256 !== "string") {
          issues.push({ code: "OWNER_REVIEWED_MANIFEST_FILE_BINDING_INVALID" });
          continue;
        }
        const bytes = await readFile(path.join(dir, file.path), "utf8");
        if (sha(bytes) !== file.sha256) issues.push({ code: "OWNER_REVIEWED_MANIFEST_FILE_DIGEST_MISMATCH", reference: file.path });
      }
      const [materializations, ownerEvents, neutrality] = await Promise.all([
        readFile(path.join(dir, "verified-association-materializations.json"), "utf8").then((value) => JSON.parse(value) as unknown[]),
        readFile(path.join(dir, "owner-decision-events.json"), "utf8").then((value) => JSON.parse(value) as Array<Record<string, unknown>>),
        readFile(path.join(dir, "decision-neutrality.json"), "utf8").then((value) => JSON.parse(value) as Record<string, unknown>),
      ]);
      const approvalManifestId = String(manifest.approvalManifestId ?? "");
      const added = candidate.verifiedAssertions.filter((row) => row.approvalManifestId === approvalManifestId);
      if (JSON.stringify(canonical(added)) !== JSON.stringify(canonical(materializations)) || added.length !== 14) issues.push({ code: "OWNER_REVIEWED_MATERIALIZATION_BINDING_INVALID" });
      if (!added.every((row) => ownerEvents.some((event) => event.eventId === row.ownerApprovalEventId && event.proposalId === row.sourceAssertionId
        && event.exactVariantId === row.exactVariantId && event.featureCode === row.featureCode && event.action === "APPROVED"
        && event.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED"))) issues.push({ code: "OWNER_DECISION_BINDING_INVALID" });
      if (neutrality.activationPerformed !== false || neutrality.runtimeChanged !== false || neutrality.yAuthorizationImpact !== "ZERO"
        || neutrality.ySelectionImpact !== "ZERO" || neutrality.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED") issues.push({ code: "OWNER_REVIEWED_DECISION_NEUTRALITY_INVALID" });
    }
    if (verifiesActiveSelection) {
      const status = loadActiveEquipmentEvidenceStatus();
      if (!("reviewedAssociationCount" in status) || status.verifiedAssertionCount !== candidate.verifiedAssertions.length
        || status.reviewedAssociationCount !== candidate.reviewedAssociations.length || status.verifiedTrimLinkCount !== candidate.verifiedTrimLinks.length
        || status.verifiedAssertionCoveredVariantCount !== verifiedVariants.size || status.associationOnlyCoveredVariantCount !== associationOnlyVariants.size
        || status.uncoveredExactVariantCount !== candidate.coverage.uncoveredCoverage.exactVariantCount || status.totalCatalogVariantCount !== candidate.coverage.catalogVariantCount
        || status.availabilityProjectionCount !== candidate.projections.length || status.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED"
        || status.hardFilterEligible || status.hardFilterAfterConfirmation || status.softPreferenceEnabled || status.questionGenerationEnabled
        || status.userExplanationEnabled || status.candidateEliminationEnabled || status.candidateResurrectionEnabled) {
        issues.push({ code: "ACTIVE_COMPACT_RUNTIME_NORMALIZATION_INVALID" });
      }
    }
    if (verifiesActiveSelection && (activePointer.schemaVersion !== candidate.schemaVersion || activePointer.state !== "ACTIVE"
      || activePointer.activeEquipmentEvidenceRelease !== manifest.releaseVersion || activePointer.payloadSha256 !== manifest.payloadSha256
      || activePointer.compatibleCatalogRelease !== manifest.compatibleCatalogRelease || activePointer.compatibleCatalogFingerprint !== manifest.compatibleCatalogFingerprint)) {
      issues.push({ code: "ACTIVE_POINTER_MISMATCH" });
    }
  } else if (payloadInput.schemaVersion === "1.2.1") {
    const layer = parseEquipmentEvidenceLayer(payloadInput);
    const manifest = parseEquipmentEvidenceManifest(manifestInput);
    issues.push(...validateEquipmentEvidenceCompatibility({
      layer,
      manifest,
      rawPayload: raw,
      catalogRelease,
      catalogFingerprint: catalogPointer.catalog_payload_hash,
      catalogVariantIds: catalog.records.map((item) => item.variant.id),
    }));
    metrics = { equipmentAssertions: layer.assertions.length, projections: layer.projections.length };
  } else if (payloadInput.schemaVersion === "1.0.0-rc" && verifiesActiveSelection) {
    const status = loadActiveEquipmentEvidenceStatus();
    if (sha(raw) !== activePointer.payloadSha256 || status.catalogCompatibility !== "READY"
      || status.verifiedAssertionCount !== 47 || status.verifiedTrimLinkCount !== 2 || status.coveredExactVariantCount !== 2
      || status.uncoveredExactVariantCount !== catalog.records.length - 2 || status.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED"
      || status.hardFilterEligible || status.softPreferenceEnabled || status.questionGenerationEnabled || status.userExplanationEnabled) {
      issues.push({ code: "ACTIVE_PILOT_RELEASE_INVALID" });
    }
  } else {
    issues.push({ code: "ACTIVE_EQUIPMENT_SCHEMA_UNSUPPORTED", reference: String(payloadInput.schemaVersion) });
  }

  if (issues.length) throw new Error(`EQUIPMENT_EVIDENCE_INVALID:${issues.map((item) => `${item.code}${item.reference ? `:${item.reference}` : ""}`).join(",")}`);
  console.log(JSON.stringify({ status: "PASS", mode: verifiesActiveSelection ? "ACTIVE" : "INACTIVE_CANDIDATE", release, schemaVersion: payloadInput.schemaVersion,
    checksum: sha(raw), metrics }));
}

void main();
