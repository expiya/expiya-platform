# WU-XPY-STAGE2-STANDARDIZATION-FOUNDATION-01 — final A–M report

## A. Scope and disposition

`FOUNDATION_COMPLETE / NO_CATEGORY_ACTIVATED / NO_DEPLOYMENT`. This unit adds a domain-neutral AŞAMA 2 contract, renderer, advisor safety boundary, registry and executable readiness gates. Existing Cars and Appliances routes remain unchanged. No catalog, ranking, Persona, database, merchant, affiliate, sales action or AŞAMA 3 authority changed.

## B. Reconciled production lineage

The branch starts at final Mobility lineage `3113605`, whose ancestry contains Universal Persona authority/deployment `796ccdd`/`d03b79d` and Universal Stage 1 card revision `78e120a`. It explicitly merges Electronics v1.2 release/lint line `22aed92`, signed Appliances Stage 2 recovery line `0b55b02`, governed Secretary product identity line `3b01cb2`, and catalog portfolio taxonomy line `95299a2`. Conflicts in older shared files retained the later Mobility/Universal implementation; Electronics-only artifacts and subsequent independent governance artifacts were admitted. Source checkout bytes were never edited.

## C. Cars parity matrix

| Concern | Shared platform responsibility | Cars-only semantics / retained implementation |
|---|---|---|
| Entry | Require a signed, expiring, revision-bound Stage 1 decision handoff | V3 offer reveal, recommendation terms and exact vehicle candidate membership |
| Identity | Preserve exact product and configuration identity | Exact variant, trim, model year and TR configuration construction |
| Reproducibility | Bind conversation, revision, decision and evidence release/fingerprint | Cars catalog release/fingerprint and decision-state digest |
| Product view | Standard sections for media, facts, daily meaning, limits and price state | Vehicle facts, equipment, colors, gallery/video and claim dispositions |
| Price/media | Render explicit verified/observed/unavailable and verified/restricted/unavailable states | Cars price observation and vehicle-media policy |
| Comparison | Offer after selected product and before Advisor; require purchased entitlement | Vehicle comparison candidates, rows and evidence caveats |
| Advisor | Read-only answers within selected plus entitled products; no Stage 1 reopening | Turkish vehicle question semantics and Cars evidence resolver |
| Replay/expiry/tamper | Recheck time and every current-authority field; domain adapter verifies signature first | Cars HMAC/token cache, offer recovery and catalog re-evaluation |
| Navigation | Shared AŞAMA shell, semantic headings, keyboard-visible controls and 390px-first layout | `/cars/variant/[exactVariantId]` route and Cars visual/content pack |
| Commerce | Shared foundation keeps actions false | Cars-only existing AŞAMA 3 pilot remains separate and unchanged |

## D. Stage 2 readiness inventory — active departments/categories

| Department | Categories | Stage 2 readiness | Missing before shared activation |
|---|---|---|---|
| CARS | `NEW_CAR` | Existing signed Cars runtime is authoritative; shared adapter not registered | Cars projection adapter plus parity characterization against existing page |
| APPLIANCES | `WASHING_MACHINE`, `REFRIGERATOR`, `DISHWASHER`, `DRYER`, `VACUUM`, `ROBOT_VACUUM`, `FREEZER`, `BUILT_IN_OVEN`, `FREESTANDING_COOKER`, `HOB`, `RANGE_HOOD`, `COUNTERTOP_MICROWAVE_OVEN`, `BUILT_IN_MICROWAVE_OVEN`, `AIR_PURIFIER`, `FULLY_AUTOMATIC_ESPRESSO_MACHINE`, `MANUAL_ESPRESSO_MACHINE`, `FILTER_COFFEE_MACHINE`, `TURKISH_COFFEE_MACHINE`, `AIR_FRYER`, `BLENDER`, `FOOD_PROCESSOR`, `ELECTRIC_STORAGE_WATER_HEATER`, `INSTANTANEOUS_ELECTRIC_WATER_HEATER`, `SPLIT_AIR_CONDITIONER` | Existing signed v2 handoff/read projection is authoritative; shared adapter not registered | Appliances projection adapter, category-row mapping, parity characterization |
| ELECTRONICS | `SMARTPHONE`, `LAPTOP`, `TABLET`, `MONITOR`, `TELEVISION`, `E_READER`, `HEADPHONES`, `PORTABLE_SPEAKER`, `SOUNDBAR`, `DIGITAL_CAMERA`, `PROJECTOR`, `GAME_CONSOLE`, `WIFI_ROUTER_MESH`, `NETWORK_ATTACHED_STORAGE`, `EXTERNAL_STORAGE`, `PRINTER`, `WEBCAM`, `COMPUTER_AUDIO`, `SMARTWATCH`, `FITNESS_TRACKER`, `HOME_SECURITY_CAMERA`, `VIDEO_DOORBELL`, `SMART_HOME_HUB`, `UNINTERRUPTIBLE_POWER_SUPPLY` | Not authorized for Stage 2 | Signed decision handoff, Stage 2 projection authority, category comparison rows, Advisor evidence policy |
| BABY_AND_CHILD | `STROLLER` | Not authorized for Stage 2 | Signed decision handoff, Stage 2 projection adapter, comparison rows, Advisor evidence policy |
| MOBILITY | `ELECTRIC_SCOOTER`, `ELECTRIC_BICYCLE`, `BICYCLE` | Not authorized for Stage 2 | Signed decision handoff, Stage 2 projection adapter, comparison rows, Advisor evidence policy; Mobility Persona remains shadow-only |

The executable inventory contains 53 category records: 25 with existing domain Stage 2 authority and 28 intentionally `MISSING_STAGE_TWO_AUTHORITY`. An existing-authority category is still `MISSING_ADAPTER` until explicitly registered; lookups always throw `XPY_STAGE_TWO_ADAPTER_MISSING` rather than falling back.

## E. Shared typed contracts

`features/xpy/stageTwo/contracts.ts` defines the protocol, current-authority comparison, product/fact/media/price presentation states, entitlement, category-owned comparison rows, read-only boundaries and adapter seam. `validateXpyStageTwoEntry` checks exact identity, configuration, conversation, decision revision/fingerprint, evidence release/fingerprint, issue/expiry and replay policy. It does not pretend to verify signatures: `openSignedHandoff` remains a mandatory server/domain adapter responsibility.

## F. Standard renderer

`components/xpy/XpyStageTwoRenderer.tsx` establishes the reusable information order: authorized product header/media; specifications and daily-life meanings; limitations; price state; comparison-report offer; then Sales Advisor boundary. It uses semantic sections, heading relationships, disclosure status, mobile-first spacing and `sm`/`md`/`lg` adaptations suitable for 390×844 and desktop. It contains no product semantics and is not wired to a route in this unit.

## G. Sales Advisor boundary

`answerBoundedStageTwoQuestion` is a shared safety guard, not a replacement for Cars or Appliances language semantics. It answers only from the authorized projection; refuses selection reruns/new products; requires entitled comparison products; and returns unknown rather than inventing evidence. The UI names it “Satış Danışmanı” and expressly distinguishes it from XPY.

## H. Comparison entitlement and placement

`PURCHASED` carries an entitlement ID, exact-product allowlist and evidence-set fingerprint. `NOT_PURCHASED`, `REVOKED` and `EXPIRED` all render locked. Rows are declared `CATEGORY_DOMAIN_PACK`-owned. The standard placement constant is `AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR`; sales/affiliate/merchant activation is not part of this contract.

## I. Refresh, replay, expiry and tamper protection

Shared validation permits refresh/replay only under `REVISION_BOUND_REUSABLE_UNTIL_EXPIRY`. Signature/tamper verification precedes shared validation inside each server adapter. A changed conversation, decision revision/fingerprint, exact product, configuration, evidence release/fingerprint, malformed time, future issue or expiry fails closed. Historical reproduction retains identifiers and authority versions; it never silently upgrades to current product bytes.

## J. Missing Domain Pack fields and executable gates

Before a category can register, its approved Stage 2 pack must provide: signed handoff authority version; exact product/configuration identity; decision revision/fingerprint; evidence release/fingerprint; projection schema; governed media and price states; fact evidence states; daily meanings/limitations; category-owned comparison rows; purchased-entitlement exact-ID policy; bounded Advisor semantics; and recovery/revalidation behavior. `registerXpyStageTwoAdapter`, `requireXpyStageTwoAdapter` and `stageTwoReadinessGate` enforce the current allowlist and missing-adapter closure. They reject invented Electronics, Baby or Mobility adapters.

## K. Characterization and non-regression verification

Focused tests cover exact current authority, revision/evidence mismatch, expiry, selected-product answers, comparison and Stage 1-reopen refusal, 53-category inventory, missing-adapter failure, unauthorized registration, semantic renderer structure, locked disclosure, mobile classes and comparison-before-Advisor placement. Scoped TypeScript uses `tsconfig.stage2-foundation.json`. Full-repository TypeScript cannot run from the deliberately sparse clone because excluded historical catalog/evidence JSON imports are absent; this is an environment/checkout constraint, not a discovered source regression. No Node build is required because no existing runtime import changed.

## L. Commit and release state

Branch: `codex/xpy-stage2-standardization-foundation-01`. This task does not push: authorization permits a clean bounded branch and exact commit reporting, but does not expressly authorize a remote push. No deploy occurred.

## M. Exactly one next bounded implementation unit

**Next unit: Cars shared AŞAMA 2 adapter parity, and nothing else.** Adapt the existing signed Cars `openPhase2Experience` and `VariantContentArtifact` into `XpyStageTwoProjection`; define Cars-owned comparison rows; characterize byte/meaning parity for identity, facts, limitations, media, price and Advisor scope; then wire only the Cars variant route to the shared renderer behind the existing Cars handoff. Do not add Appliances/Electronics/Baby/Mobility adapters, commerce actions or AŞAMA 3 changes in that unit.
