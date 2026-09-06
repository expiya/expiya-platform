import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { rankWithBoundedSoftSignals, type XpyCandidateSoftSignal } from "@/features/xpy/boundedSoftRanking";
import {
  PERSONA_PROJECTION_CANDIDATE_SCHEMA,
  validatePersonaProjectionCandidate,
  type PersonaProjectionCandidate,
} from "@/features/persona/projectionCandidate";

const root = process.cwd();
const releaseId = "XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review";
const workUnitId = "WU-XPY-UNIVERSAL-PERSONA-PROJECTION-MATERIALIZATION-01";
const generatedAt = "2026-09-06T00:00:00.000Z";
const approvedPackageDigest = "sha256:85bb241c57b995c95b7118b022c2272cf541a189c7c6f451839e7d7a7ba67610";
const sharedRankingCommit = "1733879262dbd99bfcd137e60057cde308d0f05a";
const sourceDirectory = path.join(
  root,
  "data/production/personas/universal/evidence-class-admission/XPY-PERSONA-EVIDENCE-CLASS-ADMISSION-01",
);
const foundationDirectory = path.join(
  root,
  "data/production/personas/universal/release-candidates/XPY-UNIVERSAL-PERSONA-AUTHORITY-TR-v0.1-owner-review-candidate",
);
const outputDirectory = path.join(root, "data/production/personas/universal/projection-materialization", releaseId);

const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const digest = (value: string | unknown) =>
  `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex")}`;
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8"));
const fileDigest = async (file: string) => digest(await readFile(file, "utf8"));

type InventoryRow = {
  exactProductId: string;
  departmentId: "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD";
  categoryId: string;
  brand: string;
  model: string;
  configurationIdentity: string;
  sourceArtifact: string;
};
type Projection = {
  exactProductId: string;
  status: "GOVERNED_INHERITED" | "PERSONA_EVIDENCE_UNKNOWN" | "CONFLICTED";
  traits: Array<{
    trait: string;
    status: string;
    contribution: number;
    inheritedFrom?: { assertionId: string; assertionScope: string; scopeKey: string; identityBridge: string };
    sourceIds: string[];
    evidenceClass?: string;
    sourceLineageIds?: string[];
    market?: string;
    confidence?: string;
    limitations?: string[];
  }>;
  score: number;
  membershipEffect: "NONE";
  selectionAuthority: "NONE";
  evidenceClasses: string[];
};
type OwnerReviewPackage = {
  payloadDigest: string;
  projections: Projection[];
  assertions: Array<{ assertionId: string; evidenceClass: string; sourceLineageIds: string[] }>;
};
type ApprovalEvent = {
  eventId: string;
  approvedPayloadDigest: string;
  rankingActivationAuthorized: boolean;
  catalogMembershipMutationAuthorized: boolean;
  domainPackBindingAuthorized: boolean;
  deploymentAuthorized: boolean;
};
type FoundationManifest = { inventoryArtifacts: Array<{ file: string; sha256: string }> };
type VocabularyAuthority = {
  vocabulary: Array<{ trait: string; meaning: string; turkishExpressions: string[]; aliases: string[] }>;
};

function pointerFor(row: InventoryRow): string {
  if (row.departmentId === "ELECTRONICS") return "data/production/electronics/runtime/active.json";
  if (row.departmentId === "BABY_AND_CHILD") return "data/production/baby/strollers/active.json";
  return row.sourceArtifact.replace(/\/releases\/.*$/u, "/active.json");
}

async function main() {
  const [ownerReview, approvalEvent, inventory, foundationManifest, vocabulary, evidencePolicy] = await Promise.all([
    readJson<OwnerReviewPackage>(path.join(sourceDirectory, "owner-review-package.json")),
    readJson<ApprovalEvent>(path.join(sourceDirectory, "owner-approval/owner-approval-event.json")),
    readJson<InventoryRow[]>(path.join(foundationDirectory, "inventory.json")),
    readJson<FoundationManifest>(path.join(foundationDirectory, "manifest.json")),
    readJson<VocabularyAuthority>(path.join(foundationDirectory, "persona-authority.json")),
    readJson<unknown>(path.join(sourceDirectory, "evidence-class-policy.json")),
  ]);
  if (
    ownerReview.payloadDigest !== approvedPackageDigest ||
    approvalEvent.approvedPayloadDigest !== approvedPackageDigest ||
    approvalEvent.rankingActivationAuthorized ||
    approvalEvent.catalogMembershipMutationAuthorized ||
    approvalEvent.domainPackBindingAuthorized ||
    approvalEvent.deploymentAuthorized
  ) {
    throw new Error("APPROVED_SHADOW_AUTHORITY_BOUNDARY_INVALID");
  }
  if (inventory.length !== 169 || ownerReview.projections.length !== 169) throw new Error("NO_SILENT_DROP");

  const artifactDigestByFile = new Map(
    foundationManifest.inventoryArtifacts.map((item: { file: string; sha256: string }) => [item.file, item.sha256]),
  );
  for (const file of new Set(inventory.map((row) => row.sourceArtifact))) {
    if ((await fileDigest(path.join(root, file))) !== artifactDigestByFile.get(file)) throw new Error(`DOMAIN_PACK_DIGEST_MISMATCH:${file}`);
  }

  const projectionById = new Map<string, Projection>(
    ownerReview.projections.map((projection: Projection) => [projection.exactProductId, projection]),
  );
  const assertionById = new Map<string, { evidenceClass: string; sourceLineageIds: string[] }>(
    ownerReview.assertions.map((assertion: { assertionId: string; evidenceClass: string; sourceLineageIds: string[] }) => [
      assertion.assertionId,
      assertion,
    ]),
  );
  const records = inventory
    .map((identity) => {
      const projection = projectionById.get(identity.exactProductId);
      if (!projection) throw new Error(`PROJECTION_MISSING:${identity.exactProductId}`);
      return {
        ...identity,
        ...projection,
        traits: projection.traits.map((trait) => {
          const assertion = trait.inheritedFrom ? assertionById.get(trait.inheritedFrom.assertionId) : undefined;
          return {
            ...trait,
            evidenceClass: assertion?.evidenceClass,
            sourceLineageIds: assertion?.sourceLineageIds ?? [],
          };
        }),
      };
    })
    .sort((left, right) => left.exactProductId.localeCompare(right.exactProductId));

  const categoryGroups = Object.values(Object.groupBy(records, (row) => `${row.departmentId}:${row.categoryId}`));
  const categoryBindings = await Promise.all(
    categoryGroups.map(async (group) => {
      const rows = group!;
      const sourceArtifact = rows[0]!.sourceArtifact;
      const projected = rows.filter((row) => row.status === "GOVERNED_INHERITED");
      return {
        departmentId: rows[0]!.departmentId,
        categoryId: rows[0]!.categoryId,
        sourceDomainPack: { file: sourceArtifact, sha256: await fileDigest(path.join(root, sourceArtifact)) },
        exactProductIds: rows.map((row) => row.exactProductId).sort(),
        projectedProductIds: projected.map((row) => row.exactProductId).sort(),
        mappedTraits: [...new Set(projected.flatMap((row) => row.traits.map((trait) => trait.trait)))].sort(),
        status:
          projected.length > 0
            ? ("INACTIVE_CANDIDATE_USABLE_MAPPING" as const)
            : ("INACTIVE_CANDIDATE_FAIL_CLOSED_NO_USABLE_PERSONA_MAPPING" as const),
        activationState: "NOT_ACTIVE" as const,
        unrelatedCategoryBlockingEffect: "NONE" as const,
      };
    }),
  );
  categoryBindings.sort(
    (left, right) => left.departmentId.localeCompare(right.departmentId) || left.categoryId.localeCompare(right.categoryId),
  );

  const candidate: PersonaProjectionCandidate & { readonly bindings: Record<string, unknown> } = {
    schemaVersion: PERSONA_PROJECTION_CANDIDATE_SCHEMA,
    releaseId,
    records,
    categoryBindings,
    bindings: {
      workUnitId,
      approvedEvidenceClassPackageDigest: approvedPackageDigest,
      ownerApprovalEventId: approvalEvent.eventId,
      sharedBoundedSoftRanking: {
        commit: sharedRankingCommit,
        module: "features/xpy/boundedSoftRanking.ts",
        decisionUse: "BOUNDED_SOFT_RANKING_ONLY",
      },
      carsV39: "EXCLUDED_BYTE_PRESERVED",
    },
    activation: {
      state: "OWNER_REVIEW_REQUIRED_NOT_ACTIVE",
      activePointerChanged: false,
      rankingChanged: false,
      catalogMembershipChanged: false,
    },
  };
  const validationIssues = validatePersonaProjectionCandidate(candidate);
  if (validationIssues.length) throw new Error(validationIssues.join("\n"));

  const mappings = vocabulary.vocabulary.map(
    (entry: { trait: string; meaning: string; turkishExpressions: string[]; aliases: string[] }) => ({
      ...entry,
      mappingStatus: records.some((record) => record.traits.some((trait) => trait.trait === entry.trait))
        ? "MAPPED_TO_GOVERNED_PROJECTION"
        : "VOCABULARY_ONLY_NO_CURRENT_QUALIFIED_PROJECTION",
      categories: categoryBindings.filter((binding) => binding.mappedTraits.includes(entry.trait)).map((binding) => binding.categoryId),
    }),
  );
  const mappingCoverage = {
    schemaVersion: "xpy-persona-turkish-expression-mapping/v1",
    vocabulary: mappings,
    totals: {
      traits: mappings.length,
      turkishExpressions: mappings.reduce((sum: number, item: { turkishExpressions: string[] }) => sum + item.turkishExpressions.length, 0),
      traitsWithQualifiedProjection: mappings.filter((item: { mappingStatus: string }) => item.mappingStatus === "MAPPED_TO_GOVERNED_PROJECTION").length,
      categoriesWithUsableMapping: categoryBindings.filter((binding) => binding.projectedProductIds.length > 0).length,
      categoriesFailClosedLocally: categoryBindings.filter((binding) => binding.projectedProductIds.length === 0).length,
    },
    interpretationBoundary: "EXACT_APPROVED_EXPRESSIONS_TO_TRAIT_ONLY_NO_FREE_TEXT_INFERENCE",
  };

  const coverage = {
    schemaVersion: "xpy-universal-persona-projection-coverage/v1",
    totals: {
      exactProducts: records.length,
      governed: records.filter((row) => row.status === "GOVERNED_INHERITED").length,
      unknown: records.filter((row) => row.status === "PERSONA_EVIDENCE_UNKNOWN").length,
      conflicted: records.filter((row) => row.status === "CONFLICTED").length,
      categories: categoryBindings.length,
    },
    byCategory: categoryBindings.map((binding) => {
      const rows = records.filter(
        (record) => record.departmentId === binding.departmentId && record.categoryId === binding.categoryId,
      );
      const projected = rows.filter((row) => row.status === "GOVERNED_INHERITED");
      return {
        departmentId: binding.departmentId,
        categoryId: binding.categoryId,
        total: rows.length,
        governed: projected.length,
        unknown: rows.filter((row) => row.status === "PERSONA_EVIDENCE_UNKNOWN").length,
        conflicted: rows.filter((row) => row.status === "CONFLICTED").length,
        evidenceClass: Object.fromEntries(
          ["INTENDED_POSITIONING", "EDITORIALLY_OBSERVED", "INDEPENDENTLY_CORROBORATED"].map((name) => [
            name,
            projected.filter((row) => row.evidenceClasses.includes(name)).length,
          ]),
        ),
        inheritanceScope: Object.fromEntries(
          ["BRAND_PERSONA", "PRODUCT_CLASS_PERSONA", "PRODUCT_FAMILY_PERSONA", "MODEL_PERSONA", "VARIANT_PERSONA"].map(
            (scope) => [
              scope,
              new Set(
                projected
                  .filter((row) => row.traits.some((trait) => trait.inheritedFrom?.assertionScope === scope))
                  .map((row) => row.exactProductId),
              ).size,
            ],
          ),
        ),
        mappingStatus: binding.status,
      };
    }),
  };

  const rankingAuthority = {
    authorityId: "universal-persona-projection-owner-review-candidate",
    version: releaseId,
    digest: approvedPackageDigest,
    decisionUse: "BOUNDED_SOFT_RANKING_ONLY" as const,
  };
  const traceCategories = [
    "LAPTOP",
    "SMARTPHONE",
    "WASHING_MACHINE",
    "REFRIGERATOR",
    "MANUAL_ESPRESSO_MACHINE",
    "HEADPHONES",
    "STROLLER",
  ];
  const shadowTraces = traceCategories.map((categoryId) => {
    const rows = records.filter((record) => record.categoryId === categoryId);
    const ids = rows.map((row) => row.exactProductId).sort();
    const signals: XpyCandidateSoftSignal[] = rows.flatMap((row) =>
      row.traits.map((trait) => ({
        exactCandidateId: row.exactProductId,
        preferenceKey: trait.trait,
        mappingRef: trait.inheritedFrom!.assertionId,
        evidenceRef: trait.sourceIds.join("+"),
        evidenceState: "KNOWN_MATCH" as const,
        contribution: trait.contribution,
        reasonCode: `PERSONA_${trait.trait}_${row.evidenceClasses.join("+")}`,
        authority: rankingAuthority,
      })),
    );
    const preferences = [...new Set(signals.map((signal) => signal.preferenceKey))].map((preferenceKey, index) => ({
      eventId: `shadow:${categoryId}:${index}`,
      preferenceKey,
      status: "ACTIVE" as const,
    }));
    const rank = (eligibleCandidateIds: string[], candidateSignals: XpyCandidateSoftSignal[]) =>
      rankWithBoundedSoftSignals({
        eligibleCandidateIds,
        preferences,
        signals: candidateSignals,
        scoreCap: 0.75,
        singleSelectionAuthorized: false,
      });
    const before = rank(ids, []);
    const after = rank(ids, signals);
    const reversed = rank([...ids].reverse(), [...signals].reverse());
    return {
      categoryId,
      before: before.orderedCandidateIds,
      shadowAfter: after.orderedCandidateIds,
      retainedCandidateIds: after.retainedCandidateIds,
      membershipIdentical: JSON.stringify(before.retainedCandidateIds) === JSON.stringify(after.retainedCandidateIds),
      orderingChanged: JSON.stringify(before.orderedCandidateIds) !== JSON.stringify(after.orderedCandidateIds),
      technicalEligibilityChanged: false,
      sufficiencyChanged: false,
      singleSelectionAuthorized: false,
      selectionOutcome: after.selectionOutcome,
      catalogOrderIndependent: after.deterministicFingerprint === reversed.deterministicFingerprint,
      traces: after.traces,
    };
  });

  const sony = records.find((record) => record.exactProductId === "electronics:headphones:sony:wh1000xm5b-ce7")!;
  const headphoneIds = records.filter((record) => record.categoryId === "HEADPHONES").map((record) => record.exactProductId);
  const sonySignal: XpyCandidateSoftSignal = {
    exactCandidateId: sony.exactProductId,
    preferenceKey: "DESIGN_LED",
    mappingRef: sony.traits[0]!.inheritedFrom!.assertionId,
    evidenceRef: sony.traits[0]!.sourceIds.join("+"),
    evidenceState: "KNOWN_MATCH",
    contribution: sony.traits[0]!.contribution,
    reasonCode: "PERSONA_DESIGN_LED_INDEPENDENTLY_CORROBORATED",
    authority: rankingAuthority,
  };
  const lifecycleRank = (preferences: Array<{ eventId: string; preferenceKey: string; status: "ACTIVE" | "SUPERSEDED" | "CLEARED" }>) =>
    rankWithBoundedSoftSignals({
      eligibleCandidateIds: headphoneIds,
      preferences,
      signals: [sonySignal],
      scoreCap: 0.75,
      singleSelectionAuthorized: false,
    });
  const active = lifecycleRank([{ eventId: "p1", preferenceKey: "DESIGN_LED", status: "ACTIVE" }]);
  const cleared = lifecycleRank([{ eventId: "p1", preferenceKey: "DESIGN_LED", status: "CLEARED" }]);
  const superseded = lifecycleRank([{ eventId: "p1", preferenceKey: "DESIGN_LED", status: "SUPERSEDED" }]);
  const corrected = lifecycleRank([
    { eventId: "p1", preferenceKey: "DESIGN_LED", status: "SUPERSEDED" },
    { eventId: "p2", preferenceKey: "PLAYFUL", status: "ACTIVE" },
  ]);
  const invariants = {
    schemaVersion: "xpy-persona-projection-invariant-proofs/v1",
    aggregateCap: Math.max(...records.map((record) => record.score)),
    noDoubleCounting: records.every(
      (record) =>
        new Set(record.traits.map((trait) => trait.trait)).size === record.traits.length &&
        new Set(record.traits.flatMap((trait) => trait.sourceLineageIds ?? [])).size ===
          record.traits.flatMap((trait) => trait.sourceLineageIds ?? []).length &&
        record.score === Math.min(0.75, record.traits.reduce((sum, trait) => sum + trait.contribution, 0)),
    ),
    conflictPrecedence: "CONFLICTED_EVIDENCE_IS_NEUTRAL_AND_OVERRIDES_POSITIVE_CONTRIBUTION",
    correctionRemovesPriorEffect: corrected.traces.every((trace) => trace.score === 0),
    clearRemovesEffect: cleared.traces.every((trace) => trace.score === 0),
    supersessionRemovesPriorEffect: superseded.traces.every((trace) => trace.score === 0),
    activePreferenceCanChangeOrderingOnly: active.traces.some((trace) => trace.score > 0),
    tiesRemainTies: cleared.selectionOutcome === "NON_DOMINATED_SET",
    unknownIsNeutral: records.filter((record) => record.status === "PERSONA_EVIDENCE_UNKNOWN").every((record) => record.score === 0),
    catalogOrderIndependent: shadowTraces.every((trace) => trace.catalogOrderIndependent),
    missingMappingFailsClosedLocally:
      categoryBindings.filter((binding) => binding.projectedProductIds.length === 0).length === 45 &&
      categoryBindings.filter((binding) => binding.projectedProductIds.length > 0).length === 4,
    futureCatalogReadinessGateMandatory: true,
    carsV39Changed: false,
    lifecycleEvidence: {
      active: active.orderedCandidateIds,
      cleared: cleared.orderedCandidateIds,
      superseded: superseded.orderedCandidateIds,
      corrected: corrected.orderedCandidateIds,
    },
  };

  const activePointers = [...new Set(inventory.map(pointerFor))].sort();
  const pointerSnapshot = {
    schemaVersion: "xpy-persona-projection-active-pointer-snapshot/v1",
    pointers: await Promise.all(activePointers.map(async (file) => ({ file, sha256: await fileDigest(path.join(root, file)) }))),
    mutations: [],
  };
  const carsV39Snapshot = {
    schemaVersion: "xpy-persona-projection-cars-v39-immutability/v1",
    excludedFromCandidate: true,
    files: await Promise.all(
      ["features/decision/v3/personaSoftRanking.ts", "data/production/personas/safe-traits/active.json"].map(async (file) => ({
        file,
        sha256: await fileDigest(path.join(root, file)),
      })),
    ),
    mutations: [],
  };
  const policyBinding = {
    schemaVersion: "xpy-persona-projection-policy-binding/v1",
    evidencePolicy,
    approvedPackageDigest,
    ownerApprovalEventId: approvalEvent.eventId,
    sharedBoundedSoftRankingCommit: sharedRankingCommit,
    activationAuthority: "NONE_CANDIDATE_ONLY",
  };

  const artifacts: Record<string, unknown> = {
    "projection-candidate.json": candidate,
    "category-coverage.json": coverage,
    "turkish-expression-mappings.json": mappingCoverage,
    "shadow-traces.json": shadowTraces,
    "invariant-proofs.json": invariants,
    "active-pointer-snapshot.json": pointerSnapshot,
    "cars-v39-immutability.json": carsV39Snapshot,
    "policy-binding.json": policyBinding,
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, digest(value)]));
  const manifestCore = {
    schemaVersion: "xpy-universal-persona-projection-manifest/v1",
    workUnitId,
    releaseId,
    generatedAt,
    lifecycle: "OWNER_REVIEW_CANDIDATE_NOT_ACTIVE",
    approvedEvidenceClassPackageDigest: approvedPackageDigest,
    ownerApprovalEventId: approvalEvent.eventId,
    sharedBoundedSoftRankingCommit: sharedRankingCommit,
    counts: coverage.totals,
    artifactDigests,
    activePointerChanged: false,
    rankingChanged: false,
    catalogMembershipChanged: false,
    deploymentPerformed: false,
  };
  const manifest = { ...manifestCore, packageDigest: digest(manifestCore) };
  const approvalRequest = {
    schemaVersion: "xpy-universal-persona-projection-approval-request/v1",
    state: "READY_FOR_OWNER_REVIEW_NOT_ACTIVE",
    releaseId,
    packageDigest: manifest.packageDigest,
    exactSentence: `I approve ${releaseId} at package digest ${manifest.packageDigest} for atomic inactive Domain Pack binding and bounded Persona ordering authority only; this approval does not authorize filtering, technical eligibility changes, standalone selection, Cars V3.9 changes, active-pointer mutation, deployment, or bypass of future catalog-readiness gates.`,
  };
  const atomicActivationPlan = {
    schemaVersion: "xpy-universal-persona-projection-atomic-activation-plan/v1",
    state: "BLOCKED_PENDING_EXPLICIT_DIGEST_BOUND_APPROVAL",
    preconditions: [
      "Approval statement and package digest match exactly.",
      "All source Domain Pack and active-pointer snapshot digests still match.",
      "Future catalog inventory is reconciled 1:1 before activation.",
      "Full validation and production build pass on the activation commit.",
    ],
    atomicSteps: [
      "Create one universal Persona active pointer bound to this immutable release.",
      "Switch only APPLIANCES, ELECTRONICS and BABY_AND_CHILD bounded-soft-ranking registrations from FAILED_CLOSED to the approved category-local bindings.",
      "Keep categories without usable mappings locally FAILED_CLOSED while unrelated mapped categories remain available.",
      "Verify all pre/post membership digests, Cars V3.9 hashes and active-pointer targets before commit.",
    ],
    rollback: "Restore the pre-activation pointers and Domain Pack registrations in one commit; retain immutable evidence, approval and audit artifacts.",
    deployRequiresSeparateAuthorization: true,
  };
  artifacts["manifest.json"] = manifest;
  artifacts["approval-request.json"] = approvalRequest;
  artifacts["atomic-activation-plan.json"] = atomicActivationPlan;

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(Object.entries(artifacts).map(([name, value]) => writeFile(path.join(outputDirectory, name), json(value))));
  console.log(json({ releaseId, packageDigest: manifest.packageDigest, counts: coverage.totals }));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
