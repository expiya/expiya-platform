# Appliances 24-category readiness audit

Verdict: **NOT PROGRAM COMPLETE**. The checkout recognizes 24 categories and admits 23 to the runtime, but only 84 exact members exist, five ACTIVE Batch A categories have one Bosch member each, Split AC has no admissible exact indoor/outdoor pair, no category has checksum-and-locator local manual readiness, only 6/43 original-category products have governed media, and no new-category product is present in the commerce/media snapshot.

The machine-readable result is `docs/audits/WU-XPY-APPL-24-CATEGORY-COMPLETION-MEDIA-COMMERCE-UX-AUDIT-01.matrix.json`.

## Totals and user-visible readiness

- Registry: 23 ACTIVE, 1 NOT_READY; runtime catalogs: 84 members (43 original-six, 41 new-category); Split AC: 0.
- Thin catalogs: FREEZER, BUILT_IN_OVEN, FREESTANDING_COOKER, HOB and RANGE_HOOD are runtime-active but each has only one product and one brand. They can deterministically emit a singleton without offering a meaningful catalog choice, so they are not catalog-complete.
- Exact identity: every admitted member asserts market `TR` and an exact model/configuration. Split AC correctly remains NOT_READY because an exact paired indoor/outdoor set is unresolved.
- Landing mismatch: `/appliances` still says “six active categories” and publishes only the original six cards, while `/appliances/analysis` exposes all 24 categories. This is public-count inconsistency. The analysis selector uses Turkish labels and does not expose enum identifiers; the tied-set card does expose internal `productId` as “Ürün kaydı”, which is traceability leakage into ordinary UI.
- AŞAMA 1: common frame, conversational input, category buttons, one-question planner, typed answer buttons, budget decision-filter toggle, retry, revision conflict recovery, reset and URL-fragment READ recovery are implemented. General-information intent is non-mutating, then asks purchase interest when appropriate. Correction supersedes/clears prior events. Y uses hard compatibility plus evidence-backed Pareto/singleton logic, no scores/weights/price ranking/implicit tie-break.
- AŞAMA 2 and 3 are visually consistent shells but intentionally UNSUPPORTED. Advisor is information/read-only and cannot change Y. Paid comparison and seller/contact action are not implemented and must only consume an authorized exact AŞAMA 1 set.
- Persistence/API: strict CREATE/TURN/READ route, PostgreSQL initialization, optimistic revision, idempotent message replay, payload-conflict rejection, authority pinning, card reconstruction and migrations 0009-0013 exist. No migration was applied in this audit. One API characterization is stale and now expects an ACTIVE microwave to be NOT_READY.

## Media, manuals and commerce

The sole appliance image in `public/` is the landing hero, not a product asset. The volatile commerce snapshot governs 43 original-category identities and supplies six exact approved remote manufacturer images: one product in each original category. The card adapter renders an approved image when present and an explicit unavailable state otherwise. All 17 admitted new categories have 0 governed product images.

No local appliance manual byte artifact exists. Remote manual/source links exist (notably five washing-machine and two dryer manual sources, plus scattered new-category links), but no local immutable bytes have both SHA-256 and page/section locator; every category is therefore L9-not-ready. The original richness releases expose L1-L9 structures, but `l9AdvisorKnowledge` is empty. Known missing facts/regimes remain neutral and non-advantaging.

At audit time the commerce snapshot (published 2026-09-04 09:00 +03, offer expiry 2026-09-05) is fresh but sparse: five exact offers cover four products—two washing machines and two vacuums. Only Bosch BGC41PET has two channels (Bosch and Trendyol). The separate washing-machine price projection expired 2026-09-04 02:10 +03 and is stale; its former coverage was 19 PRICE_AVAILABLE / 5 PRICE_UNKNOWN. Stale or absent price makes budget eligibility unknown and does not remove a technically valid candidate.

## Verification

- Focused Vitest: 74 files passed, 2 failed; 787 tests passed, 2 failed. Failures are stale integration expectations: runtime binding expects 7 rather than 24 total bindings, and the API test expects COUNTERTOP_MICROWAVE_OVEN to be inactive.
- TypeScript: failed because `features/xpy/crossRuntimeAcceptance.test.ts` omits both water-heater category corpus entries.
- Scoped ESLint: passed.
- `next build --webpack`: failed in the known environment boundary at `WasmHash._updateWithBuffer` under Node 26.6.0. Package policy declares Node 24.x, so this is Environment until reproduced on the declared toolchain; it does not excuse the test/type failures.

## Gap routing and closure sequence

1. **Implementation** — reconcile public landing pack with the 24-category registry; derive labels/counts from one public projection, retain NOT_READY presentation, remove internal product IDs from ordinary tied-set UI, and repair the two stale tests plus two missing cross-runtime corpus entries.
2. **Product + Data Acquisition** — expand the five Batch A singleton catalogs to a predeclared minimum brand/member threshold using exact current Türkiye configurations. Do not call them catalog-complete before that gate passes.
3. **Data Acquisition + Architecture** — create one governed acquisition pipeline for exact product media, immutable manual bytes/checksums/page-or-section locators, and volatile exact offers; keep each authority independently replaceable and never fold commerce/media into frozen catalog digests.
4. **Data Acquisition** — run that pipeline across all 84 admitted members, prioritizing recommendation-reachable products; require manual L9 validation and safe locator projection, rights/provenance approval for media, and at least two independent merchant channels where available. Preserve honest unavailable/unknown states.
5. **Product + Architecture** — resolve Split AC as one exact Türkiye indoor/outdoor paired configuration with sizing and installation boundaries, then publish category authority/Y only after pair-integrity tests pass.
6. **Implementation** — add full category-by-category UI/runtime acceptance: general-information intent, exactly one question, choice binding, correction, retry/READ recovery, deterministic tie/set authorization, budget-off and budget-unknown behavior, and no enum leakage.
7. **Deferred** — publish Advisor/paid-comparison authority and AŞAMA 2/3 handoff only after the exact-set contract, commercial neutrality, consent and seller boundaries are approved.
8. **Environment** — run type/test/lint/build on Node 24.x; record whether WasmHash disappears, then route any remaining build fault to implementation.

## Immediate next work unit (exactly one)

**WU-XPY-APPL-PUBLIC-RUNTIME-CONSISTENCY-AND-CHARACTERIZATION-01**: repair the three deterministic integration failures; make the landing and analysis selectors consume one 24-category public registry projection with accurate ACTIVE/NOT_READY counts and no enum/product-ID leakage; add assertions for 24 visible Turkish labels, 23 active routes, Split AC fail-closed behavior, all-category runtime binding, both water-heater acceptance cases, one-question/answer-button behavior, and unchanged AŞAMA 2/3 boundaries. Run focused tests, TypeScript, scoped lint and Node-24 webpack build. Do not change catalog membership, semantic/Y authority, media/manual/commerce data, migrations, deployment or production state.
