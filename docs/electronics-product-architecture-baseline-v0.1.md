# Electronics Product / Architecture / Development Baseline v0.1

Status: `READY_FOR_IMPLEMENTATION` (planning authority only)  
Work unit: `WU-ELECTRONICS-PRODUCT-ARCHITECTURE-BASELINE-01`  
Department: `ELECTRONICS`  
Market: `TR`  
Executable activation: forbidden by this baseline

## 1. Decision and repository basis

Electronics shall be a Domain Pack on the existing XPY platform: X Assistant, P Question Planner and deterministic Y Decision Maker. It shall not introduce a second conversation engine, catalog lifecycle, persistence system, stage handoff, entitlement model or presentation framework. Cars is a structural/parity reference only. Appliances proves multi-category registration and staged category adoption, but neither department supplies Electronics semantics.

The current repository already provides the reusable responsibilities:

| Responsibility | Existing authority to reuse | Electronics action |
|---|---|---|
| XPY protocol/runtime binding | `features/xpy/contracts.ts`, `runtimeContract.ts`, `runtime.ts` | Bind, do not fork |
| Domain Pack registration | `features/xpy/domainPacks.ts` | Add only in the runtime work unit after category gates pass |
| L1-L10 catalog layering | `features/xpy/catalog/contract.ts` | Reuse interfaces; add Electronics validators and semantics |
| Frozen revision and revalidation | `features/xpy/catalog/revision.ts` | Generalize its department type before Electronics activation; preserve explicit operator activation |
| Department capability routing | `features/platform/departmentRegistry.ts` | Add only in presentation/production work; unsupported until then |
| Multi-category pattern | `features/appliances/categoryRegistry.ts` | Reuse registry pattern, never Appliances meanings |
| Commerce separation | XPY external snapshots and Appliances commerce artifacts | Exact product join at L10 only |
| Media authority | `data/governance/product-media/README.md` | Apply unchanged |
| Database persistence | Cars/Appliances conversation and catalog migrations | Extend shared concepts or add department tables only when runtime requires them; no baseline migration |

Current constraints are intentionally conservative. `CatalogRevisionDepartment` accepts only Cars and Appliances, `requireXpyDomainPack` has no Electronics pack, and the department registry has no Electronics entry. Therefore any Electronics release would fail closed today. This is correct for this work unit.

## 2. Bounded taxonomy and waves

The machine-readable planning registry is `features/electronics/architectureBaseline.ts`. All 24 categories are `CATEGORY_POLICY_REQUIRED`, not active.

### Wave 1 — high-demand personal/display foundations

Smartphone, laptop, tablet, monitor, television and e-reader. These establish difficult but broadly reusable identity rules: regional model codes, configurable compute specifications, screen variants, connectivity variants, operating-system support and bundle exclusion.

### Wave 2 — audio, imaging and entertainment

Headphones, portable speaker, soundbar, digital camera, projector and game console. These require category rules for fit/listening claims, bundle topology, optical systems, throw geometry and platform ecosystems.

### Wave 3 — network, storage and desk infrastructure

Wi-Fi router/mesh, NAS, external storage, printer, webcam and desktop computer speakers. These establish topology, host/network compatibility, consumables, populated/unpopulated storage and workload evidence.

### Wave 4 — wearables, smart home and protected power

Smartwatch, fitness tracker, home security camera, video doorbell, smart-home hub and UPS. This wave follows only after privacy, subscription/cloud dependency, health-claim, installation and electrical-safety policies exist.

The waves are an implementation sequence, not ranking or market priority. Research within a wave may run in parallel; a category cannot borrow another category's sufficiency or recommendation policy.

## 3. Exclusions and border rules

Excluded from this baseline taxonomy:

- loose accessories and consumables: cases, cables, chargers, adapters, mounts, straps, ink/toner, paper, memory cards, standalone lenses and spare batteries;
- internal PC components and custom builds: CPU, GPU, motherboard, RAM modules, internal drives, cases, power supplies and assembled-to-order configurations;
- refurbished/used products, grey imports, marketplace-only seller-created bundles and unidentified family listings;
- professional/broadcast, industrial, medical, surveillance-system and enterprise datacenter equipment;
- drones, radio transmitters and other categories needing a separate regulatory/operation policy;
- software, subscriptions, games, warranties, installation and connectivity services as product candidates;
- appliances already owned by Appliances, including robot vacuums, air purifiers, air conditioners and kitchen/home appliances.

Border test: classify by the primary decision object, not by the presence of electronics. A device whose primary outcome is domestic cleaning, climate, cooking, laundry or water heating remains Appliances. A device whose primary outcome is computing, media, communication, sensing/control, networking or data storage may be Electronics. Smart-home control devices are Electronics; the controlled appliance remains Appliances. UPS is included as bounded computer/protected-power equipment, while household electrical installation, generators and whole-home storage are excluded. Ambiguity fails closed into a taxonomy review; it is never silently routed.

## 4. Exact identity and admission

An admitted member is one exact manufacturer product/configuration applicable to Türkiye. A family page, search result, accessory, seller bundle or visually similar item is not a member.

Every candidate record must carry:

- `exactProductId`: stable internal identity, never an offer or ASIN;
- manufacturer, commercial model and manufacturer model/part code;
- category-required discriminators from the planning registry;
- configuration identity covering capacity/storage/memory, size, connectivity, included hardware, region and color only where color changes the saleable manufacturer variant;
- GTIN/EAN/UPC, manufacturer part number and Amazon ASIN when observed, each as an alias with provenance—not as universal identity authority;
- lifecycle (`DISCOVERED`, `IDENTITY_REVIEW`, `EVIDENCE_PENDING`, `ELIGIBLE`, `INELIGIBLE`, `RETIRED`) and reasoned transitions;
- Türkiye applicability assertion and evidence; unknown applicability is ineligible.

Identity collisions, missing manufacturer codes, mixed variants on one page, selectable variation ambiguity, seller-authored bundle changes and incompatible source identifiers require review and fail closed. Product identity persists across offers. A materially different hardware revision, regional radio variant, storage/memory configuration, included-kit topology or manufacturer model code is a separate exact configuration.

Admission sequence is mandatory:

1. Discover exact currently active Amazon.com.tr variants first and snapshot source/observation metadata.
2. Resolve exact identity; reject family/accessory/loose-match records.
3. Establish Türkiye applicability independently enough to survive disappearance of the Amazon offer.
4. Pass the category minimum evidence gate.
5. In a second pass, admit exact products demonstrably sold in Türkiye but absent from Amazon.com.tr under identical identity and evidence gates.

Amazon presence is discovery provenance, not recommendation priority and not proof of completeness. Portfolio reports must state query/category traversal, observation time, pagination/coverage limits, rejected ambiguities and known gaps. “Exhaustive” is forbidden without reproducible evidence.

## 5. Evidence and semantic authority

### Source hierarchy

For identity and Türkiye applicability, prefer: Türkiye manufacturer/importer product page or Turkish regulatory/warranty artifact; exact Türkiye manual/support page; authorized Türkiye distributor artifact; exact active Amazon.com.tr listing corroborated by manufacturer identity; other established Türkiye retailer listing. A retailer alone may support observed sale, but cannot override manufacturer technical truth.

For technical facts, prefer: exact official specification/manual; regulatory/certification record; official regional/global document with exact configuration reconciliation; reviewed independent measurements; reviewed editorial evidence. Community content and seller prose are discovery-only unless a future governed experience policy explicitly admits an aggregate.

International primary sources may fill a technical gap only when exact model/configuration equivalence is proven and the assertion records its bounded applicability. They never establish Turkish sale, warranty, plug/radio compatibility, localized service, feature availability or Türkiye applicability. Conflicts remain `CONFLICTED`; missing data remains `UNKNOWN`. Neither becomes a favorable default.

### Layer boundaries

- L1 TechnicalFact is an objective assertion with exact evidence and locator.
- L2 Capability is a supported state derived only by category-reviewed rules. It is not a UserNeed.
- L3 usage semantics explain fact meaning without promising outcomes.
- L4 UserNeed belongs to category policy; mappings explicitly identify eligible facts/capabilities and hard/soft/question use.
- L5 Persona is derived planning only, with `decisionUse: NONE` and no direct candidate effect.
- L6 DailyLifeInterpretation is reviewed, traceable and non-guaranteeing; it cannot become technical truth.
- L7 Experience requires a category-approved reviewed aggregation policy, population/scope disclosure and no technical-truth authority. Otherwise it is absent.
- L8 DecisionProjection alone exposes evidence and need mappings that Y may consume. Unknown required evidence blocks the dependent filter/recommendation.
- L9 AdvisorKnowledge includes manuals, maintenance, installation and usage guidance with `decisionAuthority: NONE`. Promotion to decision evidence requires a separate governed promotion artifact.
- L10 offers, prices, Amazon availability, affiliate eligibility, commission, sponsorship, seller prominence and media are external volatile facts only.

X may answer informational questions from labeled knowledge. P may use validated user facts and category question policy. Only deterministic Y may filter, establish sufficiency, select, recommend and authorize, against a pinned catalog plus semantic authority. Advisor knowledge, interpretations, persona and commerce cannot cross that boundary.

## 6. Price, offers, media and manuals

Price observations and offers are short-lived snapshots bound to exact product IDs and a catalog revision. Merchant, seller, stock, delivery, sponsorship, commission and affiliate state belong to the offer. They never create or merge product identity, admit candidates, break ties, change sufficiency, rank or authorize. Budget filtering may be introduced only by an explicit Electronics category policy using fresh exact price semantics; missing/stale price must not exclude a candidate silently.

The governed media policy remains unchanged. Marketplace/manufacturer images without rights metadata remain discovery-only. Amazon media must use the permitted API/feed, direct product link, disclosure and cache rules already recorded in product-media governance. Owned representative fallbacks must be labeled and cannot imply exact appearance. Media is presentation-only.

Manuals are content-addressed, versioned, language-labeled, section-located and exact-model or bounded-model-list scoped. A manual applicable to a product family cannot silently prove the exact variant. Manual content enters L9 by default; an assertion reaches L1/L2/L8 only through reviewed extraction and governed promotion with explicit authority and limitations.

## 7. Required artifacts and ownership

Subsequent work units should create immutable candidates under `data/research/electronics/` and frozen releases under `data/production/electronics/<category-slug>/releases/<release-id>/`; `active.json` is forbidden until its activation work unit.

| Artifact | Minimum schema/contract | Owner |
|---|---|---|
| taxonomy registry | `electronics-taxonomy/v1`; category, wave, boundary, readiness | Electronics Product/Architecture |
| discovery ledger | `electronics-discovery-ledger/v1`; URL/source, observed time, query/traversal, ASIN if present, raw identifiers, disposition | Catalog acquisition |
| exact identity registry | `electronics-exact-identity/v1`; exact ID, configuration, aliases with provenance, collision status | Category catalog authority |
| TR applicability assertions | `electronics-tr-applicability/v1`; exact ID, source, assertion, status, limitations | Category evidence authority |
| source registry | reuse `CatalogSource` semantics plus acquisition/permission metadata | Evidence governance |
| evidence/assertions | reuse `CatalogEvidence`, L1/L2 and assertion-level locators | Category evidence authority |
| semantic registry | L3-L7 and L9, version/digest, category reviewers | Category semantic authority |
| decision projection | reuse L4 mappings and L8 projection; deterministic policy version/digest | Y/category policy authority |
| frozen catalog release | reuse `XpyCatalogRelease` and catalog revision concepts after department generalization | Catalog release authority |
| coverage/readiness report | L0-L10 status, counts, unknown/conflict/gap impacts | Governance/audit |
| price/offer snapshots | reuse external snapshot/revision-bound exact join | Commerce, no decision authority |
| media release | existing governed product-media contract | Media authority |
| manual corpus | content-addressed L9 artifacts and optional governed promotions | Advisor/evidence authority |

Development may choose adapters, serialization details, tests and file decomposition while preserving these authority boundaries. Database changes should follow executable runtime needs, use additive constraints and preserve revision/idempotency semantics; no new database system is justified.

## 8. Readiness matrix

| Wave | Categories | Shared work that can run in parallel | Category policy gate | Readiness |
|---|---|---|---|---|
| 1 | smartphone, laptop, tablet, monitor, television, e-reader | Amazon traversal, identity aliases, TR proof, official specs, media/manual candidates | support lifecycle, regional/connectivity variants, workload/display/ecosystem needs | taxonomy ready; policy required |
| 2 | headphones, portable speaker, soundbar, camera, projector, console | same acquisition pipeline, exact bundle separation, official evidence | fit/audio claims, optical/throw rules, kit topology, platform ecosystem | taxonomy ready; policy required |
| 3 | router/mesh, NAS, external storage, printer, webcam, computer audio | topology identity, host/interface evidence, manuals | network/workload compatibility, redundancy, consumable cost semantics | taxonomy ready; policy required |
| 4 | smartwatch, tracker, security camera, doorbell, hub, UPS | regional identity, cloud/subscription inventory, installation manuals | privacy, health non-medical boundary, installation/electrical safety, dependency sufficiency | deferred behind stronger policy gates |

Cross-category acquisition infrastructure, hashing, source snapshots, alias review, Türkiye-applicability review, offer/media joins and coverage reporting can be built once and used in parallel. Need taxonomy, hard blockers, evidence sufficiency, questions, experience interpretation and recommendation construction are category-specific and must be reviewed separately.

## 9. Acceptance gates for subsequent work units

### WU-ELECTRONICS-AMAZON-TR-PRIMARY-CATALOG-01

- Reproducible Amazon.com.tr category/query traversal with timestamps, coverage limits and rejection ledger.
- Every admitted row resolves one exact active variant; families, accessories and ambiguous variation parents are rejected or queued.
- Türkiye applicability and minimum provenance are explicit; no claim of exhaustive coverage.
- No product is ranked by Amazon availability, seller prominence, affiliate or commercial facts.
- Outputs are research/release candidates only; no Domain Pack, department, catalog or production activation.

### WU-ELECTRONICS-TURKEY-NON-AMAZON-CATALOG-01

- Starts after an Amazon-first coverage report and documents the gap it addresses.
- Each addition has exact identity plus independent observed Türkiye-sale/applicability evidence and passes the same category gate.
- Absence from Amazon is recorded, not rewarded or penalized.
- Dedupe/collision comparison covers all prior exact IDs and aliases.

### WU-ELECTRONICS-CATALOG-RICHNESS-01

- Assertion-level provenance, exact applicability, conflicts and unknowns are measurable for L1-L10.
- Category-reviewed TechnicalFact→Capability→Need mappings are versioned; interpretations/persona/manual/experience boundaries validate.
- International evidence has equivalence and non-TR limitations.
- Offer, price, media and affiliate changes cannot change frozen membership or Y inputs.
- Each category publishes readiness and gap impact; unsupported categories remain unavailable.

### WU-ELECTRONICS-XPY-DECISION-RUNTIME-01

- Electronics Domain Pack binds the shared runtime; no duplicate engine or persistence model.
- Only categories with approved taxonomy, catalog, semantic, question, sufficiency, recommendation and projection authority register.
- Deterministic Y tests cover hard filters, soft preferences, unknown evidence, ties, sufficiency, recommendation and authorization fingerprints.
- X informational and P planning behavior cannot mutate Y authority; persona and Advisor have no candidate effect.
- Revision pinning, replay/idempotency, stale artifact revalidation and exact product/configuration handoff fail closed.
- Catalog revision typing is generalized deliberately and tests retain Cars/Appliances behavior.

### WU-ELECTRONICS-PRESENTATION-PRODUCTION-01

- Runs only after runtime acceptance; registers Electronics in department/root/visual/stage adapters without exposing internal codes.
- Only supported categories are presented as available; incomplete ones are unavailable with truthful copy.
- Existing governed media and exact-identity bindings pass coverage checks.
- Stage 2/3 sales actions stay unavailable unless separately authorized; no implicit commerce activation.
- Scoped accessibility, route, metadata, sitemap, smoke and production-readiness checks pass before explicit operator deployment.

## 10. Blockers and next work

No Product or Architecture blocker prevents implementation. Category policies are required work, not escalations. External access/permission for Amazon APIs or feeds may constrain collection and media use, but it does not change the architecture: unavailable access is recorded as a coverage gap and never bypassed with loose scraping or invented authority.

Exactly one recommended next work unit: `WU-ELECTRONICS-AMAZON-TR-PRIMARY-CATALOG-01`, beginning with Wave 1 and producing research-only exact-variant candidates plus a reproducible coverage/rejection report.
