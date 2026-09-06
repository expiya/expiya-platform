# Expiya Architecture v0.1

## Vehicle Evidence Runtime Identity & Resolution Boundary — Approval / Consistency Verification

Status: **ARCHITECTURE NOT APPROVED — direct integration remains blocked**  
Date: 2026-08-14  
Reviewed clarification: `docs/vehicle-evidence-runtime-identity-resolution-boundary-v0.1.md`  
Evidence release: Vehicle Evidence `0.4.0`, schema `0.1`

## A. Executive verdict

```text
ARCHITECTURE NOT APPROVED
```

D1–D5 are directionally consistent with the fail-closed runtime, but the prepared clarification is not approval-ready as a complete contract. D2 does not fully define release authority, production-catalog pinning, reverse uniqueness, or stale/orphan handling. D3 does not state the equipment no-inheritance invariant. D4 omits an explicit mapping hash and dictionary revision and does not name the production-catalog release pin needed by the crosswalk. D5 does not completely allocate authority for legacy `Car` fields during transition. The repository also has no authoritative mapping release, and the bounded crosswalk found only two exact VERIFIED pairings.

No production integration was implemented or activated.

## Verified baseline

- Manifest: dataset `0.4.0`, schema `0.1`, 55 models, 68 configurations, 48 VERIFIED, 20 PROVISIONAL.
- Re-run validator: `PASS`, 0 errors, 10 snapshot warnings, 1 informational finding.
- Release workbook SHA-256: `b3ee43a0e1245a2c3b0954c1698d0c2d424e2cc38861ffef4fb315b9c8bdcfeb`; it equals `manifest.json.master_sha256` and the expected gate hash.
- Deployment authority is not established: the Vehicle Evidence tree, release, and clarification are currently untracked in Git, and no LFS/CI-controlled delivery contract is present.

## Extracted D1–D5 decisions

### D1 — Canonical runtime candidate identity

- **Decision:** Adopt an opaque `RuntimeVehicleCandidateId` as the only identity accepted by decision context, recommendation scoping, and evidence linkage; `optionId` retains its field name but carries that type.
- **Scope:** One market-selectable vehicle configuration across decision, catalog, and evidence boundaries.
- **Owner:** Runtime candidate registry; decision runtime owns candidate selection and `optionId` use.
- **Invariant:** It is stable across evidence releases/storage migrations and is neither implicitly a database UUID nor a `CFG-*` ID.
- **Failure behavior:** No implicit ID substitution; unresolved identity fails closed through D2.
- **Dependency:** Registry and a verified cross-system mapping.

### D2 — Explicit, versioned identity mapping

- **Decision:** Introduce authoritative `RuntimeVehicleCandidateIdentity` records linking runtime candidate, vehicle variant, and evidence configuration IDs.
- **Scope:** Cross-system identity, market, release, lifecycle, validity, and provenance.
- **Owner:** Runtime candidate registry.
- **Invariant:** Only VERIFIED, currently valid, one-to-one mappings may enter the evidence-backed runtime; history remains queryable.
- **Failure behavior:** Missing, provisional, revoked, ambiguous, many-to-one, or conflicting mappings fail closed.
- **Dependency:** D1, evidence release identity, registry validation, and mapping provenance.

### D3 — Evidence subject-scope resolution

- **Decision:** Resolve through the declared configuration/generation/powertrain/model subject graph and dictionary scope, never string matching or copied `Car` values.
- **Scope:** Requested facts, exact foreign-key ancestry, market, model year/validity, applicability, verification, and conflict.
- **Owner:** Vehicle Evidence dataset for graph/assertions; vehicle-evidence runtime boundary for resolution.
- **Invariant:** An `AVAILABLE` value must be eligible at the dictionary-declared scope and exact subject path; no silent winner or generic fallback.
- **Failure behavior:** Broken scope becomes `SUBJECT_SCOPE_UNRESOLVED`; absent/inapplicable becomes `MISSING`; unresolved conflicts become `CONFLICT_UNRESOLVED`.
- **Dependency:** D2 mapping, Data Dictionary, validated immutable release, and explicit conflict rules.

### D4 — Generated runtime artifact authority and lifecycle

- **Decision:** Generate an immutable validated runtime artifact from release inputs, publish atomically, and pin one snapshot per request.
- **Scope:** Generation, validation, publication, activation, rollback, and request snapshot consistency.
- **Owner:** Vehicle Evidence publication pipeline.
- **Invariant:** Artifacts are derived and immutable; promotion only changes an activation pointer; one request never mixes revisions.
- **Failure behavior:** Invalid or unavailable artifacts return `SNAPSHOT_UNAVAILABLE`; invalid releases cannot activate.
- **Dependency:** Approved dataset release, identity mapping, generator/schema revisions, hashes, validation, and atomic activation.

### D5 — Runtime retrieval boundary

- **Decision:** Make `VehicleEvidenceReadPort` the decision runtime's sole read-only Vehicle Evidence boundary.
- **Scope:** Candidate resolution, evidence retrieval, typed lineage, availability/conflict/limitation propagation, and release identity.
- **Owner:** Vehicle-evidence boundary; the decision runtime is the consumer.
- **Invariant:** The runtime cannot read authoring files/tables, infer IDs, manufacture provenance, or embed product/recommendation policy in this port.
- **Failure behavior:** Expected data conditions return typed fail-closed outcomes; operational faults translate to the existing unavailable path with diagnostics.
- **Dependency:** D1–D4 and an adapter into existing linkage/sufficiency contracts.

## B. D1–D5 consistency matrix

| Decision | Internal Consistency | Repository Compatibility | Existing Contract Impact | Approval |
|---|---|---|---|---|
| D1 | PASS | PASS | Brand `Car.id`/`optionId` at the boundary; preserve exact equality after adaptation | APPROVE |
| D2 | FAIL | FAIL | Requires a registry/mapping artifact not present; release authority and lifecycle invariants are incomplete | BLOCK |
| D3 | FAIL | PASS | Replaces synthetic `Car` assertions; equipment no-inheritance is missing from the clarification | BLOCK |
| D4 | FAIL | FAIL | Requires a compiler/activation unit; metadata and deployment authority are incomplete | BLOCK |
| D5 | FAIL | PASS | Must replace the synthetic source behind the existing provider boundary and settle legacy-field authority | BLOCK |

## C. Canonical runtime identity

Approved wording for D1 only:

> `RuntimeVehicleCandidateId` is an opaque, stable, runtime-registry-owned identifier for exactly one market-selectable vehicle configuration. Decision-domain `optionId` carries this identifier. A `vehicle_variants.id` or Vehicle Evidence `configuration_id` is never implicitly substituted for, or used to derive, this identifier. Catalog and evidence identifiers are reached only through a verified mapping pinned to the active runtime artifact release.

This does not delete the current `Car.id` field immediately. The migration boundary must adapt `Car.id`/`optionId` to the branded runtime ID while preserving exact equality. The current production adapter's `Car.id = vehicle_variants.id` behavior is a legacy boundary behavior, not the target identity authority.

## D. Cross-system mapping contract

The approval-ready contract must state all of the following:

```text
Each active RuntimeVehicleCandidateId maps to
exactly one active TurkeyVehicleVariant.id
AND exactly one VERIFIED, eligible Vehicle Evidence configuration_id.

Each active TurkeyVehicleVariant.id maps back to at most one active RuntimeVehicleCandidateId.
Each active configuration_id maps back to at most one active RuntimeVehicleCandidateId.
```

The mapping release must be explicit, immutable, versioned, independently hashed, reviewable, and pinned to both a production-catalog release/revision and an evidence dataset release/hash. Its validator must reject duplicate IDs on all three columns, zero/multiple matches, non-VERIFIED configurations, invalid dates, market mismatch, revoked/stale records, and orphans on either pinned input. No brand/model/trim fuzzy match, LLM match, year approximation, display-name normalization join, or other implicit mapping is allowed.

These requirements amend rather than replace the prepared D2 record shape. `evidenceDatasetVersion` alone is insufficient to identify both inputs and the mapping release.

## E. Pilot crosswalk result

The analysis-only IDs below are proposed pilot registry IDs, not activated production IDs. Each row was manually reviewed against exact structured identity and cited first-party configuration evidence; no fuzzy or implicit join was used.

| RuntimeVehicleCandidateId | TurkeyVehicleVariant.id | Vehicle Evidence configuration_id | Brand | Model | Configuration | Mapping Basis | Status |
|---|---|---|---|---|---|---|---|
| `RVC-PILOT-0001` | `a3728e65-51b2-447f-a6c3-a1f64db8a310` | `CFG-000037` | Hyundai | IONIQ 9 | Progressive 160 kW 4X2, MY2026 | Exact market/model year/trim/power/drivetrain identity; production Hyundai brochure provenance and release `SRC-000050` identify the same first-party configuration | VERIFIED_ONE_TO_ONE |
| `RVC-PILOT-0002` | `62465336-2cfb-4ccd-b9a7-36467d63497f` | `CFG-000055` | Renault | Captur | techno mild hybrid EDC 140 hp, MY2026 | Exact market/model year/trim/powertrain identity; production Renault technical provenance and release `SRC-000065` first-party configurator evidence | VERIFIED_ONE_TO_ONE |
| `RVC-PILOT-0003` | `1eb75421-a038-4679-977e-7cd4e4608863` | — | Renault | Clio | evolution plus TCe EDC 115 hp, MY2026 | Exact candidate is present as `CFG-000001`, but that configuration is PROVISIONAL | INELIGIBLE |
| `RVC-PILOT-0004` | `8af2278c-4168-4a1b-a915-6b72b9cd6f48` | — | Toyota | Corolla | Vision Plus 1.5 125 HP, MY2026 | Release contains only Corolla Sedan Hybrid Dream; no exact configuration | UNMAPPED |
| `RVC-PILOT-0005` | `db2d6503-f10f-41a4-ad11-b2ca71e59d32` | — | Toyota | Corolla | Flame X-Pack Hybrid 1.8 140 HP, MY2026 | Release configuration is Hybrid Dream and PROVISIONAL; trim is not exact | UNMAPPED |
| `RVC-PILOT-0006` | `c8d535d0-6c04-4dcb-8cf6-2bad5bd037e8` | — | Toyota | Yaris | Flame Hybrid 1.5 116 HP, MY2026 | Vehicle Evidence has Yaris Cross, not this Yaris configuration | UNMAPPED |
| `RVC-PILOT-0007` | `87e30119-f0d5-4c98-8324-cbd65156974b` | — | Hyundai | IONIQ 5 | Dynamic Vision Roof 125 kW 4X2, MY2026 | Release has IONIQ 5 N only; no exact configuration | UNMAPPED |
| `RVC-PILOT-0008` | `5d3538b1-c726-44f5-8160-41a64d33eb8e` | — | Hyundai | TUCSON | Comfort 1.6 T-GDI 4X2 DCT, MY2026 | No TUCSON model/configuration exists in release `0.4.0` | UNMAPPED |

Counts: attempted `8`; VERIFIED_ONE_TO_ONE `2`; UNMAPPED `5`; AMBIGUOUS `0`; INELIGIBLE `1`.

For the two selected verified rows: duplicate proposed runtime ID `0`, duplicate vehicle variant `0`, duplicate configuration `0`, ambiguous `0`, fuzzy `0`, implicit `0`. The requested crosswalk gate nevertheless **fails**, because the repository cannot establish a diverse 5–8-row VERIFIED pilot and no approved mapping release exists. Unmapped and ineligible rows remain explicit.

## F. Resolution contract

The eligible subject set is built only from exact foreign keys:

```text
CONFIGURATION -> configuration_id
POWERTRAIN    -> configuration.powertrain_id
GENERATION    -> configuration.generation_id
MODEL         -> generation.model_id
```

For each requested fact key, the resolver must enforce the Data Dictionary's declared scope, exact parent identity, market, model year/validity, applicability, verification state, and conflict state. It must not search arbitrary broader or narrower scopes when a fact is absent. At one effective scope/applicability, different eligible values remain `CONFLICT_UNRESOLVED`; no averaging, first-source, authority, or latest-value shortcut is permitted.

Blocking amendment required in D3:

> Equipment is configuration-scoped and is never inherited across trim, configuration, powertrain, generation, or model boundaries unless a future explicit schema contract defines that inheritance.

## G. Runtime artifact contract

The activation unit is one immutable, derived runtime artifact release built from:

```text
approved immutable Vehicle Evidence release
+ approved immutable cross-system mapping release
```

It is authoritative only for pinned runtime reads, not as an authoring source. Minimum metadata must include `artifactVersion`, `datasetVersion`, `datasetReleaseHash`, `schemaVersion`, `mappingVersion`, `mappingHash`, `dictionaryRevision`, `productionCatalogRevision`, `generatedAt`, `generatorVersion`, `contentHash`, and `validationStatus`. Activation is all-or-nothing through a pointer to this unit; old-dataset/new-mapping and new-dataset/old-mapping states are invalid. A request pins the active artifact at start.

## H. VehicleEvidenceReadPort boundary

Allowed responsibilities are runtime candidate lookup, verified configuration resolution, declared-scope evidence/equipment retrieval, provenance and source lineage, limitations/conflicts, typed failure outcomes, and release/snapshot identity exposure.

Forbidden responsibilities are suitability scoring, requirement interpretation, evidence eligibility policy for recommendations, ranking, Product policy, LLM reasoning, recommendation decisions, source scraping, ID inference, and provenance manufacture.

Repository relationship requiring explicit acceptance:

```text
VehicleEvidenceReadPort
  -> replaces the synthetic Car-derived evidence source
     behind buildCarsRuntimeEvidenceDependencies
  -> existing CarsDomainEvidenceLinkageInput validation
  -> existing fail-closed sufficiency/authorization runtime
```

It must not become a parallel authority beside the current synthetic provider.

## I. Existing runtime / Type B impact

Current Type B production takes `Car.id`, copies it into `optionId`, and validates a match only when `candidateOptionIds` contains exactly that same ID. That exact-equality invariant is compatible with D1. The boundary change is a branded ID migration/adaptation, not fuzzy rematching.

The current production catalog adapter assigns `Car.id = TurkeyVehicleVariant.id`. After D1, a registry-backed catalog adaptation must supply the runtime candidate ID while retaining `TurkeyVehicleVariant.id` only as mapped catalog identity. The current `buildCarsRuntimeEvidenceDependencies` labels flattened `Car` fields authoritative; D5 must replace that evidence source, while downstream linkage validation and fail-closed sufficiency remain.

Legacy-field authority must be added to the clarification:

- canonical identity: runtime candidate registry;
- descriptive catalog fields (`brand`, `model`, `year`, `fuel`, `transmission`, `bodyType`): pinned production catalog;
- evidence-backed assertions: pinned Vehicle Evidence artifact;
- disagreement: preserve both lineages and fail closed for required evidence; never overwrite or silently choose one.

## J. Deployment authority

Architecture approval requires one named delivery mechanism—Git-tracked immutable artifacts, Git LFS, a CI-generated immutable artifact from controlled inputs, or an equivalently controlled build input. The current repository state establishes none: `data/cars/vehicle_evidence` and the relevant documents are untracked. The runtime must not depend on an artifact whose production inclusion, hash verification, and activation authority are unspecified.

## K. Remaining architecture issues

1. Define the authoritative mapping release schema, owner publication workflow, independent version/hash, catalog pin, evidence pin, reverse uniqueness, status drift, stale/orphan validation, and activation eligibility.
2. Add the equipment no-inheritance invariant and explicitly identify Data Dictionary revision as scope authority.
3. Complete runtime artifact metadata and atomic validation over both pinned inputs.
4. Record the single replacement relationship between `VehicleEvidenceReadPort` and the current synthetic provider.
5. Allocate legacy field authority and disagreement behavior during migration.
6. Choose a controlled deployment/delivery mechanism.
7. Produce an approved, diverse 5–8-row VERIFIED mapping release; the current repository overlap proves only two mappings.

## L. Product dependencies

The following remain Product decisions and are not resolved here: requirement-to-evidence mapping; evidence-state eligibility; PROVISIONAL discovery/recommendation policy; use of REPORTED/PARTIAL/UNCERTAIN evidence; user-requirement meaning of `NOT_AVAILABLE`; and the final recommendation evidence gate.

## M. ADR verdict

```text
NO NEW ADR REQUIRED
```

The existing clarification is the appropriate decision authority, but it must be amended with the blocking items above and then receive explicit D1–D5 owner acceptance. A separate ADR would duplicate the same scope; no repository governance rule requiring a distinct ADR was found.

## N. Next gate

```text
BLOCKED
```

Next bounded gate: amend and approve D2–D5, establish controlled artifact delivery, and publish a validated 5–8-row VERIFIED pilot mapping release. Product requirement-to-evidence policy and production integration remain blocked until that gate passes.
