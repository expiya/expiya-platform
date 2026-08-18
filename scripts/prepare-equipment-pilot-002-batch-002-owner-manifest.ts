import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { associationApprovalManifestChecksum, validateAssociationApprovalManifest, type EquipmentAssociationOwnerApprovalManifest } from "@/features/vehicle-data/equipmentAssociationApprovalManifest";
import { authorizationStatementHash, validateEquipmentOwnerRegistry, type EquipmentOwnerActorRecord } from "@/features/vehicle-data/equipmentOwnerGovernance";
import { fingerprint } from "@/features/vehicle-data/equipmentVerificationMaterialization";

const ROOT = process.cwd(), BASE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-002");
const R1 = path.join(BASE, "corrections/EE-PILOT-002-BATCH-002-R1"), GENERATED = "2026-08-19T00:15:00.000Z";
const CATALOG_HASH = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f", R1_HASH = "sha256:a9f3abbed2a6e173fe38afecdf55413ae568599d39c9ed27c2d5652208b6a519";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

async function main() {
  const observations = JSON.parse(await readFile(path.join(R1, "association-observations.json"), "utf8"));
  const transitions = JSON.parse(await readFile(path.join(R1, "correction-transitions.json"), "utf8"));
  const reviewEvents = JSON.parse(await readFile(path.join(R1, "second-review/independent-review-events.json"), "utf8"));
  const trimLinks = JSON.parse(await readFile(path.join(BASE, "trim-links.json"), "utf8"));
  const trimReviewEvents = JSON.parse(await readFile(path.join(BASE, "second-review/second-review-events.json"), "utf8"));
  const activeRelease = JSON.parse(await readFile(path.join(ROOT, "data/production/equipment-evidence/releases/v1.3.0-pilot-verified-catalog-v0.55.2-2026-08-18/equipment-evidence.json"), "utf8"));
  const registry = JSON.parse(await readFile(path.join(ROOT, "data/production/equipment-evidence/governance/actor-registry.json"), "utf8")) as { actors: EquipmentOwnerActorRecord[] };
  const attestation = await readFile(path.join(ROOT, "data/production/equipment-evidence/governance/attestations/EQUIPMENT_OWNER_001-v1.txt"), "utf8");
  const actor = registry.actors.find((item) => item.actorId === "EQUIPMENT_OWNER_001");
  const actorIssues = validateEquipmentOwnerRegistry({ actors: registry.actors, authorizationStatements: new Map([["EQUIPMENT_OWNER_001", attestation]]), collectorActorIds: new Set(["ACTOR-COLLECTOR-CODEX-CATALOG-001"]), reviewerActorIds: new Set(["ACTOR-REVIEWER-CODEX-EQUIPMENT-001"]) });
  if (!actor || actor.status !== "ACTIVE" || actor.scope !== "EQUIPMENT_EVIDENCE_ONLY" || authorizationStatementHash(attestation) !== actor.authorizationStatementHash || actorIssues.length) throw new Error(`OWNER_ACTOR_INVALID:${actorIssues.join(",")}`);
  if (`sha256:${sha(await readFile(path.join(R1, "checksums.json"), "utf8"))}` !== R1_HASH) throw new Error("R1_CHECKSUM_MISMATCH");

  const observationSubjects = observations.map((observation: Record<string, unknown>) => {
    const event = reviewEvents.find((item: Record<string, unknown>) => item.subjectType === "ASSOCIATION_OBSERVATION" && item.subjectId === observation.observationId && item.newStatus === "SECOND_REVIEW_PASSED");
    const transition = transitions.find((item: Record<string, unknown>) => item.toObservationId === observation.observationId);
    if (!event || !transition) throw new Error(`OBSERVATION_REVIEW_CHAIN_MISSING:${observation.observationId}`);
    const evidence = { sourceId: observation.sourceId, sourceRowId: observation.sourceRowId, supportingSourceRowIds: observation.supportingSourceRowIds, semanticMappingId: observation.semanticMappingId, semanticMappingIds: observation.semanticMappingIds, trimApplicability: observation.trimApplicability, powertrainApplicability: observation.powertrainApplicability };
    return { subjectType: "ASSOCIATION_OBSERVATION" as const, subjectId: observation.observationId, observationId: observation.observationId, exactVariantId: observation.exactVariantId,
      featureCode: observation.featureCode, observationType: "LISTED_FOR_EXACT_TRIM" as const, provisionKnowledge: "PROVISION_UNRESOLVED" as const, decisionUse: "CONFIRMATION_REQUIRED" as const,
      sourceId: observation.sourceId, sourceRowId: observation.sourceRowId, semanticMappingId: observation.semanticMappingId, trimApplicability: observation.trimApplicability, powertrainApplicability: observation.powertrainApplicability,
      modelYearApplicability: observation.modelYearApplicability, marketApplicability: "TR" as const, independentReviewEventId: event.eventId, correctionTransitionId: transition.transitionId,
      historicalAssertionId: transition.fromAssertionId, contentFingerprint: observation.contentFingerprint, evidenceFingerprint: fingerprint(evidence) };
  });
  const trimSubjects = trimLinks.map((link: Record<string, unknown>) => {
    const event = trimReviewEvents.find((item: Record<string, unknown>) => item.subjectType === "TRIM_LINK" && item.subjectId === link.linkId && item.toState === "SECOND_REVIEW_PASSED");
    if (!event) throw new Error(`TRIM_REVIEW_EVENT_MISSING:${link.linkId}`);
    const transmission = link.powertrainIdentity === "DIESEL_130_TCT6" ? "TCT6" : "TCT7";
    return { subjectType: "TRIM_LINK" as const, subjectId: link.linkId, trimLinkId: link.linkId, exactVariantId: link.exactVariantId, canonicalTrimId: link.canonicalTrimId,
      officialTrimName: link.officialTrimName, powertrain: link.powertrainIdentity, transmission, modelYear: 2026, market: "TR" as const, identitySourceIds: link.provenanceSourceIds,
      independentReviewEventId: event.eventId, contentFingerprint: event.contentFingerprint, evidenceFingerprint: fingerprint({ identitySourceIds: link.provenanceSourceIds, identityLocators: link.identityLocators, powertrain: link.powertrainIdentity }) };
  });
  const subjects = [...observationSubjects, ...trimSubjects].sort((a, b) => `${a.subjectType}|${a.subjectId}`.localeCompare(`${b.subjectType}|${b.subjectId}`));
  const manifestId = `EE-OAM-${sha("EE-PILOT-002|EE-PILOT-002-BATCH-002|EE-PILOT-002-BATCH-002-R1|51").slice(0, 20).toUpperCase()}`;
  const core = { manifestId, pilotId: "EE-PILOT-002" as const, batchId: "EE-PILOT-002-BATCH-002" as const, correctionCycle: "EE-PILOT-002-BATCH-002-R1" as const,
    catalogRelease: "v0.55.2" as const, catalogFingerprint: CATALOG_HASH as `sha256:${string}`, r1Checksum: R1_HASH as `sha256:${string}`, subjectCount: 51 as const, observationCount: 49 as const, trimLinkCount: 2 as const,
    canonicalSerializationVersion: "CANONICAL_JSON_SORTED_KEYS_V1" as const, generatedAt: GENERATED, ownerActorId: "EQUIPMENT_OWNER_001" as const, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" as const,
    subjects, provenanceAppendix: { correctionTransitionIds: transitions.map((item: Record<string, unknown>) => item.transitionId).sort(), historicalAssertionIds: transitions.map((item: Record<string, unknown>) => item.fromAssertionId).sort(), inconclusiveLedgerRowCount: 53 as const, collectorLifecycleEventCount: 196 as const, independentReviewEventCount: 98 as const } };
  const manifest: EquipmentAssociationOwnerApprovalManifest = { ...core, manifestChecksum: associationApprovalManifestChecksum(core) };
  const passedKeys = new Set([...reviewEvents.filter((item: Record<string, unknown>) => item.subjectType === "ASSOCIATION_OBSERVATION" && item.newStatus === "SECOND_REVIEW_PASSED").map((item: Record<string, unknown>) => `ASSOCIATION_OBSERVATION:${item.subjectId}`), ...trimReviewEvents.filter((item: Record<string, unknown>) => item.subjectType === "TRIM_LINK" && item.toState === "SECOND_REVIEW_PASSED").map((item: Record<string, unknown>) => `TRIM_LINK:${item.subjectId}`)] as string[]);
  const issues = validateAssociationApprovalManifest({ manifest, passedSubjectKeys: passedKeys, ownerActorValid: true, expectedCatalogFingerprint: CATALOG_HASH, expectedR1Checksum: R1_HASH });
  if (issues.length) throw new Error(`MANIFEST_INVALID:${issues.join(",")}`);
  const out = path.join(ROOT, "data/production/equipment-evidence/governance/approval-manifests", manifestId);
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "approval-manifest.json"), json(manifest));
  const byVariant = new Map<string, typeof observationSubjects>();
  for (const item of observationSubjects) byVariant.set(item.exactVariantId, [...(byVariant.get(item.exactVariantId) ?? []), item]);
  const labels = new Map(activeRelease.featureDefinitions.map((item: { featureCode: string; labelTr: string }) => [item.featureCode, item.labelTr]));
  const section = (id: string, title: string, inconclusive: number) => { const items = (byVariant.get(id) ?? []).sort((a: { featureCode: string }, b: { featureCode: string }) => a.featureCode.localeCompare(b.featureCode)); return `## ${title}\n\n- Observation: ${items.length}\n- İnconclusive feature: ${inconclusive}\n- Kaynak: SRC-000087\n- Provision: **UNRESOLVED**\n- Confirmation: **REQUIRED**\n\n${items.map((item: { featureCode: string }) => `- ${labels.get(item.featureCode) ?? item.featureCode} (\`${item.featureCode}\`)`).join("\n")}\n`; };
  const semantic = `Owner’ın onayladığı şey: Resmî Türkiye kaynağında ilgili feature’a eşlenen ifade, ilgili exact Tonale trim bölümünde listelenmektedir.\n\nOwner; özelliğin kesin olarak araçta olduğunu, standart/fiyata dahil/opsiyonel/paket kapsamında veya stok araçta bulunduğunu, kullanıcıya confirmed fact olarak sunulabileceğini ya da filtreleme/sıralama yetkisi verdiğini onaylamaz.`;
  await writeFile(path.join(out, "owner-review.md"), `# Batch 002 owner review\n\nManifest: \`${manifest.manifestId}\`  \nChecksum: \`${manifest.manifestChecksum}\`\n\n${semantic}\n\n${section("54bbe431-a3c2-56d0-8177-cefdf0330bcb", "Tonale Diesel Ti", 29)}\n${section("f12f742b-111c-54de-a006-61361fb1ae04", "Tonale Hybrid Speciale", 24)}\n`);
  const plan = { status: "PLANNED_NOT_MATERIALIZED", requiresOwnerApproval: true, targetRecords: { reviewedEquipmentAssociation: 49, verifiedTrimLink: 2 },
    currentReleasePreserved: { verifiedAvailabilityAssertions: 47, verifiedTrimLinks: 2, coveredByVerifiedAssertionVariants: 2 },
    futureReleaseProjection: { verifiedAvailabilityAssertions: 47, juniorVerifiedTrimLinks: 2, tonaleReviewedAssociations: 49, tonaleVerifiedTrimLinks: 2, associationCoveredVariants: 2, exactCatalogVariants: 566 },
    invariants: ["ASSOCIATION_IS_NOT_VERIFIED_EQUIPMENT_ASSERTION", "NO_PRODUCTION_PROJECTION", "NO_AVAILABILITY_OR_PROVISION_CLAIM", "NO_CANDIDATE_EFFECT", "NO_CONFIRMED_USER_FACING_FACT", "SHADOW_AND_EXPLANATION_DISABLED"] };
  await writeFile(path.join(out, "materialization-plan.json"), json(plan));
  const approvalText = `EQUIPMENT_OWNER_001 olarak ${manifest.manifestId} kimlikli ve\n${manifest.manifestChecksum} checksum’lı Batch 002 approval manifestini inceledim.\nManifestteki 49 reviewed exact-trim association observation ve 2 verified\ntrim link için owner approval verilmesini ve projection dışı production\nmaterialization kayıtlarının hazırlanmasını onaylıyorum. Bu onayın özelliklerin\nSTANDARD, OPTIONAL, PACKAGE_DEPENDENT veya NOT_AVAILABLE olduğunu\nkanıtlamadığını; bu kayıtların filtreleme, sıralama, soru üretme ya da\nkullanıcıya confirmed equipment fact sunma yetkisi vermediğini kabul\nediyorum.\n`;
  await writeFile(path.join(out, "owner-approval-text.txt"), approvalText);
  await writeFile(path.join(out, "preparation-result.json"), json({ status: "OWNER_REVIEW_READY", manifestId, manifestChecksum: manifest.manifestChecksum, subjectCount: 51, observationCount: 49, trimLinkCount: 2,
    excludedSubjectCounts: { correctionTransitions: 49, historicalConflictAssertions: 49, inconclusiveLedgerRows: 53, collectorLifecycleEvents: 196, independentReviewEvents: 98 }, ownerApprovalEventsCreated: 0, materializationsCreated: 0, productionReleaseCreated: false, activePointerChanged: false, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" }));
  const names = ["approval-manifest.json", "owner-review.md", "materialization-plan.json", "owner-approval-text.txt", "preparation-result.json"];
  const checksums = Object.fromEntries(await Promise.all(names.sort().map(async (name) => [name, `sha256:${sha(await readFile(path.join(out, name), "utf8"))}`])));
  await writeFile(path.join(out, "checksums.json"), json(checksums));
  console.log(JSON.stringify({ manifestId, manifestChecksum: manifest.manifestChecksum, observations: 49, trimLinks: 2, ownerApprovalEvents: 0, output: path.relative(ROOT, out) }, null, 2));
}

void main();
