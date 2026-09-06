# Expiya Architecture v0.1

## Vehicle Evidence Runtime Identity & Resolution Boundary

Status: **APPROVED — Product Requirement-to-Evidence Policy is the next gate; direct integration remains blocked**  
Date: 2026-08-14  
Scope: Cars MVP runtime consumption of the versioned Vehicle Evidence dataset  
Supersedes: the prepared wording in this document; D1 is preserved and D2–D5 are completed below

## 1. Context and verified baseline

The Vehicle Evidence dataset is structurally runtime-consumable and the decision/sufficiency runtime already has a fail-closed evidence-linkage skeleton. These systems do not yet share an activated authoritative identity or retrieval contract.

The current implementation has three different identities:

| Boundary | Current identity | Current meaning |
|---|---|---|
| Decision context and evidence linkage | `optionId` / `Car.id` | Runtime candidate selected or ranked |
| Production catalog | `TurkeyVehicleVariant.id` / `vehicle_variants.id` UUID | Catalog vehicle-variant row |
| Vehicle Evidence release | `configuration_id` (`CFG-*`) | Immutable market configuration in that evidence release |

The production adapter currently assigns `Car.id = vehicle_variants.id`. The current evidence builder derives assertions from flattened `Car` fields and labels them authoritative. Neither behavior is the target Vehicle Evidence integration.

Verification established: dataset v0.4.0 and its validator pass; D1 is repository-compatible; D2–D5 required the closures recorded here. The eight-row analysis crosswalk produced two `VERIFIED_ONE_TO_ONE`, five `UNMAPPED`, one `INELIGIBLE`, and zero `AMBIGUOUS` results. Those rows are evidence for explicit mapping and fail-closed partial coverage; they are not an activated mapping release.

## 2. Decisions

### D1 — Canonical runtime candidate identity (preserved)

`RuntimeVehicleCandidateId` is an opaque, stable, runtime-registry-owned identifier for exactly one market-selectable vehicle configuration. Decision-domain `optionId` carries this identifier.

- It is independent from both `TurkeyVehicleVariant.id` and Vehicle Evidence `configuration_id`.
- Neither external identifier is implicitly substituted for, or used to derive, this ID.
- Catalog and evidence identities are reached only through a verified mapping pinned to the active runtime artifact release.
- The current `Car.id` field need not be deleted immediately, but at the target boundary it carries `RuntimeVehicleCandidateId`; the present `Car.id = vehicle_variants.id` behavior is legacy adaptation.

### D2 — Runtime identity mapping authority and lifecycle (closure)

#### Authority and artifact

Three authorities remain separate:

| Authority | Owns | Does not own |
|---|---|---|
| Vehicle Catalog Authority | Catalog release, variant identity, discovery/presentation descriptors | Evidence facts or cross-system equivalence |
| Vehicle Evidence Authority | Dataset release, subject graph, facts, equipment, assertions and provenance | Catalog identity or cross-system equivalence |
| Runtime Identity Mapping Authority | Reviewed assertion that one catalog variant and one evidence configuration represent the same runtime candidate | Technical vehicle facts or either source identity |

The Runtime Identity Mapping Authority publishes an immutable, independently versioned and hashed `VehicleCandidateIdentityMap` release. The name is conceptual; this clarification does not freeze a filename or storage schema. It is the sole authority over cross-system equivalence and is an input to, not a substitute for, both source authorities.

Each release preserves, for every considered mapping record:

```text
runtime_vehicle_candidate_id
vehicle_variant_id
configuration_id?                 # absent for non-mapped outcomes
mapping_status                    # VERIFIED_ONE_TO_ONE | UNMAPPED | AMBIGUOUS | INELIGIBLE | SUPERSEDED
catalog_revision
vehicle_evidence_dataset_version
vehicle_evidence_release_hash
mapping_version
mapping_basis
reason_code / review_reference
generated_at
supersedes_runtime_vehicle_candidate_id?
```

The release manifest additionally carries its `mapping_hash`, the pinned catalog hash when the catalog authority provides one, approver/review references, validator identity/status, and release activation eligibility. Timestamps are audit metadata and do not decide identity.

#### Creation and allowed bases

The mapping authority allocates a new opaque `RuntimeVehicleCandidateId` only after a proposed pairing passes controlled reconciliation and explicit review. Allowed mapping bases are:

- exact official configuration identity shared through authoritative external identifiers;
- an explicit catalog external identifier that resolves exactly to the evidence configuration; or
- a reviewed deterministic crosswalk using exact market, model year, trim/configuration and powertrain identity with recorded first-party provenance.

Offline tooling may use heuristics to propose candidates, but a proposal remains non-authoritative until explicit verification. Runtime LLM guesses, fuzzy model/trim matching, approximate trim matching, implicit brand/model/year joins, and display-name normalization joins are forbidden.

#### Stability, change and supersession

An approved ID remains stable when the same continuing catalog variant and evidence configuration are republished across compatible pinned releases. Version drift alone does not create a new ID.

A new ID is required when either external identity changes materially, or when the candidate is split or merged. Rebinding an existing ID to another variant or configuration is forbidden. The old record becomes `SUPERSEDED`, retains history for replay/audit, and points to the successor where one exists. Merge and split proposals fail activation pending explicit review; no mapping is inferred.

Mappings are append-only at publication authority: an activated mapping cannot be physically deleted. It may be superseded or made inactive in a later release with a reason. Erroneous unpublished drafts may be discarded under the mapping workflow, but they have no runtime authority.

#### Drift rules

- **Status drift:** if either source identity becomes provisional, revoked, inactive, unsupported-market, invalid through its ancestor graph, or otherwise ineligible, the next mapping release marks it `INELIGIBLE` or `SUPERSEDED`; an artifact generator must not carry it forward as active.
- **Catalog drift:** every mapping release is validated against the pinned catalog revision/hash. Missing variants, incompatible status/market/model year, or changed identity semantics are stale/orphan errors and block that record from activation.
- **Dataset drift:** every mapping release is validated against the pinned dataset version and release hash. Missing configurations, non-`VERIFIED` configurations, broken ancestors, or incompatible market/model year are stale/orphan errors and block that record from activation.
- A mapping release cannot be reused with different catalog or dataset pins merely because identifiers still exist. It must be regenerated/reviewed as a new immutable mapping release; stable IDs may be retained under the rule above.

#### Activation invariants and states

Within one active runtime artifact:

```text
each active RuntimeVehicleCandidateId -> exactly one eligible TurkeyVehicleVariant.id
each active RuntimeVehicleCandidateId -> exactly one VERIFIED, eligible configuration_id
each mapped TurkeyVehicleVariant.id    -> at most one active RuntimeVehicleCandidateId
each mapped configuration_id           -> at most one active RuntimeVehicleCandidateId
```

The mapping validator rejects duplicates on all three identities, missing or multiple matches, market/model-year incompatibility, invalid dates, broken ancestors, stale/revoked records, and orphans against either pinned input. Silent many-to-one and one-to-many relationships are forbidden. A future need for either is a separate architectural decision.

`UNMAPPED` is a first-class reviewed result: an unmapped catalog candidate does not enter the evidence-backed active runtime universe, and an unmapped evidence configuration is unreachable through that universe. `INELIGIBLE` is distinct and retains a reason such as provisional configuration, invalid ancestor, catalog status, unsupported market, or release incompatibility. `AMBIGUOUS` is also explicit and never activates.

Every mapping release reports: catalog candidates considered, eligible evidence configurations considered, `VERIFIED_ONE_TO_ONE`, `UNMAPPED`, `AMBIGUOUS`, and `INELIGIBLE`. Coverage is an operational metric, not a runtime inference rule. Global `UNMAPPED = 0` is not required. `AMBIGUOUS = 0` is required for activation, and the active candidate universe is exactly the validated eligible `VERIFIED_ONE_TO_ONE` set.

The mapping release is reviewed and approved by the Runtime Identity Mapping Authority after mapping-validator PASS. The activation unit is not the mapping release alone; it is the complete Runtime Vehicle Evidence Artifact Release in D4.

### D3 — Declared subject resolution and no-inheritance rules (closure)

The subject graph is an identity graph:

```text
CONFIGURATION -> configuration_id
POWERTRAIN    -> configuration.powertrain_id
GENERATION    -> configuration.generation_id
MODEL         -> generation.model_id
```

It is not an automatic evidence fallback chain. There is no generic “configuration missing, then try powertrain, generation, model” behavior.

For each requested `fact_key`, the resolver:

1. reads the pinned approved Data Dictionary/resolution metadata;
2. determines the allowed subject scope;
3. traverses only the selected configuration's exact declared parent graph;
4. considers only the declared scope;
5. applies market, model-year and effective validity;
6. applies assertion applicability and verification eligibility;
7. preserves evidence state;
8. detects multiple conflicting effective values; and
9. returns an explicit result.

The current Data Dictionary has one `scope` per field. Therefore v0.1 runtime supports only semantics expressible by one pinned declared scope. A fact requiring multi-scope precedence, fallback or override is an unsupported fact key and causes runtime artifact generation to fail if configured as supported. Extending the Data Contract and its resolution metadata is a separate dependency; the resolver must not invent that behavior.

**Equipment is configuration-scoped.** Equipment never inherits across configurations, trims, powertrains, generations, or models. A missing equipment row cannot be filled from another trim. A future explicit equipment/trim-inheritance contract requires separate data-contract authority and approval.

After scope, identity, market, validity and applicability filtering, if more than one effective value remains for the requested fact, the result is `CONFLICT`. The resolver must not choose first/latest/highest-authority, average values, or ask an LLM to decide. Conflict propagates upward.

At architecture level, each resolution preserves at least:

```text
runtime_vehicle_candidate_id
configuration_id
fact_key
resolution_status
resolved_subject_type / resolved_subject_id
resolution_path
evidence_state
value or range
assertion_ids / source_ids
applicability
dataset release identity
limitations or conflict metadata
```

This is a conceptual result contract, not a frozen TypeScript type.

### D4 — Deterministic artifact, authority, pinning and activation (closure)

The `Runtime Vehicle Evidence Artifact Release` is a deterministic derived artifact. It is authoritative only for pinned runtime reads; it is not an authoring or source authority.

Its four authoritative inputs are:

1. an approved Vehicle Catalog release/revision;
2. an approved immutable Vehicle Evidence release;
3. an approved Runtime Identity Mapping release; and
4. a supported approved Data Dictionary/resolution revision.

Minimum manifest metadata is:

```text
runtime_artifact_version / runtime_artifact_hash
vehicle_catalog_revision / vehicle_catalog_hash?   # hash required when catalog authority supplies one
vehicle_evidence_dataset_version
vehicle_evidence_schema_version
vehicle_evidence_release_hash
mapping_version / mapping_hash
data_dictionary_revision / data_dictionary_hash
generated_at / generator_version
evidence_validator_version / evidence_validator_status
mapping_validator_version / mapping_validator_status
```

Every artifact must be reproducible from these pinned inputs. Before publication and activation, all of these gates must pass: Vehicle Evidence validator `PASS`; mapping validator `PASS`; mapping ambiguity `0`; referential integrity `PASS`; supported schema `PASS`; supported dictionary revision `PASS`; and generated content hash verification `PASS`. Unsupported configured resolution semantics also fail generation. Any failed gate means `DO NOT ACTIVATE`.

Activation is atomic and its unit is exactly one validated Runtime Vehicle Evidence Artifact Release. Dataset, catalog, mapping and dictionary pins activate together. Mixed combinations such as new dataset/old mapping, old dataset/new mapping, or new mapping/incompatible dictionary are invalid. Runtime requests pin the active artifact at request start. Failed publication or activation leaves the previous valid artifact active; rollback atomically points to a previously validated immutable artifact. No component activates partially.

#### Legacy field authority and phased migration

There is no double authority for a runtime semantic:

| Category | Authority during transition |
|---|---|
| Runtime identity | Runtime Identity Mapping Authority via `RuntimeVehicleCandidateId` |
| Catalog discovery/presentation descriptors (`brand`, `model`, `year`, and display forms of `fuel`, `transmission`, `bodyType`) | Pinned Vehicle Catalog |
| Evidence-backed decision facts and provenance | Pinned Vehicle Evidence artifact, but only after explicit category migration |

Before a governed fact category is explicitly migrated, the existing legacy provider remains authoritative for that legacy governed category and its values are not represented as verified Vehicle Evidence. After migration, `VehicleEvidenceReadPort` is the sole evidence source for that category. The provider composition in D5 owns this category partition; a category cannot be active in both partitions.

If a catalog display field disagrees with a corresponding Vehicle Evidence fact, the artifact preserves both lineages, records an integrity conflict, keeps the catalog value only for display/discovery, and forbids it as decision evidence. For a migrated required category the conflict fails closed; the generator must not silently overwrite or choose either value. Whether a specific fact is required remains existing sufficiency/Product authority, not this clarification.

#### Controlled deployment authority

For bootstrap/MVP, the approved production delivery mechanism is a **Git-tracked immutable generated runtime artifact plus its manifest/hash, verified during build**. Only the compact generated runtime artifact required by the port is tracked as production input; the 183 MB authoring/working/snapshot tree is not thereby made a runtime dependency. Repository inspection shows the v0.4.0 release tables/workbook are small enough to support this minimum-complexity choice, while source snapshots dominate total size.

Production runtime may consume only an artifact delivered through this approved, reproducible, integrity-checked path. Desktop files, ChatGPT downloads, working workbooks, and Git-untracked local files have no production authority. Changing later to Git LFS, CI generation from controlled releases, or controlled artifact storage is an operational architecture amendment and must preserve the same pins, hashes, gates and atomicity.

`source_snapshots` support provenance and audit only. They are not request-time inputs. The generated artifact contains the resolved provenance references required by the read port; runtime performs no web fetch or snapshot parsing.

### D5 — One read boundary and provider composition (closure)

The decision runtime reads Vehicle Evidence only through one read-only `VehicleEvidenceReadPort`. It never directly reads XLSX, CSV, source snapshots, mapping files, release tables, or web sources.

Allowed responsibilities are: resolve active runtime candidate mapping; return configuration identity; retrieve declared-scope facts and configuration equipment; return evidence state, applicability, provenance, conflicts/limitations; and expose the active artifact identity/version.

Forbidden responsibilities are: requirement interpretation, Product materiality, evidence sufficiency policy, suitability scoring, ranking, recommendation, LLM reasoning, web fetching/source re-verification, mapping generation, or provenance manufacture.

The chosen repository relationship is **phased provider composition**:

```text
VehicleEvidenceReadPort
  -> upstream source for explicitly migrated fact categories
Legacy catalog-derived source
  -> upstream source only for not-yet-migrated legacy governed categories
buildCarsRuntimeEvidenceDependencies
  -> owns the explicit, disjoint category migration manifest
  -> adapts the selected upstream result into existing CarsDomainEvidenceLinkageInput
existing validation -> sufficiency assessment -> fail-closed authorization
```

This preserves the downstream governed provider boundary and supports incremental migration without parallel authority. The current synthetic `Car` source must not produce assertions for a migrated category. The read port never becomes a competing provider beside it.

Type B remains exact and deterministic:

```text
user/catalog option
-> existing catalog identity
-> approved RuntimeVehicleCandidateId mapping
-> exact runtime candidate
```

`candidateOptionIds` and `optionId` continue to require exact equality after adaptation. If the catalog option has no active verified mapping, Type B fails closed. There is no fuzzy fallback and this clarification does not change Product Type B semantics.

## 3. Consolidated boundary invariants

1. One active decision option has exactly one canonical runtime candidate ID.
2. Cross-system identity comes only from the approved mapping release pinned to the active artifact.
3. The active candidate universe is exactly the eligible validated mapping set; unmapped and ineligible rows are excluded, not guessed.
4. The subject graph expresses identity, not fallback; facts use only declared resolution semantics.
5. Equipment is configuration-scoped and never inherited.
6. Every `AVAILABLE` migrated assertion has real evidence lineage and a pinned artifact revision.
7. Missing identity, unsupported scope, applicability failure, provenance failure, or conflict never degrades to guessed evidence.
8. One category has one evidence authority during migration.
9. One request observes one immutable artifact release.
10. Replaying candidate IDs, fact keys, `asOf`, and artifact reference yields the same resolution result.

## 4. Failure contract

| Condition | Boundary outcome | Runtime consequence |
|---|---|---|
| Mapping missing, non-verified, ambiguous or ineligible | `IDENTITY_UNRESOLVED` | Candidate is outside evidence-backed active universe; fail closed |
| Subject graph broken or unsupported scope semantics | `SUBJECT_SCOPE_UNRESOLVED` / `REQUIREMENT_UNSUPPORTED` | Affected fact unavailable; configured unsupported fact blocks generation |
| Fact absent or inapplicable | `MISSING` | Existing sufficiency policy decides |
| Multiple effective values remain | `CONFLICT` | Propagate; never select arbitrarily |
| Artifact invalid or snapshot unavailable | `SNAPSHOT_UNAVAILABLE` | Entire evidence dependency unavailable; previous artifact remains active on activation failure |
| Catalog/evidence display disagreement | `INTEGRITY_CONFLICT` | Catalog display may remain; migrated decision evidence fails closed |

Operational faults may throw internally, but adapters translate them at the runtime composition boundary to the existing unavailable/fail-closed path and emit diagnostics without leaking source content.

## 5. Ownership

| Concern | Owner |
|---|---|
| Candidate selection and `optionId` use | Decision runtime |
| Catalog release, identity and presentation data | Vehicle Catalog Authority |
| Evidence graph, facts, assertions and provenance | Vehicle Evidence Authority |
| Runtime IDs, equivalence review and mapping publication | Runtime Identity Mapping Authority |
| Artifact generation, build verification, activation and rollback | Vehicle Evidence publication/deployment pipeline |
| Migrated-versus-legacy provider partition and linkage adaptation | Existing governed runtime evidence provider boundary |
| Requirement criticality and decision authorization | Sufficiency/decision runtime (outside this clarification) |

## 6. Pilot crosswalk interpretation

The previous eight-row crosswalk is retained by reference to the verification report. Only Hyundai IONIQ 9 Progressive and Renault Captur techno were exact `VERIFIED_ONE_TO_ONE` pairings. The five `UNMAPPED` and one `INELIGIBLE` results must remain explicit; they must not be forced into mappings.

This pilot validates partial-coverage semantics but is not a production mapping release. A mapping release may activate with global unmapped rows, provided the active universe contains only verified eligible one-to-one rows and has zero ambiguity. Any governance requirement for a diverse 5–8-row verified pilot remains an approval/evidence gate, not a reason to weaken identity rules.

## 7. D2–D5 closure matrix

| Decision | Previous blocker | Clarification added | Remaining issue | Closure |
|---|---|---|---|---|
| D2 | Mapping owner/release, reverse uniqueness, drift, status and activation lifecycle incomplete | Dedicated mapping authority/artifact; allowed bases; stable-ID and supersession rules; drift validation; first-class states; one-to-one invariants; coverage and review contract | Approved mapping release and any required diverse pilot are execution/re-approval gates | CLOSED |
| D3 | Equipment no-inheritance and resolution semantics incomplete | Identity-graph-not-fallback rule; deterministic algorithm; single-scope fail-closed boundary; equipment invariant; explicit conflict/result contract | Future multi-scope or trim-inheritance needs separate Data Contract authority | CLOSED |
| D4 | Catalog/mapping/dictionary pins, atomic unit, legacy authority and deployment authority incomplete | Four pinned inputs; required hashes/metadata/gates; atomic activation; phased fact authority; conflict rule; Git-tracked bootstrap artifact | Artifact generation/tracking and gate execution are implementation/re-approval evidence, not missing architecture behavior | CLOSED |
| D5 | Read-port/provider relationship and Type B transition unclear | Sole read port; allowed/forbidden duties; explicit disjoint phased composition behind existing provider; exact Type B mapping/fail-closed path | Production adapter implementation remains blocked | CLOSED |

## 8. Integration sequence and gates (not authorized in this session)

1. Publish and approve a mapping release conforming to D2 and satisfy any independent pilot-diversity gate.
2. Generate the deterministic runtime artifact from all four pins; validate and place the immutable artifact/manifest under the approved Git-tracked delivery path.
3. Implement the read adapter and subject resolver behind `VehicleEvidenceReadPort`, with contract tests for no-inheritance, conflict, applicability, drift and snapshot pinning.
4. Introduce the explicit category migration manifest behind `buildCarsRuntimeEvidenceDependencies`; migrate categories one at a time without double authority.
5. Preserve exact Type B equality and run shadow/end-to-end fail-closed verification before any production activation.

No step above is implemented or authorized by this clarification.

## 9. Explicit non-decisions

This clarification does not define requirement-to-evidence mapping, Product materiality, evidence-state eligibility for recommendation, sufficiency thresholds, ranking, suitability, recommendation policy, or user-facing semantics. Product Requirement-to-Evidence work remains blocked. It also does not choose a long-term database, cache, transport or admin UI. No new ADR is required because all added decisions close the existing identity/resolution boundary.

## 10. Approval status

Architecture clarification status is **APPROVED** following independent final re-approval / consistency verification. D1 is preserved and D2–D5 have deterministic behavior. Product Requirement-to-Evidence Policy is the next gate; direct production integration remains blocked.

The approved mapping release, mapping-validator PASS, any required pilot evidence under repository governance, generated artifact manifest/hash verification, and establishment of the Git-tracked controlled delivery path remain Development contract and activation evidence. They do not weaken or replace the approved architecture contract. The current untracked local files are not production authority.
