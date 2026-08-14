# Expiya Architecture v0.1

## Production Vehicle Catalog Authority, Release & Staged Activation Boundary

Status: **PREPARED FOR ARCHITECTURE APPROVAL — implementation and activation remain blocked**
Date: 2026-08-14
Scope: Expiya Cars production vehicle catalog authoring, immutable release, publication and staged runtime activation

## 1. Decision trigger

The Vehicle Evidence coverage expansion stopped with two eligible exact one-to-one mappings from ten catalog variants. Expanding coverage safely requires changing one or both pinned source universes. The current repository can validate and publish individual vehicle records, but it does not yet establish a versioned Production Vehicle Catalog authority with a manifest, content hash, approval evidence or atomic activation state.

Therefore `pilot-vehicles:2026-08-14` is a useful analysis revision label, not an approved immutable catalog release. It must not be treated as sufficient production authority merely because its records are Git-tracked, pass readiness checks or can be read from the database.

## 2. Decisions proposed for approval

### D1 — One catalog authority, with separated duties

The **Production Vehicle Catalog Authority** owns:

- canonical catalog variant identity and identity lifecycle;
- market, model year, brand/model/trim and discovery/presentation descriptors;
- inclusion in a catalog release;
- release approval, withdrawal and supersession; and
- the production catalog activation pointer.

It does not own Vehicle Evidence facts, cross-system equivalence, requirement-to-evidence policy, recommendation eligibility or ranking.

The minimum controlled duties are distinct even when the same person performs more than one in the MVP:

| Duty | Responsibility |
|---|---|
| Author | Proposes sourced variant and price changes |
| Validator | Runs deterministic structural, provenance and referential checks |
| Approver | Accepts the immutable release candidate and its declared limitations |
| Activator | Moves an environment to an approved release or rolls it back |

No authoring write becomes runtime authority directly. For the bootstrap phase, approver and activator may be the same named owner, but approval evidence and activation evidence remain separate manifest events.

### D2 — Variant identity is stable; observations are versioned

`TurkeyVehicleVariant.id` identifies one market-selectable catalog variant. It remains stable when the same variant receives refreshed price, provenance or non-identity presentation data.

A new variant ID is required for a material identity change, including incompatible market, model year, model, trim/configuration or powertrain identity. Rebinding an existing ID to a materially different vehicle is forbidden. A split, merge or correction that changes represented identity creates successor identity records and explicit supersession lineage.

Lifecycle status is not deletion. `ORDER_CLOSED` and `DISCONTINUED` variants remain available for audit and replay but are ineligible for a new active catalog slice unless an explicitly approved use case permits them. Published releases are append-only and are never overwritten.

Prices are time-bounded observations, not variant identity and not release activation. Expiring a price may change request-time commerce eligibility, but it must not mutate the contents or hash of an activated catalog release.

### D3 — The authority publishes an immutable catalog release

The publication unit is an immutable **Production Vehicle Catalog Release** containing the complete intended variant universe and the observations/descriptors required by the catalog read boundary. A release is more than a database snapshot or source file.

Its manifest carries at least:

```text
catalog_release_version
catalog_release_hash
schema_version
market
created_at
source_revision_or_commit
generator_version
validator_version / validator_status
variant_count / eligible_variant_count
included_variant_ids
source_document_identity_hashes
approval_status / approved_at / approver_reference
supersedes_catalog_release_version?
limitations
```

The hash covers canonicalized runtime-relevant release content and its identity/provenance references; timestamps that are generated during publication do not create identity by themselves. The same inputs and generator version must reproduce the same content hash.

An approved release is immutable. Corrections produce a new release. A release may be withdrawn from future activation with a reason, but its files, hash and audit history remain available.

### D4 — Publication and activation are different state transitions

Catalog lifecycle states are:

```text
DRAFT -> VALIDATED -> APPROVED -> STAGED -> ACTIVE
                    \-> REJECTED
APPROVED | STAGED | ACTIVE -> WITHDRAWN
ACTIVE -> SUPERSEDED       # only after another approved release activates
```

- `DRAFT` and `VALIDATED` have no runtime authority.
- `APPROVED` is eligible for deployment but is not visible to production reads.
- `STAGED` may be used only in controlled validation/shadow environments.
- Exactly one catalog release is `ACTIVE` per environment and market.
- `WITHDRAWN` cannot be newly activated.
- Activation changes a pointer; it never rewrites a release.

The transition to `ACTIVE` is atomic. Failed validation or pointer movement leaves the previous release active. Rollback atomically selects a previously approved, validated immutable release and records actor, time and reason.

### D5 — Runtime reads one pinned release

Production catalog reads occur through one catalog read boundary pinned at request start. A request must not combine variants, descriptors or release-scoped observations from different catalog releases.

The current database repository and `pilotVehicleRecords` remain authoring/import/bootstrap mechanisms until they generate a conforming release. `buildPublishedCatalog` readiness is an input gate; its output is not authoritative without a manifest, hash, approval and activation record.

Request-time price validity may be evaluated against the price observations contained in the pinned release. That evaluation can make a variant commercially unavailable without silently changing the active release. Catalog expansion, removal or identity replacement always requires a new release.

### D6 — Catalog activation does not independently activate evidence-backed runtime candidates

The Production Vehicle Catalog and Runtime Vehicle Evidence Artifact have separate activation pointers and purposes:

- catalog activation controls discovery/presentation and catalog commerce eligibility;
- Runtime Vehicle Evidence Artifact activation controls the evidence-backed decision universe and pins its catalog, evidence, mapping and dictionary inputs together.

Activating a new catalog release must not automatically add, remap or remove evidence-backed runtime candidates. A Runtime Vehicle Evidence Artifact remains valid only with the exact catalog release/hash recorded in its manifest.

When a new catalog release is activated:

1. catalog-only behavior may use it through the catalog boundary;
2. the existing evidence artifact remains pinned to its prior catalog release for governed evidence reads;
3. a new mapping release and runtime artifact must be generated and approved before any candidates from the new catalog release enter the evidence-backed universe; and
4. requests must not join the new active catalog pointer to an older evidence artifact by variant ID and call the result governed evidence.

This deliberately allows catalog freshness to move ahead of evidence coverage without creating implicit mappings or mixed authority.

### D7 — Staged activation is explicit, bounded and fail-closed

An approved catalog release may progress through these stages:

| Stage | Allowed use | Promotion gate |
|---|---|---|
| Validation | Offline deterministic checks only | All release validators pass |
| Staging | Non-production catalog/read integration | Hash, referential and read-contract checks pass |
| Shadow | Production inputs, no user-visible decision effect | Drift/diff report reviewed; no forbidden identity mutation |
| Catalog active | User-visible catalog/discovery only | Explicit activation approval and rollback target |
| Evidence-candidate active | Governed decision evidence | New mapping and complete Runtime Vehicle Evidence Artifact approval |

Canary traffic may be added later as an operational mechanism, but it cannot permit two catalog authorities inside one request. Every request records the selected release identity. Promotion is manual and evidence-backed in v0.1; elapsed time alone never promotes a release.

Any of the following blocks promotion: validator failure, duplicate identity, missing provenance, unresolved supersession, non-reproducible hash, missing approval, stale mapping pin, mixed-release read, or missing rollback target.

## 3. Release validator contract

The catalog release validator must fail closed on at least:

1. duplicate variant IDs or materially different identities sharing one ID;
2. invalid market/model-year/lifecycle values;
3. missing required discovery descriptors;
4. missing or invalid identity provenance;
5. orphan price, fact, document or supersession references;
6. invalid price intervals or currency/market mismatch;
7. unresolved required conflicts;
8. non-canonical serialization or hash mismatch;
9. release mutation after approval; and
10. incompatibility with the supported catalog release schema.

The validator reports counts and exclusions. A count target such as five mapped candidates is not a catalog validity rule; it is a downstream coverage/pilot gate. Catalog authority must not distort identities or admit weak matches to meet it.

## 4. Repository alignment and gaps

| Current capability | Interpretation after approval | Required closure |
|---|---|---|
| `pilotVehicleRecords` | Bootstrap authoring input | Must generate an immutable release; not direct authority |
| SQL vehicle/provenance tables | Mutable authoring/read model | Add release membership and immutable release identity |
| `assessCatalogReadiness` | Per-record pre-publication check | Add release-wide validator and manifest/hash verification |
| `buildPublishedCatalog` | Deterministic candidate builder at a supplied time | Separate release content from request-time price eligibility |
| `catalogReadRepository` | Catalog storage adapter | Require explicit release pin; forbid unversioned production reads |
| `pilot-vehicles:2026-08-14` | Analysis revision label | Republish as a versioned, hashed, approved release |

No current code or data is promoted by this architecture clarification. Existing untracked workspace files and mutable database state have no production release authority.

## 5. Required approval choices

Architecture approval accepts or changes these normative choices:

1. Production Vehicle Catalog Authority owns release inclusion and the environment/market activation pointer.
2. Variant identity is stable and cannot be rebound; material identity changes use supersession.
3. Immutable manifest-and-hash releases are the only activatable catalog unit.
4. Approval and activation are distinct audit events.
5. Catalog activation may precede evidence coverage, but cannot alter the evidence-backed candidate universe.
6. Staging/shadow do not create production decision authority.
7. Bootstrap delivery uses a Git-tracked generated release and manifest/hash, consistent with the already approved Runtime Vehicle Evidence bootstrap mechanism.

Choice 7 is intentionally operational and replaceable: a future controlled database/artifact registry may replace Git delivery if it preserves immutability, pins, validation, audit and atomic activation.

## 6. Approval gates and immediate next sequence

### Architecture gate

Approval requires explicit closure of D1–D7 and named ownership for approver/activator roles. Until then:

`CATALOG AUTHORITY CLARIFICATION REQUIRED`

### Development gate after approval

1. Define the catalog release schema, canonical serialization and hash contract.
2. Implement release-wide validation and immutable manifest generation.
3. Republish the current ten-variant bootstrap catalog as the first controlled release.
4. Add explicit staged/active pointers and rollback audit evidence.
5. Pin catalog reads and mapping generation to release version plus hash.
6. Re-run exact reconciliation against Vehicle Evidence `0.4.0` or a later separately approved evidence release.
7. Generate a new mapping/runtime artifact only when the downstream coverage and diversity gates pass.

### Current verdict

**ARCHITECTURE CLARIFICATION PREPARED — APPROVAL REQUIRED**

Production implementation, catalog activation, further mapping publication and Runtime Vehicle Evidence Artifact activation remain blocked. The existing active runtime behavior, if any, must remain unchanged.
