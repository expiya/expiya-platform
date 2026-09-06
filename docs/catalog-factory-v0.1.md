# Expiya Catalog Factory v0.1

## Contract and authority boundary

Catalog Factory turns read-only or synthetic observations into deterministic **candidates**. It has no active-pointer writer, migration executor, deployment adapter, registry mutator, or self-activation path. Approval is a terminal pending gate, never inferred from test success.

The stage order is fixed: `TAXONOMY_INTAKE`, `DISCOVERY_OBSERVATION`, exact `IDENTITY_RECONCILIATION`, `PRIMARY_EVIDENCE_CLOSURE`, `SEMANTIC_ENRICHMENT`, hierarchical `PERSONA_ENRICHMENT`, separate `COMMERCE_MEDIA_PROJECTION`, `DOMAIN_PACK_CANDIDATE`, `PLATFORM_INTEGRATION_MANIFEST`, and immutable `GOVERNANCE_ACTIVATION_PLANNING`.

Identity keeps brand, family, model, exact variant, SKU, GTIN, and ASIN in separate fields. Every observation ends as `EXACT`, `REJECTED`, or explicit neutral `UNKNOWN`; cardinality mismatch fails closed. Amazon Türkiye is the preferred discovery/commerce reference, but is never technical or ranking authority and is not required exclusively. Manufacturer product/support pages, official manuals, authorized dealers, and reliable Turkish retailers are supported evidence classes.

Technical facts are projected into daily-life meaning, needs, possible hard filters, and material discriminators only with their source fact keys. `UNKNOWN_NEUTRAL` is valid. Domain meaning stays in generated candidates rather than the factory core.

Persona is hierarchical, requires an approved evidence class for non-neutral use, has a combined soft-score ceiling of `0.75`, and exposes no membership or standalone-winner authority. Price, stock, offers, and media are short-lived projections with a deliberately null technical-evidence digest.

## Gates and integration

Every run emits catalog, identity, evidence, semantics, Persona-or-neutral, XPY, Secretary, presentation, persistence, commerce-incomplete-allowed, and owner-approval gates. Candidate packs declare X as proposal-only, P as domain questions, and Y as requiring an authorized decision. The integration manifest can feed Expiya Nedir, Secretary product-identity routing, and universal cards only after owner approval and an external governed registry change.

High-risk taxonomy flags are mandatory vocabulary for health, cosmetics, food/allergens, children/toys, fashion sizing, automotive compatibility, gift cards, and books/content. A flag does not invent policy; it forces downstream human/domain review.

## Restart, caching, incremental work

Inputs and per-category slices receive canonical SHA-256 digests. Observation rows carry `observedAt` and `freshnessUntil`, so collectors can reuse fresh cache entries without allowing volatile data into frozen evidence. Checkpoints bind the complete input digest, completed stages, category digests, and update time. A matching checkpoint resumes safely; `rebuildCategories` limits emitted candidates while preserving the full coverage ledger. `mapBounded` provides deterministic output order with bounded concurrent collection work.

## Pilot

The synthetic/read-only pilot covers: an existing Electronics/Smartphone expansion, a proposed durable-goods Cordless Drill department, and high-risk Baby & Child/Toy intake. The unresolved toy observation terminates as `UNKNOWN`; it is not dropped. The drill has official-manual evidence but neutral Persona. The phone uses manufacturer evidence for technical facts and Amazon Türkiye only for a volatile offer.

Run:

```sh
npm run catalog-factory:pilot
npx vitest run features/catalog-factory/pipeline.test.ts
```

The generated `outputs/catalog-factory-v0.1-pilot/candidate.json` and checkpoint are local proof artifacts, not activation artifacts.

## Operator playbook

1. Freeze taxonomy input and mark every applicable high-risk class.
2. Collect observations with source class, timestamps, cache freshness, raw label, and separated identifiers.
3. Reconcile every observation terminally. Stop on cardinality or exact-identity conflicts.
4. Close exact-product facts with primary evidence; treat Amazon data as commerce-only.
5. Add sourced semantic projections or explicit neutral unknowns.
6. Add evidence-bound hierarchical Persona projections or neutral rows; verify the aggregate cap.
7. Materialize volatile commerce/media separately.
8. Run twice at a pinned timestamp and compare the canonical digest. Run the incremental category test.
9. Review coverage and every readiness gate. Commerce may remain incomplete; identity/evidence may not silently pass.
10. Present the candidate pack and integration manifest to the owner. Only a separate approved work unit may mutate the active registry, pointers, database, or deployment.

## Future Organizatör prompt template

```text
Build catalog wave <ID> with Catalog Factory v0.1 for <department/categories> using read-only or synthetic inputs first. Preserve the platform contracts in features/xpy, features/platform, and the domain presentation adapters; do not copy domain semantics across categories. Declare taxonomy and high-risk flags. Record every observation with freshness and separate brand/family/model/exactVariant/SKU/GTIN/ASIN. Terminally reconcile every observation as EXACT, REJECTED, or UNKNOWN. Use Amazon Türkiye preferentially for discovery/commerce but never as technical or ranking authority; include manufacturer/support/manual, authorized dealer, or reliable Turkish retail evidence as appropriate. Separate technical evidence, semantics, bounded hierarchical Persona (aggregate <= 0.75, no membership/winner authority), and volatile commerce/media. Generate only candidate Domain Packs, XPY/Secretary/presentation manifests, coverage matrices, readiness gates, checkpoints, and immutable activation plans. Prove pinned-time double-generation and incremental rebuild. Do not activate, migrate, update pointers, push main, or deploy. Return owner decisions and exactly one recommended next real wave.
```

## Reconciled production lineages

The implementation baseline is Mobility end-to-end commit `3113605`, including the platform registry authorization. Its tree contains Electronics runtime release `ELECTRONICS-RUNTIME-CATALOG-TR-v1.2-ALL-CATEGORY-93` (93 products), universal Persona activation `796ccdd` and deployment receipt `d03b79d`, Secretary governed product identity routing, and the active Cars, Appliances, Electronics, Baby, and Mobility XPY/presentation contract patterns. Catalog Factory imports none of their domain semantics and changes no active artifact.

Final Mobility reconciliation: the baseline declares three active Mobility categories and a governed candidate authority, while Persona remains shadow-only/fail-closed. Catalog Factory preserves that boundary and does not reinterpret Mobility data.
