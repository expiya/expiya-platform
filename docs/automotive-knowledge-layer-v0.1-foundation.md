# Automotive Knowledge Layer v0.1 foundation

## Runtime boundary

The layer owns public automotive explanation only. It must not filter, eliminate, rank, score, or create preferences, hard constraints, recommendation facts, or candidate facts. `features/decision/**` must not import `features/automotive-knowledge/**`. The public API may call the knowledge planner before entering a decision runtime, but the planner output is never passed into that runtime.

Technical Daily-Life and Safe Persona are decision-side interpretation layers and remain separate. The vehicle catalog remains the authority for exact variants and verified vehicle facts.

## Authority and time

Current market facts require a primary official source, explicit period, market/population, publication and retrieval timestamps, exact locator, methodology note, limitations, and SHA-256 snapshot identity. Missing authority fails closed: the record is not rendered. Historical records carry an event date. Forecasts require a horizon, method, assumptions, and uncertainties and are always rendered as conditional scenarios.

Releases are immutable candidates. `effectiveAsOf` and `supersedes` make temporal lineage explicit. Reviews and activations are append-only events. The v0.1 candidate is intentionally not connected to an active production pointer.

## Initial bounded content

The candidate includes Expiya orientation, body and energy-type primers, one ODMD 2025 annual market observation, two early automotive-history records, and one qualitative EV scenario contract. A TÜİK source is registered without publishing a number because exact table cells were not independently snapshotted; this is the intended fail-closed behavior.

## v0.2 economic and regulatory candidate

The non-active v0.2 candidate adds three public intents: economic indicators, tax/regulation, and incentives. TÜİK transport CPI is explicitly not presented as an automobile-only index. The BETAM/sahibindex used-car series is marked secondary and limited to asking prices rather than completed sales. ÖTV records explain the effective-list and case-specific row boundary without calculating a rate. The 2026 disability exemption record is time-bounded and fails closed after its validity period. These records remain public-explanation-only and cannot enter affordability, ranking, filtering, preference, or recommendation logic.

## v0.3 ownership and lifecycle candidate

The non-active v0.3 candidate adds insurance/claims, maintenance/parts, ownership value, and import/compliance intents. Insurance responses distinguish compulsory liability from policy-specific comprehensive cover and never synthesize a premium. Maintenance uses the vehicle-specific manufacturer schedule principle and does not invent universal intervals or service prices. Total-cost and residual-value content is a non-ranking explanatory framework. Import content separates TSE conformity from customs, tax, origin, and permission decisions. The IEA projection remains a global scenario and is never rendered as a Turkey forecast or verified future fact.

## v0.4 vehicle credit and financing candidate

The non-active v0.4 candidate adds a financing/credit intent. It separates BDDK regulatory ceilings from lender approval, TCMB weighted market averages from consumer offers, and nominal instalments from total credit cost. The narrow scope of BDDK Decision 11158 is retained explicitly and is never generalized to every electric vehicle. The layer does not infer income, creditworthiness, affordability, preferences, or hard budget constraints from an informational finance question.

## v0.5 technology outlook candidate

The non-active v0.5 candidate adds autonomous-driving, EV-range, and attributed expert-perspective intents. SAE levels are attached to the engaged feature rather than used as permanent vehicle labels. Driver responsibility and operational conditions remain explicit. Certified EV range is kept separate from real-world trip range and from other test protocols. Institutional expert views carry organization, date, assumptions, uncertainty and an explicit opinion/scenario status; they are never converted into recommendation facts.

## v0.6 safe and advanced driving candidate

The non-active v0.6 candidate adds one deterministic safe/advanced-driving intent and three public-explanation-only records: foundational road behaviour, defensive hazard anticipation, and the driver-assistance boundary. “Advanced driving” means earlier observation, larger safety margins and smooth control inputs—not higher speed or public-road performance practice. The renderer refuses to frame risky manoeuvres as road instruction and directs emergency-control practice to a suitable closed area with a qualified instructor. Guidance does not replace current Turkish traffic law, licensing instruction, the exact vehicle owner's manual or supervised practical training, and it cannot create vehicle preferences or recommendation facts.

## v0.7 comprehensive consumer-journey candidate

The non-active v0.7 candidate adds deterministic intents for used-vehicle due diligence, recalls, public EV charging, tyres, child passengers, post-crash guidance, safety-rating interpretation, lifecycle emissions, accessible mobility, international driving and listing/payment safety. The May 2026 Turkish expert-inspection proposal is retained as draft-only provenance and cannot create an in-force obligation. Recall answers require VIN-level confirmation; charging prices and availability require use-time verification; Euro NCAP results remain test-year, protocol, equipment, variant and peer-class bound. Accident content does not decide fault, accessibility content does not infer a person's medical or legal eligibility, and cross-border content requires destination/transit-country verification. None of these records may rank vehicles or enter the Decision Engine.
