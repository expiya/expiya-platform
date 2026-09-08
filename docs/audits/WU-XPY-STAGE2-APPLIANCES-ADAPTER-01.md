# WU-XPY-STAGE2-APPLIANCES-ADAPTER-01

## A. Scope

Adapt the existing governed Appliances signed Stage 2 runtime to the shared XPY Stage 2 adapter, projection, renderer, comparison-entitlement placement and Advisor boundary. No catalog, pointer, database, ranking, commerce, AŞAMA 1, AŞAMA 3 or deployment mutation.

## B. Base

Started from `1941fc6923115c486521255b68101721200b2fe3` on `codex/xpy-stage2-cars-adapter-01`.

## C. Repository authority

The repository already declares 24 active Appliances categories, signed handoff v2, exact product/configuration binding, catalog and semantic pins, decision revision/fingerprint, category-owned Stage 2 content, governed public-card projection, comparison entitlement lookup and bounded Advisor behavior. The adapter reuses these authorities and adds no semantics.

## D. Readiness count

Authority-ready and adapter-registered: **24/24**. Fail-closed for missing authority: **0/24**. All categories use one `appliances-xpy-stage2-adapter/v1` family; there is no per-category renderer or work unit.

## E. Exhaustive readiness matrix

| Category | Readiness | Adapter result |
|---|---|---|
| WASHING_MACHINE | Authority complete | Registered |
| REFRIGERATOR | Authority complete | Registered |
| DISHWASHER | Authority complete | Registered |
| DRYER | Authority complete | Registered |
| VACUUM | Authority complete | Registered |
| ROBOT_VACUUM | Authority complete | Registered |
| FREEZER | Authority complete | Registered |
| BUILT_IN_OVEN | Authority complete | Registered |
| FREESTANDING_COOKER | Authority complete | Registered |
| HOB | Authority complete | Registered |
| RANGE_HOOD | Authority complete | Registered |
| COUNTERTOP_MICROWAVE_OVEN | Authority complete | Registered |
| BUILT_IN_MICROWAVE_OVEN | Authority complete | Registered |
| AIR_PURIFIER | Authority complete | Registered |
| FULLY_AUTOMATIC_ESPRESSO_MACHINE | Authority complete | Registered |
| MANUAL_ESPRESSO_MACHINE | Authority complete | Registered |
| FILTER_COFFEE_MACHINE | Authority complete | Registered |
| TURKISH_COFFEE_MACHINE | Authority complete | Registered |
| AIR_FRYER | Authority complete | Registered |
| BLENDER | Authority complete | Registered |
| FOOD_PROCESSOR | Authority complete | Registered |
| ELECTRIC_STORAGE_WATER_HEATER | Authority complete | Registered |
| INSTANTANEOUS_ELECTRIC_WATER_HEATER | Authority complete | Registered |
| SPLIT_AIR_CONDITIONER | Authority complete | Registered |

## F. Shared projection and rendering

The adapter pins department, category, conversation, decision revision/fingerprint, exact product/configuration, catalog release/digest, handoff version, issue/expiry and replay policy. The existing Appliances experience remains category-rich but is composed through `XpyStageTwoRenderer`; the shared comparison offer appears after the selected-product evidence and before Advisor.

## G. Category semantics

Specifications, daily meanings, limitations, media, price and comparison rows continue to come only from the existing governed Appliances public-card and category-content projections. Unknown data remains explicit. No field, score, product or comparison row is synthesized by the shared renderer.

## H. Security and recovery

Existing HMAC verification covers malformed input, unknown/revoked keys, bad signatures, expiry, future issue and invalid lifetime. Persisted recovery additionally binds department, category, revision, decision fingerprint, catalog and semantic versions/digests, exact product and configuration. The shared entry validator repeats the current-authority check. Cross-category, revision, evidence and identity mismatches fail closed.

## I. Comparison and Advisor

NOT_PURCHASED, REVOKED and EXPIRED states expose no comparison products or rows. PURCHASED requires the selected exact product and a non-empty evidence-set fingerprint; only persisted authorized IDs can enter the projection. The shared Advisor guard blocks AŞAMA 1 reopening, alternatives and unentitled comparison before existing Appliances evidence/manual answers run.

## J. Cars and cross-domain isolation

Cars remains registered under its original adapter object and `NEW_CAR` surface. A cross-domain registry test proves the Cars adapter and the one Appliances family coexist without overwriting each other.

## K. Verification

Focused verification passed 8 files / 75 tests and covers all 24 projections plus representative Washing Machine, Refrigerator, Dryer, Robot Vacuum, Filter Coffee Machine and Split Air Conditioner flows. It also covers entitlement states, cross-category/identity/revision/evidence failure, Advisor boundaries, Cars non-regression and shared renderer composition. The full Node 24 suite passed 712 files / 5,706 tests; TypeScript passed; lint reported 0 errors and the same 10 unrelated baseline warnings; diff check passed. The clean-cache Node 24 production build compiled, type-checked and generated all 624 pages. Desktop browser QA verified the invalid-handoff recovery state. A 390×844 headless browser check confirmed no horizontal overflow, a valid AŞAMA 1 recovery target and no raw internal identifiers. Credentialed valid-state browser QA was unavailable because this checkout has no database or handoff-key environment; persisted valid-state behavior is covered by the focused tests. No deployment occurred.

## L. Files

- Added the Appliances shared adapter and exhaustive/cross-domain tests.
- Extended the signed-handoff read result with already-verified claims for server-side shared projection.
- Added the shared projection to the existing Stage 2 API response.
- Composed the existing Appliances UI through the shared renderer and offer.
- Added this audit. No database, catalog, pointer or deployment files changed.

## M. Exactly one next bounded recommendation

`WU-XPY-STAGE2-APPLIANCES-ADVISOR-SERVER-TRANSPORT-01`: move the existing read-only Appliances Advisor invocation from client-local evaluation to a signed, rate-limited server endpoint while preserving the same shared guard, exact authority binding and zero new semantic authority.
