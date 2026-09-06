# EXPIYA-DRYER-ORCHESTRATED-01 — consolidated preparation

Status: preparation input accepted by the Product owner on 2026-09-03. The approved scope and exact initial model set are implemented by `APPLIANCES-DRYER-TR-v0.1`; frozen Cars/Washing Machine artifacts remain unchanged.

## Proposed bounded scope

Turkey-market, household, freestanding, heat-pump, drying-only tumble dryers. Washer-dryers, vented/condenser-only products, built-in/commercial products and non-TR configurations stay outside the initial catalog. These details have not separately been approved; approve or revise them as one scope decision.

## Evidence inventory

The machine-readable inventory is `data/research/appliances-dryer-stage1/preparation.json`. The initial exact-model candidates are Beko **KMX 82**, Beko **KM 99**, and Bosch **WQG24100TR**. KMX 82 has an HTTP-200 manufacturer product fiche and manual, both bound to product code `7184270260`; WQG24100TR has an HTTP-200 Turkey product page, model-specific Turkish use/installation manual (`9001745932`), GTIN `4242005281251`, and a manufacturer fiche URL discovered on that page. Beko's Turkey product pages returned an automation-blocking HTTP 403 in the validation pass: their URLs remain recorded, but the two downloaded KMX 82 documents are the verified basis for its document facts. KM 99 remains an exact-model research candidate rather than a source-complete release candidate because its product fiche did not resolve reliably.

Comparable evidence may include rated drying capacity only when definition/regime matches; physical dimensions with door-state context; acoustic airborne noise only with its measurement regime; energy only with label/regime, program, load, initial moisture and unit; direct-drain/condensate handling; filter/condenser maintenance; sensor drying; and exact program availability. KMX 82's verified current fiche reports 8.0 kg rated capacity, 1.44 kWh/cycle weighted consumption and 64 dB(A) re 1 pW; the earlier unverified 265 kWh/year page value was removed rather than mixing label regimes. Unknown regimes remain unknown. Manufacturer marketing descriptions are retained as claims and never become technical facts by repetition.

## Dryer semantics and rules proposed for decision

Technical facts: exact fit (width/height/depth, closed/open door depth and required clearance), rated drying capacity, heat-pump configuration, standardized energy consumption, standardized acoustic noise, cycle duration, condensate handling/direct drain, filter/condenser maintenance, sensor control, reversible door/stacking compatibility when exact accessory and pairing evidence exists, and exact program availability.

Product interpretations must bind back to those facts: frequent/high-volume use may make energy and load capacity material; a constrained location may make door-state depth, ventilation/ambient requirements and drain routing material; delayed unloading may make anti-crease behavior material; delicate, wool, duvet, outdoor or hygiene needs require exact program/manual evidence; maintenance tolerance may make filter/condenser access material. Capacity alone does not prove household-size suitability, a program name does not prove a care outcome, and quiet-program availability does not prove lower standardized noise.

Applicable question flow: resolve installation fit and stacking need first when constrained; ask drying volume/frequency and bulky textiles; ask fabric/program needs only when expressed or still selection-material; ask drain access and maintenance tolerance when candidates differ; ask standardized noise sensitivity and energy priority only where comparable evidence exists; ask budget against a separate fresh price projection. Stop when one candidate is constructible, explain tied/non-dominated sets honestly, and fail closed on incompatible evidence regimes. No numeric threshold, weight, score or hidden tie-break is proposed.

Washing-only semantics are excluded: wash-program outcomes, spin-phase noise, remaining moisture as a washing-machine performance result, water consumption, detergent/automatic dosing and rinse semantics. Dryer capacity is rated dry-load capacity. Dryer noise needs dryer acoustic airborne noise context. Incoming laundry moisture/spin speed can affect dryer consumption and duration but is not a dryer spin feature.

## Reuse and gaps

Reuse the existing Appliances conversation store and PostgreSQL tables; CAS revision and `(conversation_id,message_id)` replay idempotency; ledger status/authority model; canonical fingerprinting; context-to-candidate-to-question-to-sufficiency-to-selection chain; construction, exact context-bound authorization-before-card, public projection; API transaction and READ recovery. Cars remains the provenance baseline for authorization/presentation behavior; Washing Machine is the concrete Appliances implementation baseline.

Adapt through category configuration: authority roots/schemas and expected release binding; semantic concepts and interpretation/projection rules; evidence fact aliases and comparability validators; question, sufficiency, selection and construction policy bindings; rationale labels and disclosures; price projection binding; UI category creation/labels. The current authority loader and policy loaders are Washing-Machine literals rather than category adapters. `AppliancesConversationState.productType`, context/candidate/planner guards, recommendation authority composition, recovery, public API CREATE response and client CREATE default are also fixed to `WASHING_MACHINE`.

The database migration `0009_appliances_runtime_foundation.sql` restricts `appliances_conversations.product_type` to `WASHING_MACHINE`. A later migration must replace that check with the approved active category set while preserving the same table and data. It must not create another persistence system.

## Consolidated Product decisions required

1. Approve or revise the single bounded scope above.
2. Approve the dryer need/concept set and question materiality rules, including the explicit removal of washing-only concepts.
3. Decide which source-complete exact models enter the first release after evidence completion; current candidates are research candidates, not approved members.
4. Approve the dryer evidence comparability rules and unknown handling, especially energy-label regimes, acoustic noise context and capacity definition.
5. Approve the no-score selection rule: hard compatibility first, then only evidence-backed expressed preferences, with tied/non-dominated outcomes and no invented thresholds.
6. Approve card wording/disclosures and the existing authorization-before-projection/recovery contract for DRYER.

## One end-to-end implementation

Create a product-category adapter selected by `productType`; add a frozen DRYER authority/catalog/semantic bundle and category-bound price projection; configure interpretation, evaluation, questions, sufficiency, selection and construction; generalize authorization/card/recovery without weakening their fingerprints; widen the existing PostgreSQL check in one migration; expose DRYER through the existing API and Appliances UI; then run focused adapter/domain/transaction/recovery tests. At final integration, run one regression/build and the permitted real browser/PostgreSQL smoke.
