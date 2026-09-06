# Cars equipment v1.6 runtime compatibility

Date: 2026-09-05  
Work unit: `WU-XPY-CARS-EQUIPMENT-V1_6-RUNTIME-COMPATIBILITY-01`  
Verdict: **IMPLEMENTED**  
Activation performed: **NO**

The runtime can now parse and validate the reviewed inactive equipment v1.6 candidate without changing its bytes or weakening the v1.5.5 active path. The implementation extends the existing compact-release adapter to the known `1.3.0` schema, normalizes both compact generations into the same read-only runtime shape, and fails closed on structural, provenance, reference, digest, coverage, or projection-semantic defects.

The reviewed v1.6 release remains inactive. No active pointer, generated active module, catalog member, P/Y authorization, filter, ranking, recommendation, offer, commerce, deployment, database, migration, or research state changed.

## Compatibility decision

**Chosen route: bounded runtime adapter, not candidate regeneration.**

The failed activation sent the `1.3.0` compact payload through the legacy expanded `1.2.1` parser. That parser expects the expanded evidence-layer arrays (`assertions`, `packageVariantLinks`, `trimVariantLinks`, `researchLedger`, and `reviewEvents`) and is not the predecessor format of the reviewed candidate. The active v1.5.5 release instead uses compact schema `1.2.0-rc`, whose materialized collections are `verifiedAssertions`, `reviewedAssociations`, `verifiedTrimLinks`, and compact `projections`. The v1.6 `1.3.0` payload retains that compact structure and adds reviewed fields within the already heterogeneous assertion representation.

Regeneration was rejected because the reviewed candidate bytes and their checksum-bound provenance are valid. Rewriting them would create a new candidate identity without improving the runtime contract. The adapter therefore accepts only the enumerated compact schemas `1.1.0-rc`, `1.2.0-rc`, and `1.3.0`; unknown future schemas remain rejected. Legacy expanded `1.2.1` remains on its existing parser.

## Semantic preservation

Independent comparison proves that v1.6 is additive over v1.5.5:

| Measure | Active v1.5.5 | Inactive v1.6 | Preservation result |
|---|---:|---:|---|
| Verified assertions | 112 | 126 | all 112 predecessor rows byte-equivalent after parse; 14 reviewed additions |
| Reviewed associations | 49 | 49 | unchanged |
| Verified trim links | 6 | 6 | unchanged |
| Projections | 112 | 126 | all 112 predecessor rows unchanged; 14 one-to-one additions |
| Exact-verified variants | 4 | 8 | four reviewed exact additions |
| Association-only variants | 2 | 2 | unchanged |
| Covered variants | 6 | 10 | expected reviewed gain |
| Uncovered variants | 543 | 539 | exact complement of the four added variants in the 549-member catalog |

The 14 additions equal `verified-association-materializations.json`, bind to approved owner decision events, and preserve source/artifact digests, applicability, confidence, review IDs, supersession chains, and approval-manifest authority. Every manifest-bound v1.6 file digest recomputes exactly. Projection validation prohibits assertion-to-variant crossing and rejects changes to feature, availability, provision mode, family inheritance, cross-powertrain propagation, evidence reinterpretation, or decision authority.

## Fail-closed checks

The compact compatibility validator now rejects:

- unsupported schema versions or malformed compact rows;
- missing source provenance, second review, or invalid terminal supersession chains;
- payload, release, schema, catalog, manifest-file, or count mismatches;
- duplicate materialization, source, projection, or variant-feature identities;
- unknown catalog variants and cross-variant assertion or trim references;
- coverage-set/count inconsistencies; and
- any semantic loss between a verified assertion and its runtime projection.

The activation preflight now validates the inactive equipment candidate before any write. It also rejects reuse of an authorization package once an `activation-failure-result.json` exists. `GLOBAL-EVIDENCE-AUTH-20260905-02` was spent by failed activation event `GLOBAL-EVIDENCE-ACT-20260905-03`; its old approval cannot authorize a new attempt.

## Verification

| Gate | Result |
|---|---|
| Active equipment verifier | PASS: v1.5.5, 112 assertions / 4 exact / 6 covered / 543 uncovered |
| Inactive candidate verifier | PASS: v1.6, 126 assertions / 8 exact / 10 covered / 539 uncovered |
| Runtime compatibility regressions and affected consumers | PASS: 8 files / 136 tests |
| Scoped activation TypeScript | PASS |
| Scoped ESLint | PASS |
| Cars catalog `v0.55.4` dry run | PASS: 549 members; release and membership digests unchanged |
| Active pointer bytes | unchanged: `sha256:101803fb4195c8cfe724715ece539d5ba88fb797f6a0194657b2166043feee4b` |
| Active generated module bytes | unchanged: `sha256:e282e22700252fd0fe9b45d36be2c2c4953beb916367e8e390dbbb1977466396` |
| Full-project TypeScript | baseline-only failure: two unresolved relative imports inside the historical rollback snapshot for `GLOBAL-EVIDENCE-ACT-20260905-03`; no compatibility-scope errors |
| Activation-script dry invocation | safely rejected before writes with `AUTHORIZATION_SPENT_BY_FAILED_ACTIVATION_REQUIRES_SUPERSEDING_PACKAGE` |

## Authority boundary and next action

The compatibility implementation does not activate v1.6 and does not itself grant activation authority. The only authorized next recommendation is: **regenerate a superseding checksum-bound activation authorization package for explicit user approval.**
