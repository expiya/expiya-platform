# Cars + Appliances XPY platform execution-readiness ledger

Date: 2026-09-05  
Work unit: `WU-XPY-PLATFORM-READINESS-AUDIT-01`  
Authoritative checkout: `/Users/serdarakgul/Projects/expiya-platform`  
Verdict: **READY_FOR_CONTROLLED_PREVIEW**

Final UX/control work unit `WU-XPY-AŞAMA1-2-3-FINAL-UX-CONTROL-01`: **IMPLEMENTED**. Cars remains the structural and visual reference, Appliances retains its own 24-category semantics, and the product-facing AŞAMA 1/2/3 surfaces now use user language instead of internal identifiers, enums, hashes, authority terminology or test labels. No additional repository UX cleanup cycle is required for this work unit.

The current checkout is one coherent XPY platform, not two independent decision products. Cars and all 24 Appliances categories bind to `XPY_RUNTIME/v0.1`; shared code owns the X/P/Y lifecycle, stage presentation grammar, catalog-revision contract and AŞAMA 3 entry boundary, while governed Domain Packs retain category semantics and evidence. The repository is not ready for live commerce or production delivery. Those states are either deliberately fail-closed or require Product, legal, provider and operations authority.

Update — `WU-XPY-APPLIANCES-A2-PREVIEW-TRUTH-AND-L9-BINDING-01`: **PASS**. Appliances presents AŞAMA 2 as an AŞAMA-1-decision-only preview; direct/sample entry remains non-authoritative. The manual read path resolves and digest-checks the active v0.2 pointer, manifest, release, immutable bytes/text and locators, then admits only product/category/catalog-release/configuration-compatible L9 knowledge to the read-only Advisor. Missing or mismatched knowledge stays unavailable without blocking the already-authorized decision. No L9 data enters P, Y, filtering, sufficiency, ranking, recommendation, comparison entitlement, price/offer claims or AŞAMA 3 actions.

This verdict permits a controlled, non-transactional preview only. It does not assert deployment, production-database readiness, live seller/offer/payment capability, complete catalog richness, licensed media coverage, or legal approval.

## A. Overall verdict

**READY_FOR_CONTROLLED_PREVIEW** for:

- Cars AŞAMA 1 and signed AŞAMA 2 evaluation;
- Cars AŞAMA 3 internal pilot request preparation with outbound delivery blocked;
- Appliances AŞAMA 1 across all 24 active categories;
- Appliances signed AŞAMA 2 evaluation when the preview database and keyring are configured;
- the honest Appliances AŞAMA 3 unavailable state.

**Not ready for production activation** because live legal/controller authority, external seller/provider authority, durable Cars production persistence/delivery, production key/KMS and distributed controls, migration promotion evidence, product-media rights, current offers, payment/order/fulfillment authority and production operations are incomplete.

## B. Completed capability matrix

| Capability | Shared XPY owner | Domain Pack / adapter owner | Result |
|---|---|---|---|
| X Assistant | Information, advisory, social/off-topic/safety routing; no context write or Y authority | Cars and each Appliance category supply governed vocabulary and copy | PASS |
| P Question Planner | One material question, choices, uncertainty/deferral, pending-question continuity and loop suppression | Cars and Appliance packs supply concepts, materiality and question policy | PASS |
| Y Decision Maker | Validated-context-to-candidate-to-sufficiency-to-selection-to-authorization order | Domain packs supply catalog, evidence, hard compatibility, selection and card fields | PASS |
| Transaction lifecycle | Preflight, replay, payload conflict, revision conflict, authority check and one commit | Cars memory/signed-state adapter; Appliances PostgreSQL CAS/message store | PASS, with Cars durability gap below |
| Cars AŞAMA 1 | Shared runtime and stage-one shell | V3.8 Cars ports and `NEW_CAR` pack | PASS; 549 exact variants |
| Appliances AŞAMA 1 | Shared runtime and stage-one shell | 24 category authorities and four retained evaluation adapter families | PASS; 97 exact products, 92 eligible and 5 explicitly ineligible |
| Question-to-card trace | Shared phase ordering and public presentation contract | Context ledger, candidate evaluation, sufficiency, selection, recommendation and authorization fingerprints remain domain-bound | PASS |
| Card authorization | Card cannot be projected before a current authorization fingerprint | Exact vehicle/product identity, configuration, catalog and semantic digests | PASS |
| AŞAMA 2 entry | Signed, expiring, revision/decision/product/configuration-bound handoff | Cars preserves revealed-offer semantics; Appliances uses `appliances-stage2-handoff/v2` | PASS |
| AŞAMA 2 Advisor | Read-only; cannot mutate context, rerun Y or add products | Domain evidence and explanations | PASS |
| Comparison | Exact authorized set, neutral unknowns, separate entitlement | Category dimensions and evidence; external issuer absent | FOUNDATION PASS; purchase activation unavailable |
| Standard sales actions | Action contracts, same-origin routes, idempotent bounded execution | Cars quote/test-drive/dealer-contact pilot; Appliances offer/share/report states | PASS; external actions remain unavailable or non-delivering |
| AŞAMA 3 | Shared entry binding and responsive shell; `externalExecutionAuthorized: false` | Cars pilot form semantics; Appliances category-language unavailable state | PASS / FAIL-CLOSED AS DESIGNED |
| Experience system | Shared AŞAMA 1/2/3 navigation, shell, responsive breakpoints, touch targets and accessibility grammar | ROAD and STUDIO_CYCLORAMA data-only visual packs | PASS |
| Catalog revision | `xpy-catalog-revision/v1`, digest/membership checks, revalidation matrix and historical read-only recovery | Existing Cars and Appliance validators remain authoritative | PASS; no automatic activation |
| Volatile data isolation | Price, media and offers are exact-ID/revision joins and have no Y authority | Domain loaders and public fallbacks | PASS |
| Security boundary | Strict schemas, body limits, same-origin browser boundary, rate limiting, HMAC verification and redacted/no-store failures | Domain binding and replay rules | PASS for preview contracts; production controls still required |

Cars is therefore the structural and visual reference without becoming the Appliances semantic authority. The public Cars route enters the shared native runtime through explicit prepare/plan/decide ports; it does not bypass XPY with the whole-turn convenience adapter. The Appliances HTTP route is transport-only and all 24 active categories bind to the same runtime version/digest.

### Runtime and catalog facts

- Cars dry-run: release `0.55.4`, 549 unique exact variants, Türkiye scope, catalog and membership digests valid.
- Appliances dry-run: 24 active category releases, 97 unique exact products, 92 eligible and 5 explicitly ineligible. Washing Machine has 24 members; Refrigerator, Dishwasher, Vacuum and Robot Vacuum have 4 each; Dryer has 3; each of the remaining 18 categories has 3, including three exact Split AC pairs.
- Every admitted revision member has Türkiye market scope, non-empty exact identity/configuration, provenance and evidence. Ineligible members remain represented rather than silently promoted or discarded.
- Appliances manual active pointer selects v0.2: 14 admitted immutable manuals and 9 locator-backed, exact-product L9 entries. Eighty-three products have no admitted manual; absence is neutral.
- Appliances media release covers all 97 identities but admits 0 assets: 10 remain retryable, 14 fail identity proof and 73 fail reuse-rights proof.
- Appliances commerce covers all 97 identities, recorded 485 failed acquisition attempts and contains 0 verified current offers. The separate Washing Machine price projection is historical/stale and cannot establish current offer availability.
- Warranty, lifecycle and Türkiye applicability are typed and projected where evidence exists. They are not uniformly exact-complete across either domain; missing values remain limitations/unknowns and cannot advantage a candidate.
- Cars passes catalog admission but is not content-complete: technical, equipment, daily-life, experience and exact-manual richness remain partial. This is a quality boundary, not a reason to fabricate facts.

## C. Real blockers

| Blocked outcome | Classification | Owner | Evidence / required authority |
|---|---|---|---|
| Live Cars lead delivery | PRODUCT | Cars Product + Legal | Final controller identity, MERSİS/address/contact channels, retention/erasure rules, transfer basis, consent text and external counsel approval are absent; `LEGAL_READY` is false. |
| Real Cars dealer/SMS/CRM or portal delivery | EXTERNAL_PROVISIONING | Partnerships + Legal + Provider owners | Current dealer is explicitly fake/non-production; SMS and dealer-delivery adapters are not approved or connected; outbound envelope remains `BLOCKED_LEGAL_REVIEW`. |
| Production Cars state and action durability | OPERATIONS/DEPLOYMENT | Cars Platform Operations | Public V3 conversation, revealed-offer registry, handoff caches and sales-request repository are process-memory compatibility/pilot stores. Production activation requires durable adapters with multi-instance replay, revocation and unique idempotency controls. |
| Actionable Appliances AŞAMA 3 | PRODUCT | Appliances Product | No approved request-capture, seller-contact, payment, order, stock or fulfillment authority. The shared unavailable state is the correct implementation, not a repository failure. |
| Current Appliance offers and licensed product media | EXTERNAL_PROVISIONING | Commerce/Data Partnerships + Brand/Legal | Credentialed feeds and explicit reuse-right declarations are absent; current coverage is 0 offers and 0 admitted media. |
| Paid comparison activation | EXTERNAL_PROVISIONING | Payments/Product + Legal | Durable entitlement contract exists, but no selected payment provider, verified webhook adapter, purchase/refund reconciliation or approved exact multi-product evidence-set materialization exists. |
| Production database and schema promotion | OPERATIONS/DEPLOYMENT | Database/Release Operations | Migration files 0009–0014 exist. A read-only check of the configured preview database on 2026-09-05 confirmed that the 0014 `comparison_entitlements` and `comparison_entitlement_events` tables are absent. No migration was applied by this work unit. |
| Production secrets and distributed protection | OPERATIONS/DEPLOYMENT | Security/Platform Operations | Production KMS/key ownership, a persistent Appliances Stage-2 keyring, Cars signer rotation, distributed rate limit, audit sink and revocation operation must be configured and exercised. Browser verification used only an ephemeral local signing key; no repository or environment secret was written. |
| Production deployment/go-live | OPERATIONS/DEPLOYMENT | Release Operations | No deployment, migration, release activation, provider activation or production smoke was performed by this audit. |

There is no repository-contract blocker to AŞAMA 1 controlled preview. Appliances AŞAMA 2 is locally unavailable until its keyring and compatible database schema are supplied. Live external actions remain blocked by design.

## D. Non-blocking evidence coverage

Cars and Appliances evidence richness remains uneven and incomplete. This is owned by Product and external Domain Data/Evidence providers, reduces explanation depth and comparison usefulness, and does not require another repository UX cleanup pass. Deterministic eligibility, honest unknown states and the 24-category / 97-product Appliances baseline remain intact.

## E. Production activation prerequisites

1. Use the declared Node 24.x toolchain in CI/release. The verified production build used Node 24.19.0; the host Node 26 runtime is outside the repository contract and was not accepted as build evidence.
2. Select the target staging and production databases explicitly; verify applied migration checksums and promote 0009–0014 through reviewed backup/rollback procedures. Do not infer application from file presence.
3. Configure a versioned Appliances AŞAMA 2 HMAC keyring and Cars production signers in the secret manager/KMS; exercise rotation, overlap, revocation and audit logging.
4. Configure distributed rate limiting and validate proxy/origin policy, CSP, logging/redaction, body capture, monitoring and incident response in the deployed topology.
5. Replace Cars process-memory state, offer/handoff, OTP/request and delivery components with durable, atomic production adapters; preserve revision, replay, revocation and idempotency bindings.
6. Complete Cars controller/legal artifacts, retention/erasure, data-transfer analysis, dealer contracts/directory, SMS/provider review, CRM/portal allowlists and external security/legal approval.
7. Keep Appliances AŞAMA 3 unavailable until Product approves each external capability and the relevant provider authority is independently verified. Do not let catalog facts imply seller, offer, stock, payment, order or fulfillment authority.
8. Admit media only with asset-level identity, rights, attribution and revocation evidence; admit offers only from credentialed, current, exact-product feeds with expiry/revocation tests.
9. Run staging browser/E2E, accessibility, multi-instance replay/idempotency, rollback and observability drills, then execute an explicit release decision. No dry-run result may activate a pointer automatically.

## F. Final control closure

`WU-XPY-AŞAMA1-2-3-FINAL-UX-CONTROL-01` is **IMPLEMENTED**. The shared landing, stage navigation, cards, evaluation/advisor surfaces and unavailable/action states are coherent on desktop and mobile; Cars and Appliances use domain-specific nouns and semantics; public presentation adapters humanize internal configuration values and disclosures; guarded routes remain guarded. Remaining work is limited to the Product, external-provider and operations activation prerequisites in sections C and E.

## G. Verification evidence

| Evidence | Result |
|---|---|
| `npm run catalog:revision:dry-run -- --domain cars --release 0.55.4` | PASS; 549 members; unchanged compatibility; no automatic activation or pointer mutation |
| `npm run catalog:revision:dry-run -- --domain appliances --all-active` | PASS; 24 categories / 97 products; no pointer mutation |
| Focused XPY/Cars/Appliances/AŞAMA/security/catalog/migration suite | PASS; prior audit 39 files / 289 tests; final UX/control slice 32 files / 276 tests |
| TypeScript under the declared Node 24 runtime | PASS; `tsc --noEmit --pretty false` |
| Scoped ESLint over the final UX/control runtime, routes, components and tests | PASS |
| Clean isolated production build | PASS on Next.js 16.3.0 / Node 24.19.0 using the required runtime and npm CLI; 609 static pages generated; route table includes all Cars and Appliances AŞAMA/API surfaces |
| Desktop/mobile browser smoke | PASS for Cars and Appliances landings, AŞAMA 1, guarded AŞAMA 2 and AŞAMA 3 states; 390 px mobile checks had no horizontal overflow; a real Vacuum decision produced the Bosch BGC41PET card and a valid signed AŞAMA 2 link |
| Signed Appliances AŞAMA 2 read in configured preview database | FAIL-CLOSED AS DESIGNED; the valid link was issued, then refused because migration 0014 tables are absent; database remained untouched |
| `git diff --check` | PASS |
| Deployment, external acquisition, production DB mutation, migration application and release activation | NOT PERFORMED |

The clean build was run only after stopping the development server and moving its generated `.next` directory to a recoverable temporary backup, preventing development and production webpack processes from sharing a cache. Network access was allowed solely for the existing `next/font` Google Fonts fetch. Deployment, acquisition, migration, release activation and production-data mutation were not performed.
