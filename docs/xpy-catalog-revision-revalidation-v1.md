# XPY catalog revision and revalidation contract v1

Work unit: `WU-XPY-CATALOG-REVISION-REVALIDATION-01`

## Verdict

Implemented as a repository-local, fail-closed validation and impact-analysis layer. It does not fetch catalog data, write an active pointer, mutate a production database, or run a production migration. Cars and all 24 active Appliances category releases are adapted to one category-scoped revision contract while retaining their existing domain validators.

Current characterization:

- Cars: one active `0.55.4` release, 549 unique exact variants.
- Appliances: 24 active category releases, 97 unique exact products in total.
- AŞAMA 3 remains shared and fail-closed. Appliances external execution remains blocked by missing genuine Product/external authority; this work does not simulate commerce capability.

## Existing authority and consumer inventory

### Cars release lifecycle

- Active selection: `data/production/catalog/active.json`.
- Immutable releases: `data/production/catalog/releases/v<version>/{manifest.json,catalog.json,decision-facets.json}`.
- Schema, digest, membership, approval, market, time and provenance validator: `features/decision/v2/catalog/snapshot.ts`.
- Runtime load and Y candidate authority: `features/decision/v3/catalogAdapter.server.ts`.
- X/P/Y conversation and persisted revision consumers: `features/decision/v3/{engine.server.ts,planCarsTurn.server.ts,store.server.ts,ledger.ts}`.
- Y offer/authorization consumer: `features/decision/v3/offerGovernance.server.ts`.
- AŞAMA 1 cards: `components/cars/{CarCard.tsx,V2AuthorizedCarCard.tsx,CarsConversationV3.tsx}` and `features/decision/v3/equipmentCardProjection.ts`.
- AŞAMA 2 card/Advisor and signed entry: `features/sales-advisor/{artifact.server.ts,handoff.server.ts,advisor.ts,history.server.ts}`. The existing token already binds release, catalog fingerprint, decision revision/fingerprint, offer and exact variant.
- AŞAMA 3 signed handoff/action: `features/xpy/stageThree/contracts.ts` plus Cars `features/sales-advisor/handoff.server.ts`. Evidence release/fingerprint, exact configuration, parent AŞAMA 2 digest and intended action are checked again on read.
- Comparison entitlement: `features/comparison-entitlements/*`; it is reachable only after a currently valid decision-bound handoff.
- Separate volatile/read layers: vehicle media, offer audit, price observations, equipment, manual, persona and daily-life pointers under `data/production/*`. Each is already release/fingerprint bound where it can affect an XPY read.

### Appliances release lifecycle

- Active selection: one category pointer at `data/production/appliances/<category>/active.json`.
- Washing machine immutable authority: `catalog.json`, `manifest.json`, and `semantic-registry.json`, validated by `features/appliances/authority/loader.server.ts`.
- Dryer and refrigerator authorities: domain-pack releases validated by `features/appliances/{dryer,refrigerator}/authority.server.ts`.
- Remaining 21 categories: common bounded domain-pack validation in `features/appliances/bounded/authority.server.ts`; category semantics remain inside each governed pack.
- Department/Domain Pack registration: `features/appliances/categoryRegistry.ts`, `features/appliances/contracts.ts`, and `features/xpy/domainPacks.ts`.
- X/context and persisted facts: `features/appliances/{entry.server.ts,conversation.server.ts,context/*,ledger.ts,persistence/*}`. Conversation state already pins catalog release/digest and semantic version/digest.
- P questions: `features/appliances/planner/*`, category question planners and governed question policy loaders.
- Y candidate evaluation, sufficiency, selection, recommendation and authorization: `features/appliances/{candidate,sufficiency,selection,recommendation}/*`.
- AŞAMA 1 card: `features/appliances/recommendation/{projectCard.server.ts,publicCard.ts}` and the presentation adapter.
- AŞAMA 2 Advisor, comparison and actions: `features/appliances/stageTwo/*`. Decision authorization v2 and signed handoff v2 now explicitly bind catalog release/digest and semantic version/digest and reject a persisted mismatch before exposing Advisor, entitlement or action state.
- AŞAMA 3: shared presentation/authority boundary in `features/xpy/stageThree/*`. Actionable Appliances commerce remains unavailable unless external authority is genuinely verified.
- Volatile price, media and offer inputs: `data/production/appliances/{prices,media,commerce}` and their loaders. They are not part of the frozen catalog digest and may join only by exact product plus the bound catalog revision.

## Shared revision contract

`features/xpy/catalog/revision.ts` defines `xpy-catalog-revision/v1`. The manifest records:

- category scope, Türkiye market and immutable release version/digest;
- sorted exact membership digest and member count;
- exact ID and exact configuration identity for every member;
- normalized eligibility/lifecycle plus per-member provenance and evidence presence;
- catalog schema, XPY Catalog, XPY Runtime, Domain Pack and semantic authority versions/digests;
- the domain validator result and aggregate provenance/evidence digests;
- a fixed boundary that price, media and offers are separate, revision-bound exact-ID joins with no decision authority;
- a fixed no-automatic-activation policy.

`features/xpy/catalog/revisionAdapters.server.ts` supplies two adapters:

- Cars delegates domain validation to the existing `buildCatalogSnapshot` validator.
- Appliances retains the washing-machine, dryer, refrigerator and bounded-domain validation responsibilities and, for active candidates, invokes the existing authority loader as a characterization check. The common adapter does not copy Cars semantics into Appliances.

Validation rejects unsupported schemas, digest or membership differences, duplicate exact IDs/configurations, cross-market members, invalid lifecycle, missing provenance/evidence, domain-validator failures, and incompatible runtime/Domain Pack/semantic authority.

## Deterministic revalidation impact

| Artifact/state | Same release + membership digests | Compatible catalog content/membership change | Runtime, Domain Pack, schema or semantic incompatibility |
| --- | --- | --- | --- |
| X informational response authority | Remains valid | Remains valid | Fail closed |
| Y validated context facts | Remains valid | Remains valid | Fail closed |
| Y candidate evaluation | Remains valid | Recompute | Fail closed |
| P questions | Remains valid | Recompute | Fail closed |
| Y sufficiency | Remains valid | Recompute | Fail closed |
| Y selection | Remains valid | Recompute | Fail closed |
| Y recommendation | Remains valid | Recompute | Fail closed |
| Y authorization | Remains valid | Fail closed | Fail closed |
| AŞAMA 1 cards | Remains valid | Fail closed | Fail closed |
| AŞAMA 2 Advisor | Remains valid | Fail closed | Fail closed |
| AŞAMA 2 comparison entitlement | Remains valid | Fail closed | Fail closed |
| AŞAMA 2 signed handoff | Remains valid | Fail closed | Fail closed |
| AŞAMA 3 signed handoff | Remains valid | Fail closed | Fail closed |
| AŞAMA 3 action | Remains valid | Fail closed | Fail closed |

An artifact bound to a prior validated release may be opened only as historical read-only when that exact release and all binding digests remain available. It is never executable. If the release is unavailable or a digest/identity cannot be reproduced, the contract returns a human-readable recovery state and requires a new evaluation.

## Volatile data boundary

Price, media and merchant offers do not alter the frozen release or manifest digest. `validateCatalogVolatileSnapshotBinding` requires an exact release version, release digest, membership digest and unique member IDs. A snapshot from another revision, or a snapshot referring to an unknown/duplicate exact ID, is rejected. Affiliate or payment economics never enter candidate evaluation or ranking.

## Operator workflow

Dry-run the current Cars release:

```sh
npm run catalog:revision:dry-run -- --domain cars --release 0.55.4
```

Dry-run one proposed Appliances category release:

```sh
npm run catalog:revision:dry-run -- --domain appliances --category AIR_FRYER --release APPLIANCES-AIR-FRYER-TR-v0.1
```

Characterize the complete active Appliances portfolio:

```sh
npm run catalog:revision:dry-run -- --domain appliances --all-active
```

The command emits JSON to stdout, returns non-zero on validation failure, and always reports `automaticActivation: false` and unchanged pointers. A passing result means only `READY_FOR_EXPLICIT_OPERATOR_SELECTION`; it does not authorize mutation.

Activation is an explicit, separately reviewed operator action. The operator must preserve the dry-run report, confirm the expected current pointer, select the validated immutable release through the domain's established audited activation path, and then run the same focused runtime checks. No automatic activation API is exposed by this work unit.

Rollback is also selection, not destructive data rollback: dry-run a previously validated immutable release, explicitly select that release with a new audited activation event, and retain both newer and older releases. Never edit historical release bytes, delete a release, rewind the database, or reuse a stale authorization/handoff.

## Compatibility behavior

- A version label change with identical frozen release and membership digests is compatible and preserves existing behavior.
- A compatible content or membership change preserves only semantic user context; downstream X/P/Y derivations are recomputed and every executable authorization surface is closed.
- A runtime, Domain Pack, schema, semantic or scope mismatch closes all XPY stages.
- Historical reads never restore execution authority.
- Existing Cars AŞAMA 2/3 bindings remain unchanged. Existing Appliances decision authorizations and AŞAMA 2 v1 tokens fail closed under v2, intentionally requiring a fresh, revision-bound authorization/handoff.

## Verification and blockers

Focused coverage is in `features/xpy/catalog/revision.test.ts` and `features/appliances/stageTwo/handoff.test.ts`. It characterizes 549 Cars variants, all 24 Appliances categories/97 products, unchanged-digest compatibility, deterministic impact, historical recovery, volatile join rejection and signed Appliances handoff revision rejection.

Remaining external blocker: Appliances current-offer, authorized-seller, payment/order and fulfillment execution cannot be enabled from repository catalog evidence. Product ownership and verified external authority are still required. The revision contract deliberately reports or preserves `UNAVAILABLE`; it does not fabricate availability or commerce capability.

## Next bounded work unit

Exactly one recommendation: `WU-XPY-APPLIANCES-EXTERNAL-AUTHORITY-REVISION-BINDING-01` — bind a real, owner-approved Appliances commerce provider snapshot to `xpy-catalog-revision/v1`, including credentialed exact-product offer verification and expiry/revocation tests, without adding payment or order execution.
