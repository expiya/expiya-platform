# WU-APPL-AMAZON-COMMERCE-READINESS-01

## A. Verdict

**IMPLEMENTED.** The no-credential boundary, current Creators API contract, exact-identity admission, transient projection, manual-link quarantine, offline fixtures, UI action, and 97/97 bounded availability audit are complete. No release, technical pointer, deployment, database schema, or live data was activated.

## B. Repository inspection and reused seams

- The active Appliances scope resolves to 97 exact products across 24 active categories. The audit is pinned to commerce snapshot digest `8b11a5d6f0ce470e29ccb7a6c799ca5894293001ad426e99446ccbf723ceb275`, whose product scope was built from each category's active release pointer.
- Existing `features/appliances/commerce/types.ts`, `authority.ts`, `acquisition.ts`, `loader.server.ts`, and `credentialedActivation.ts` remain the active volatile-offer seam. The new provider contract is additive and does not replace or mutate the active snapshot.
- Existing `features/appliances/media/amazonCreatorsAdapter.ts` is reused to admit API images. Amazon image bytes remain remote and transient; no Amazon text or media was copied into a frozen catalog.
- Existing `features/appliances/nativeConversationRoute.server.ts` attaches commerce only after a `DECISION_READY` result. `features/appliances/recommendation/authorize.ts` computes authorization from catalog, semantic, context, exact identity, and recommendation-artifact fields—not current commerce.
- Existing Stage 3 remains unavailable and explicitly says it creates no offer, request, payment, order, or delivery record.
- Cars was inspected only for shared freshness/offer-boundary mechanics. No Cars candidate semantics, ranking rules, or product identity model was copied.
- Inactive global-evidence candidates and evidence pointers were not touched.

## C. 97-product availability results

Audit window: 2026-09-05 00:38:06–00:40:10 UTC. Access context: logged-out Amazon.com.tr web surface showing Istanbul 34096 delivery context. Every row used one exact brand + frozen manufacturer-model query; 22 plausible detail targets were opened directly. This is bounded observed coverage, not an exhaustive Amazon inventory claim.

Overall: 10 exact active, 11 exact listing currently unavailable, 15 ambiguous/family/accessory-only, 61 not found, 0 blocked/unverifiable. The hypothesis that nearly all 97 products exist on Amazon.com.tr is **rejected**: only 21/97 exact listing pages were confirmed and only 10/97 exposed a current stock/add-to-cart observation.

| Category | Products | Exact active | Exact unavailable | Ambiguous/family | Not found | Blocked |
|---|---:|---:|---:|---:|---:|---:|
| AIR_FRYER | 3 | 1 | 0 | 1 | 1 | 0 |
| AIR_PURIFIER | 3 | 0 | 1 | 1 | 1 | 0 |
| BLENDER | 3 | 2 | 0 | 0 | 1 | 0 |
| BUILT_IN_MICROWAVE_OVEN | 3 | 0 | 0 | 0 | 3 | 0 |
| BUILT_IN_OVEN | 3 | 0 | 1 | 0 | 2 | 0 |
| COUNTERTOP_MICROWAVE_OVEN | 3 | 0 | 0 | 1 | 2 | 0 |
| DISHWASHER | 4 | 0 | 0 | 1 | 3 | 0 |
| DRYER | 3 | 0 | 0 | 1 | 2 | 0 |
| ELECTRIC_STORAGE_WATER_HEATER | 3 | 0 | 0 | 0 | 3 | 0 |
| FILTER_COFFEE_MACHINE | 3 | 1 | 0 | 2 | 0 | 0 |
| FOOD_PROCESSOR | 3 | 0 | 1 | 0 | 2 | 0 |
| FREESTANDING_COOKER | 3 | 0 | 0 | 2 | 1 | 0 |
| FREEZER | 3 | 0 | 1 | 0 | 2 | 0 |
| FULLY_AUTOMATIC_ESPRESSO_MACHINE | 3 | 1 | 1 | 0 | 1 | 0 |
| HOB | 3 | 0 | 0 | 0 | 3 | 0 |
| INSTANTANEOUS_ELECTRIC_WATER_HEATER | 3 | 1 | 1 | 0 | 1 | 0 |
| MANUAL_ESPRESSO_MACHINE | 3 | 1 | 1 | 0 | 1 | 0 |
| RANGE_HOOD | 3 | 0 | 1 | 2 | 0 | 0 |
| REFRIGERATOR | 4 | 0 | 0 | 0 | 4 | 0 |
| ROBOT_VACUUM | 4 | 0 | 2 | 1 | 1 | 0 |
| SPLIT_AIR_CONDITIONER | 3 | 0 | 0 | 0 | 3 | 0 |
| TURKISH_COFFEE_MACHINE | 3 | 1 | 0 | 2 | 0 | 0 |
| VACUUM | 4 | 1 | 0 | 1 | 2 | 0 |
| WASHING_MACHINE | 24 | 1 | 1 | 0 | 22 | 0 |

## D. Product lists

Exact active: `PHILIPS_NA350_00_TR`, `BOSCH_MMB6172S_TR`, `PHILIPS_HR2291_41_TR`, `PHILIPS_HD7462_20_TR`, `PHILIPS_EP2220_10_TR`, `ARNICA_EG54030_HAMMAM_TR`, `DELONGHI_EC685_M_TR`, `ARCELIK_K3300_TFF_TR`, `BOSCH_BGC21X300_TR`, `appliances:wm:tr:samsung:ww11db8b95gbah`.

Exact listing currently unavailable: `PHILIPS_AC1711_10_TR`, `ARCELIK_AFC_120_S_TR`, `BOSCH_MCM3501M_TR`, `ARCELIK_2682_NFB_TR`, `DELONGHI_ECAM220_22_GB_TR`, `ARZUM_AR012_LAGUNA_TR`, `SMEG_ECF02CREU_TR`, `ARCELIK_ADE_6041_B1_TR`, `BOSCH_BCRC2W_TR`, `XIAOMI_X20_PRO_TR`, `appliances:wm:tr:samsung:ww90cgc04daeah`.

Ambiguous/family/accessory-only: `NINJA_AF400EU_TR`, `XIAOMI_AC_M16_SC_TR`, `BEKO_BMD200G_TR`, `BEKO_BM4044_TR`, `BEKO_KM_99_TR`, `ARCELIK_CM3940P_TR`, `BOSCH_TKA6A041_TR`, `ARCELIK_8315_TR`, `BEKO_FE_411_TR`, `ARCELIK_P_18_YCB_TR`, `BOSCH_DWP64CC50T_TR`, `XIAOMI_H40_OV51_TR`, `ARZUM_OK004_0400_TR`, `KARACA_HATIR_HUP_TR`, `PHILIPS_FC9750_07_TR`.

The complete not-found list (61), ASINs/URLs, seller and availability observations, timestamps, result counts, exact-match evidence, sponsorship observations, and confidence are in `data/research/appliances-amazon-commerce-readiness-01/summary.md` and `availability-audit.json`. Blocked/unverifiable: none.

## E. Implementation and changed files

- Provider-neutral contract and exact commerce lookup: `features/appliances/commerce/providerContracts.ts`.
- Fresh/exact/tagged action projection and disclosure: `features/appliances/commerce/projection.ts`.
- Provisional manual affiliate-link admission with audit reference and seven-day maximum lifetime: `features/appliances/commerce/manualAffiliate.ts`.
- Server-only OAuth 2.0 Creators API v3.2 adapter, token cache, ten-ASIN batch bound, exact structured-model gate, OffersV2 mapping, fail-closed response handling, and governed-media bridge: `features/appliances/commerce/amazonCreatorsApi.server.ts`.
- Synthetic offline response fixture: `features/appliances/commerce/fixtures/`.
- Presentation-only affiliate action: `components/xpy/ExternalCommerceAction.tsx`.
- Focused tests: `amazonCommerceBoundary.test.ts`, `amazonAvailabilityAudit.test.ts`, and `ExternalCommerceAction.test.tsx`.
- Reproducible audit generator: `scripts/generate-appliances-amazon-availability-audit.ts`.
- 97-row JSON/CSV and category/list summary: `data/research/appliances-amazon-commerce-readiness-01/`.
- Server secret/configuration and current-policy guide: `docs/appliances-amazon-creators-api-configuration.md`.

## F. Decision-neutrality and security proof

- Provider DTOs expose no score, rank, candidate membership, sufficiency, question order, recommendation rationale, or authorization field.
- Amazon observations are joined by frozen exact product ID + category + pre-bound ASIN + structured manufacturer model/part-number tokens + brand. ASIN or title similarity alone fails closed.
- Partial batches reject all observations. Unknown, unavailable, stale, malformed, wrong-category, wrong-model, untagged, or wrong-ASIN observations produce no affiliate action.
- Manual affiliate links are a separate source class, require an exact tagged Amazon target and audit reference, and expire within seven days.
- Offer observations expire after one hour. Image/detail content is URL-only and capped at one day; the existing Amazon media adapter enforces transient display, link, disclosure, attribution, and license reference.
- Credential access is confined to a module marked `server-only`. Only non-`NEXT_PUBLIC_` variables are accepted; secrets live in a closure, are never returned, and tests assert that response serialization contains no credential secret.
- OAuth tokens are cached in server memory for at most their one-hour lifetime with a safety margin. Rate limits, authorization failures, endpoint failures, and malformed responses are distinct fail-closed states.
- The generated audit is research evidence only. No active commerce or technical pointer was changed, and no Amazon observation was inserted into a frozen catalog.

## G. Focused verification evidence

- `npx vitest run ...`: 7 files, 28 tests passed in the final focused run.
- `npx tsc --noEmit`: passed.
- Scoped ESLint across the new boundary, UI, tests, and audit generator: passed.
- `git diff --check`: passed.
- The audit generator produced exactly 97 rows, 24 categories, and status totals of 10 + 11 + 15 + 61 + 0.
- Two consecutive audit generations produced identical SHA-256 values for the JSON, CSV, and Markdown artifacts.
- Existing recommendation completion, existing commerce authority, existing Amazon media adapter, and existing affiliate-media rendering tests were included in the focused run.

## H. Remaining account/credential prerequisites

- Amazon currently requires a reviewed, finally accepted Associates account with qualified referred sales before Creators API registration. Only the primary account owner can register. See https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api.
- Register the Amazon.com.tr Associates store and obtain its Partner Tag. Türkiye is an EU-region marketplace using credential version 3.2 and the EU Login with Amazon token endpoint. See https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl.
- Create a Creators API application and credential ID/secret in Associates Central. Amazon currently allows up to two applications per store and two credential sets per application. Store values only in the server deployment secret manager.
- PA-API 5 is deprecated; legacy AWS credentials do not work with Creators API. See https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation.
- Obtain and retain the Türkiye Associates/IP License acceptance reference; comply with one-hour Offers and one-day other-resource cache guidance, tagged Special Links, and clear link/site disclosures. See https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices and https://gelirortakligi.amazon.com.tr/help/operating/policies#Associates%20Program%20IP%20License.

## I. Next bounded work unit

**WU-APPL-AMAZON-CREATORS-CREDENTIAL-CANARY-01:** after final Associates acceptance and server-secret provisioning, run a non-activating Creators API canary for the 21 directly verified ASINs, reconcile structured model/part-number and OffersV2 fields against this audit, and produce an owner-review manifest without changing any runtime pointer.
