# XPY Catalog Standard Parity v0.1

Status: implemented as an additive compatibility/audit boundary on 2026-09-04. Existing Cars and Appliances loaders and runtime behavior are unchanged.

## Current catalog state

Expiya does not currently have one uniformly rich catalog. Cars is the **architecture and richness reference, not a content-complete gold catalog**. Washing Machine is deeply layered, while five small active appliance Domain Packs have valid runtime scope but materially thinner provenance and semantics. Cars is materially incomplete: zero of 549 variants pass the strict combined content-completeness gate; only 4 have verified equipment plus 2 association-only; the active technical-to-daily-life registry averages about 49% field population; no governed experience aggregate is active; and the owner-manual bridge has zero exact-TR promoted variants.

The executable `XPY_CATALOG/v0.1` contract standardizes the envelope and boundaries, not the domain vocabulary. It permits explicit partial and not-applicable layers. It does not default-fill missing manuals, interpretations, persona mappings, experience, or service semantics.

## Contract and authority boundaries

The contract lives in `features/xpy/catalog/contract.ts`; fail-closed invariants and external joins live in `features/xpy/catalog/validation.ts`. Active category registration lives in `features/xpy/catalog/registrations.ts`. The repository adapters and generated audit live in `features/xpy/catalog/adapters.server.ts` and `data/governance/xpy-catalog/v0.1/coverage-report.json`. Cars also has a 549-row `cars-exact-variant-gap-inventory.json`; each exact ID separates governed, provenance-partial, unknown/unresolved, schema-absent, and not-applicable fields and reports L2/L5/L6/L9/Advisor/Comparison/decision limitations.

- L0 is a discriminated PRODUCT or SERVICE identity. Products use manufacturer/model/configuration identifiers. Services use provider/service/plan/scope/version. Neither subtype inherits the other's fields.
- L1 facts and L2 capabilities require governed evidence. L3 usage semantics and L4 Need-to-Evidence mappings reference those IDs rather than copying truth.
- L5 persona/context is `DOMAIN_PLANNING` with `directCandidateEffect: NONE`.
- L6 is an explicit deterministic reviewed mapping or bounded experience interpretation and must trace to L1/L2.
- L7 experience has aggregation rules and `technicalTruthAuthority: NONE`.
- L8 carries eligible evidence, limitations, disclosures, and exact traceability.
- L9 knowledge is exact-offering/version/market/source-section scoped and has no decision authority. A manual evidence record is rejected from L1/L8 unless a separately governed promotion binds it.
- L10 offers, affiliate state, price observations, and media are external snapshots joined by exact identity. They do not alter the frozen catalog digest or Y authority.
- `AdvisorReadProjection` is a read-only derivative of one authorized AŞAMA 1 exact decision. It exposes only applicable identity, facts, capabilities, interpretations, knowledge, evidence, and sources. It cannot select, mutate AŞAMA 1, alter Y, invent claims, or use commerce as recommendation authority.
- `ComparisonEvidenceProjection` requires a paid entitlement and an exact authorized comparison set. Domain Packs supply dimensions, human labels, and scope. Unknown cells are neutral; incompatible units/scopes and unauthorized alternatives fail closed. The port works for product specifications and service plan/scope/location/date/SLA dimensions without equating them.
- Catalog releases bind an XPY Runtime version/digest, Domain Pack version, semantic authority version/digest, and revision class. Evidence refreshes must declare semantics unchanged; semantic/policy changes require a versioned semantic change.

The validator fails closed for digest mismatch, identity collision, dangling source/offering/evidence/fact/capability/need/mapping references, cross-market content, stale or unknown source applicability, unsafe manual promotion, direct persona decision authority, untraced daily-life interpretation, experience-as-technical-truth, and incomplete decision traceability.

## Cars-parity matrix

The status is measured against populated active authorities, not schema presence. Counts and every authoritative path/missing artifact/impact classification are in the machine-readable report.

| Category | Products | Sources | L0 | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 |
|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|
| Cars / NEW_CAR | 549 | 57 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | COMPLETE | PARTIAL | PARTIAL |
| WASHING_MACHINE | 24 | 94 | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL | ABSENT | PARTIAL | PARTIAL | PARTIAL |
| DRYER | 3 | 6 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT | PARTIAL |
| REFRIGERATOR | 4 | 8 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT | PARTIAL |
| DISHWASHER | 4 | 5 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT | PARTIAL |
| VACUUM | 4 | 4 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT | PARTIAL |
| ROBOT_VACUUM | 4 | 6 | COMPLETE | PARTIAL | PARTIAL | PARTIAL | PARTIAL | ABSENT | ABSENT | ABSENT | PARTIAL | ABSENT | PARTIAL |

Key measured coverage:

- Cars: 549/549 exact identities with 11,154 provenance-bearing objective fields; equipment is verified on 4 variants plus reviewed-association-only on 2; 117 technical daily-life mappings and 51 equipment explanation entries; 545/549 variants have non-empty owner-approved soft persona traits; exact-TR manual promotion is 0/549; decision outputs preserve exact identity and authority references.
- Washing Machine: 24 products; 338 technical facts; 384 capability facts; 19 usage semantics; 25 needs; 11 Need-to-Evidence mappings; 9 bounded persona/context profiles; 4 interpretation modes but zero populated product interpretation records; an Advisor knowledge schema but zero product-bound manual records; 19/24 products have a separate current price projection while merchant/media coverage remains incomplete.
- The other five appliance packs: 3–4 exact products with official source lists, technical fact objects, capability objects, concepts, comparability policy, and hard-compatibility/Pareto selection. Their evidence references bind at product level rather than assertion level. They have no separate populated persona, daily-life, experience, or Advisor/manual authority and no separately digest-bound decision projection policy.

Gap impact is explicit in the JSON report. L0 and decision authorization are AŞAMA 1 concerns; assertion eligibility, Need-to-Evidence, daily-life, and Advisor/manual gaps primarily block full AŞAMA 2 parity; persona, experience, and broader offer/media coverage are richness gaps unless a future Domain Pack declares them material.

### AŞAMA 2 downstream readiness

| Category | Advisor read | Comparison evidence | Example table | Paid report |
|---|---|---|---|---|
| Cars / NEW_CAR | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| WASHING_MACHINE | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| DRYER | BLOCKED | PARTIAL | BLOCKED | BLOCKED |
| REFRIGERATOR | BLOCKED | PARTIAL | BLOCKED | BLOCKED |
| DISHWASHER | BLOCKED | PARTIAL | BLOCKED | BLOCKED |
| VACUUM | BLOCKED | PARTIAL | BLOCKED | BLOCKED |
| ROBOT_VACUUM | BLOCKED | PARTIAL | BLOCKED | BLOCKED |

Cars and Washing Machine can seed the standard with limitations. The five compact Domain Packs have comparability policies and exact identities, so a projection shape is possible, but example tables and bounded Advisor reads must fail closed until each pack supplies governed dimensions/human labels and sufficient assertion-level/interpretation/knowledge authority. This work does not implement Stage 2 UI, payment, report generation, the Sales Advisor runtime, sales actions, or AŞAMA 3.

### Cars exact-variant enrichment order

The executable inventory orders Cars work by decision/Advisor impact and source availability rather than alphabetically. Because no active Cars field-level applicability registry exists, blank fields remain `UNKNOWN_UNRESOLVED`; the audit never guesses `NOT_APPLICABLE` from powertrain or sibling-family knowledge.

1. Exact-TR owner-manual applicability and governed promotion: baseline 0/549; 38 variants already have Turkish manual candidates, and the first pilot binds eight exact IDs.
2. Equipment/capability evidence: baseline 4 verified plus 2 association-only of 549.
3. High-materiality technical-to-daily-life closure: baseline 117 mappings and about 49% aggregate field population.
4. Persona quality remainder: 545/549 non-empty soft-only trait projections; reviewed empty is distinct from unresolved.
5. Comparison/Advisor projection completeness: baseline zero fully ready variants under the strict combined gate.

Every batch requires exact IDs, primary/manufacturer/manual sources, source section/page where relevant, observed/reviewed timestamps, Türkiye applicability, no cross-trim inheritance, digest regeneration, historical preservation, validator tests, and a measured before/after coverage delta.

## Product versus service

Both offering kinds share market/lifecycle/applicability, provenance, evidence status, release compatibility, historical digest, and external-join rules. Identity and deliverable semantics remain typed and separate. Tests include one product-shaped and one service-shaped release. The service fixture is contract proof only; the repository contains no active governed service Department/catalog to claim as production authority.

## Implementation and verification

Added:

- `features/xpy/catalog/contract.ts`
- `features/xpy/catalog/validation.ts`
- `features/xpy/catalog/registrations.ts`
- `features/xpy/catalog/adapters.server.ts`
- `features/xpy/catalog/coverageReport.server.ts`
- `features/xpy/catalog/readProjections.ts`
- `features/xpy/catalog/carsGapInventory.server.ts`
- `features/xpy/catalog/validation.test.ts`
- `features/xpy/catalog/adapters.test.ts`
- `scripts/generate-xpy-catalog-coverage.ts`
- `data/governance/xpy-catalog/v0.1/coverage-report.json`
- `data/governance/xpy-catalog/v0.1/cars-exact-variant-gap-inventory.json`

Focused tests cover product/service separation, release digest, runtime/Domain Pack registration, identity collision, dangling references, cross-market leakage, stale applicability, semantic revision declarations, manual promotion, persona neutrality, and volatile commerce/media isolation. TypeScript changes in this work unit are clean; any separately reported global TypeScript errors are concurrent pre-existing edits outside this file set.

## Genuine remaining blockers

- No active production service catalog exists, so production service applicability cannot be audited beyond the typed fixture.
- Five appliance Domain Packs lack assertion-level fact/capability provenance and separate versioned L3–L9 authorities.
- No active category has governed L7 experience/review aggregation.
- Cars exact equipment coverage is 6/549 at best, and exact-TR manual promotion is 0/549.
- Washing Machine has an L6 policy and L9 schema but no populated product-bound interpretation/manual records.
- Cars still carries `activeNewPrice` inside its frozen payload even though volatile merchant offers and media are governed separately; a future catalog revision should classify or externalize that field without silently changing X/P/Y semantics.

## Next bounded work unit

The single next work unit is `WU-XPY-CARS-OWNER-MANUAL-EXACT-TR-PILOT-01`. Its complete execution prompt is embedded both under `nextWorkUnit.executionPrompt` in the coverage report and `firstBatch.executionPrompt` in the Cars inventory. It targets eight exact variants with Turkish manual candidates and can improve the 0/549 exact-TR baseline only through reviewed exact applicability; if exact applicability cannot be proven, it must preserve zero and report the blocker without fabrication. The later Stage 2 comparison/Advisor standard remains gated by this measured authority gap.
