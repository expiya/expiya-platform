# Expiya Product v0.1

## Cars Requirement-to-Evidence & Evidence-State Policy

Status: **CLARIFIED WITH DEFERRED DOMAINS**  
Date: 2026-08-14  
Policy ID: `cars.requirement-to-evidence`  
Policy version: `0.1.0`  
Scope: Cars MVP requirement evaluation over the approved Vehicle Evidence runtime universe

## A. Executive verdict

```text
CARS REQUIREMENT-TO-EVIDENCE POLICY:
CLARIFIED WITH DEFERRED DOMAINS
```

This policy closes the Product semantic gate between material Cars requirements and governed atomic Vehicle Evidence. It does not authorize implementation, change the dataset, reopen architecture, or authorize a suitability score.

The central rule is:

```text
material user requirement
+ versioned requirement rule
+ acceptable applicable atomic evidence
-> evidence sufficiency
-> requirement satisfaction
```

Evidence sufficiency and requirement satisfaction are separate results. Missing or unresolved evidence is not a negative vehicle capability.

## 1. Authority inspection and boundaries

The repository contains the approved architecture clarification and its verification:

- `docs/vehicle-evidence-runtime-identity-resolution-boundary-v0.1.md`
- `docs/vehicle-evidence-runtime-identity-resolution-boundary-verification-v0.1.md`

The named Expiya Product Specification v0.1, Decision Context Behavioral Clarification, Cars Decision Sufficiency Policy Clarification, and Runtime Sufficiency Determination Policy Clarification are **not present as Product documents in this repository**. Their closest repository representations are the typed and tested contracts under:

- `types/contextSufficiency.ts`
- `features/decision/context/sufficiency/`
- `features/decision/runtime/`

Those contracts supply established vocabulary and fail-closed behavior: `MATERIAL | NOT_MATERIAL | UNRESOLVED`, `SUFFICIENT | INSUFFICIENT | UNRESOLVED`, explicit recommendation authorization, blocking/unresolved rejections, and `PERMITTED | NOT_PERMITTED | UNRESOLVED` limited support. They are treated here as repository-aligned constraints, not as proof that every current implementation heuristic is Product authority.

The fixed architecture boundary remains authoritative: opaque `RuntimeVehicleCandidateId`, explicit `VehicleCandidateIdentityMap`, declared single-scope resolution, no equipment inheritance, pinned immutable artifact, `VehicleEvidenceReadPort`, phased single authority, exact Type B, and no fuzzy fallback.

Dataset baseline accepted by this policy is v0.4.0/schema 0.1: 55 models, 68 configurations (48 `VERIFIED`, 20 `PROVISIONAL`), 298 facts, 196 equipment rows, 494 assertions, validator PASS with 0 errors.

## B. Product requirement taxonomy

There are two related layers, not competing taxonomies.

1. **DecisionContext/materiality taxonomy** describes user-context semantics: decision need, fundamental need, priorities, constraints, usage conditions, decision criteria, preferences, and candidate options. It determines whether a statement is a hard material constraint, another material criterion, a preference, non-material, or unresolved. It also owns confirmation of inferred user context.
2. **Vehicle-evaluable requirement taxonomy** describes the governed intermediate representation consumed by evidence rules. The existing `CARGO`, `PASSENGER_TRANSPORT`, `TOWING`, `OFF_ROAD`, `FAMILY`, `COMPACT_CITY`, `CLASSIC`, and `PERFORMANCE` concepts remain useful domain groups. v0.1 adds `EFFICIENCY`, `EV_RANGE`, and `CHARGING` as necessary evidence domains rather than creating an unrelated taxonomy.

The intermediate representation must carry at least a domain, an atomic criterion, its operator/threshold where applicable, materiality/constraint role, and lineage to the accepted DecisionContext item. Examples are `PASSENGER_TRANSPORT.seats >= 7`, `TOWING.braked_capacity_kg >= 1500`, and `URBAN.vehicle_width_mm <= user_limit`.

The LLM or extraction layer may propose this representation from user language. It does not decide which facts prove it. Confirmation rules remain owned by DecisionContext policy. The versioned matrix in this document alone declares evidence needs and evaluation rules.

Current regex matching is extraction scaffolding, not authoritative semantic derivation. Body-type allowlists, model-name sets, hard-coded IDs, the year-1999 classic threshold, and use-case score bonuses are legacy heuristics, not Product evidence policy.

## C. MVP supported requirement domains

| Classification | Domains | Boundary |
|---|---|---|
| `SUPPORTED_MVP` | Family/occupancy, urban size and parking, cargo/practicality, passenger capacity, towing, rough-road, propulsion-specific official efficiency, EV official range, contextual charging, atomic performance | Only the atomic requirements and rules in section D; no composite suitability score |
| `DEFERRED_P1` | Serious off-road capability; Safety; Classic; PHEV cross-mode efficiency; generic “family car”, “easy parking”, “efficient”, “good EV usage”, “fast charging”, or “high performance” when no evaluable criterion can be derived | Requires additional Product threshold/comparison semantics or coverage; discovery language may be used with explicit limitations, never as a reliable final evaluation |
| `UNSUPPORTED` | Reliability, maintenance/service availability, TCO, price history, owner experience as proof, resale value, insurance, comfort/quality composites, arbitrary suitability/ranking scores | No positive/negative evidence claim or final-decision use under this policy |

`CLASSIC` is deferred because the repository exposes only an implementation threshold (`year <= 1999`) and no authoritative Product definition. Serious off-road is deferred because ground clearance/drivetrain/angles do not by themselves establish a universal off-road rating. Safety stays P1 as directed by the present Product gate.

## D. Requirement to evidence matrix

Definitions:

- **REQUIRED:** without acceptable evidence for every listed conjunct, a reliable positive evaluation cannot be made. A required fact can still prove a negative result.
- **SUPPORTING:** materially strengthens, weakens, or explains the result. Absence alone does not make the requirement non-evaluable.
- **OPTIONAL:** explanation, differentiation, or future enrichment only. Absence never affects sufficiency.

“Required when explicit” means the evidence becomes required only when that atomic criterion is present and material. No unstated Product threshold is implied.

| Requirement | REQUIRED evidence | SUPPORTING evidence | OPTIONAL evidence | Evaluation rule |
|---|---|---|---|---|
| `FAMILY.OCCUPANT_CAPACITY` | `seats` | `body_type`, `cargo_volume_l` | parking/camera equipment | With an explicit party-size minimum, compare `seats >= minimum`. Without a confirmed party size, generic family language does not authorize a deterministic capacity pass. |
| `FAMILY.CHILD_SEAT_SUPPORT` | `isofix_rear` when child-seat support is material | `seats` | `isofix_front`, `rear_cross_traffic_alert`, `powered_tailgate`, parking/camera equipment | Accepted availability (`STANDARD` or `OPTIONAL`, unless the user requires included-as-standard) satisfies capability; `NOT_AVAILABLE` contradicts it. Never inherit equipment. |
| `FAMILY.PRACTICALITY` | `cargo_volume_l` only when a numeric/minimum luggage need is material | `cargo_volume_max_l`, `seats` | `powered_tailgate`, `body_type` | Compare like measurement context to the explicit minimum. Generic family practicality has no v0.1 positive pass threshold and is P1-limited. |
| `URBAN.SIZE_CONSTRAINT` | The explicitly constrained fact(s): `length_mm` and/or `width_mm` | `turning_circle_m` | `body_type`, parking/camera equipment | Each explicit maximum must be met. Hatchback/body type is not a substitute for dimensions. |
| `URBAN.PARKING_ASSIST` | At least one explicitly required equipment key among `parking_sensors_rear`, `parking_sensors_front`, `reversing_camera`, `camera_360` | `turning_circle_m`, `length_mm`, `width_mm`, other parking equipment | `body_type` | Evaluate exactly the requested capability. Generic “easy parking” has no universal pass threshold; clarification or limited discovery is required. |
| `URBAN.GENERIC_USAGE` | None as a hard universal fact set | `length_mm`, `width_mm`, `turning_circle_m`, official propulsion-appropriate consumption | parking/camera equipment | Supports discovery/comparison descriptions only until a material evaluable criterion is known; it cannot alone authorize a final positive suitability claim. |
| `CARGO.VOLUME` | `cargo_volume_l` when seats-up capacity matters; `cargo_volume_max_l` when folded maximum matters | the other cargo-volume fact, `payload`, `body_type` | `doors`, `powered_tailgate` | Compare the fact matching the user's loading condition and unit to an explicit minimum. Seats-up and maximum volume are not interchangeable. |
| `CARGO.PAYLOAD` | `payload` when mass capacity is explicit/material | `cargo_volume_l`, `cargo_volume_max_l`, `body_type` | `roof_load` | Compare `payload >= required kg`. Because publication is sparse, absence blocks only this explicit payload criterion, not all cargo discovery. |
| `PASSENGER_TRANSPORT.CAPACITY` | `seats` | `body_type`, `doors` | `cargo_volume_l`, comfort equipment | Compare `seats >= required occupants`. `UNKNOWN` is non-evaluable, never assumed to be five. Van/body family is not proof of capacity. |
| `TOWING.BRAKED_CAPACITY` | `towing_braked_kg` | `drivetrain`, `torque_nm`, `curb_weight_kg` | `towing_unbraked_kg` | Compare to explicit braked trailer need. Drivetrain/body type never replaces rated towing capacity. |
| `ROUGH_ROAD.CLEARANCE` | `ground_clearance_mm` | `drivetrain`, `approach_angle`, `departure_angle` | `wading_depth`, `body_type` | Compare to an explicit clearance minimum. For confirmed rough-road usage without a numeric threshold, a verified clearance value plus exact drivetrain is sufficient only for evidence-backed comparison, not a universal pass/fail; final selection must explain the absence of a Product threshold. |
| `ROUGH_ROAD.DRIVETRAIN` | `drivetrain` when a drivetrain is explicitly required | `ground_clearance_mm`, `approach_angle`, `departure_angle` | `wading_depth` | Exact equality/set membership against the confirmed requirement. “SUV” is not proof of AWD/4WD. |
| `EFFICIENCY.ICE_HEV_OFFICIAL` | `official_fuel_consumption_combined` | `fuel_type`, `electrification_type` | `fuel_tank_l` | Compare only values with compatible official cycle/context. Lower is better only within a compatible metric; an explicit maximum is deterministic. |
| `EFFICIENCY.BEV_OFFICIAL` | `official_energy_consumption_combined` | `electrification_type` | `battery_usable_kwh`, `battery_gross_kwh` | Compare compatible official kWh/100 km contexts. Do not compare directly to L/100 km or synthesize a cross-fuel score. |
| `EV_RANGE.MINIMUM` | `official_electric_range` | `electrification_type`, `battery_capacity_reported_kwh` | `battery_usable_kwh`, `official_energy_consumption_combined` | For an exact applicable official value, compare to the confirmed minimum. For an official range interval, `value_min >= minimum` satisfies, `value_max < minimum` fails, and an overlapping interval is insufficient. Battery capacity is never a range substitute. |
| `CHARGING.DC_TIME` | `dc_charge_time_min` together with `soc_start_pct`, `soc_end_pct`, and its declared charge-power context where present in the source claim | `max_dc_charge_kw` | `max_ac_charge_kw`, battery capacity | Direct comparison requires the same SOC start/end and materially compatible declared conditions. Differing intervals are not normalized; without a separately approved derivation they are not directly rankable. |
| `CHARGING.MAX_DC_POWER` | `max_dc_charge_kw` | contextual DC charge-time evidence | `max_ac_charge_kw` | Compare to an explicit minimum or compare exact same-unit values; do not infer charge duration from peak power. |
| `CHARGING.MAX_AC_POWER` | `max_ac_charge_kw` | — | battery capacity | Compare to an explicit minimum or exact same-unit values; do not infer home-charge time without a derivation contract. |
| `PERFORMANCE.ACCELERATION` | `acceleration_0_100` | `power_kw`, `torque_nm`, `curb_weight_kg` | `top_speed`, `power_ps` if later governed as a key | Compare seconds for the same 0–100 km/h definition; lower is better or compare to explicit maximum. |
| `PERFORMANCE.POWER` | `power_kw` | `torque_nm`, `acceleration_0_100` | `top_speed` | Compare kW to an explicit minimum or exact same-unit values. `power_ps` must be an approved atomic key/conversion before use; no ad hoc conversion. |
| `PERFORMANCE.TORQUE` | `torque_nm` | `power_kw`, `acceleration_0_100` | `top_speed` | Compare Nm to an explicit minimum or exact same-unit values. No composite performance score. |

For all rows, a positive result requires all REQUIRED conjuncts to be acceptable under sections F, G, and M. A negative result requires acceptable evidence that deterministically contradicts the operator, threshold, or requested equipment availability. Supporting evidence cannot overturn a required-fact mismatch or repair a missing required fact.

## E. Requirement evaluation outcomes

The Product concepts map to current runtime vocabulary as follows:

| Product concept | Policy outcome | Existing runtime alignment | Meaning |
|---|---|---|---|
| Positive | `SATISFIES` | `SATISFIED` | All required evidence is acceptable and the evaluation rule passes |
| Negative | `DOES_NOT_SATISFY` | `UNSATISFIED` / `CONSTRAINT_MISMATCH` | Acceptable evidence deterministically contradicts the requirement |
| Insufficient | `INSUFFICIENT_EVIDENCE` | `UNRESOLVED` / `MISSING_AUTHORITATIVE_EVIDENCE` | Required evidence is missing, unknown, unacceptable, or not comparable |
| Irrelevant fact | `NOT_APPLICABLE` | `NOT_REQUIRED` where appropriate | The fact is irrelevant to this candidate/criterion; parent-requirement logic still applies |
| Conflict | `UNRESOLVED_CONFLICT` | `UNRESOLVED` / `UNRESOLVED_CONFLICT` | Applicable evidence conflicts and neither side may be selected |

These are conceptual Product outcomes; Development may map them to existing types without introducing duplicate public enums. `UNKNOWN` never maps to `DOES_NOT_SATISFY`.

## F. Evidence state matrix

| Evidence state | Required evidence | Supporting evidence | Optional evidence | Stage consequence |
|---|---|---|---|---|
| `VERIFIED` | Eligible for positive or negative evaluation when identity, authority and applicability also pass | Accepted | Accepted | May support final decision |
| `REPORTED` | Does not satisfy REQUIRED evidence for reliable recommendation/final decision; may support a clearly limited discovery or consideration statement | May support limited comparison/consideration with attribution and limitation | May appear with attribution | Cannot repair a material required gap or contradiction; never silently promoted to verified |
| `UNKNOWN` | `INSUFFICIENT_EVIDENCE` | Missing support; does not count against capability | Omit or state unknown | Discovery may continue; material final gate remains closed |
| `NOT_AVAILABLE` | Positive absence evidence: `DOES_NOT_SATISFY` when the required capability/fact is applicable | Weakens support or explains absence; does not independently fail an unrelated parent requirement | Explain if useful | Can eliminate a hard-constraint candidate |
| `NOT_APPLICABLE` | Not a missing fact. Evaluate the parent requirement: it may fail if the user intrinsically requires the capability | Ignore for sufficiency of irrelevant support | Ignore | Example: ICE fails a BEV propulsion requirement, not a charging-data completeness test |
| `CONFLICTING` | `UNRESOLVED_CONFLICT`; no positive or negative decision | Cannot strengthen or weaken deterministically | Conflict may be disclosed | No averaging, winner selection, or LLM reconciliation; material final gate closed |

`REPORTED` is deliberately conservative. It may support a `LimitedSupport`-permitted statement, but no final recommendation may depend on it for a material REQUIRED item. If all material REQUIRED items are independently satisfied by acceptable `VERIFIED` evidence, additional `REPORTED` supporting evidence may appear in the explanation with explicit attribution and does not by itself block final selection.

## G. Applicability matrix

| Assertion applicability | REQUIRED | SUPPORTING | OPTIONAL | Product disposition |
|---|---|---|---|---|
| `EXACT` | Accepted | Accepted | Accepted | Only applicability capable of satisfying REQUIRED evidence for reliable recommendation/final decision |
| `PARTIAL` | Not accepted as complete required proof | Accepted for limited support when the matched and unmatched boundary is disclosed | Accepted | Leaves a material REQUIRED item insufficient |
| `UNCERTAIN` | Not accepted | Not accepted as deterministic support; may be disclosed as a lead | Explanation/audit only | Cannot influence pass/fail or ranking |
| `CONFLICTING` | `UNRESOLVED_CONFLICT` | No deterministic use | Disclose conflict only | Material conflict blocks reliable recommendation/final decision |
| `NOT_APPLICABLE` | Apply parent-requirement semantics | Ignore | Ignore | Not a missing-evidence penalty |

This matrix is conjunctive with evidence state and source acceptance. `VERIFIED + PARTIAL` is not exact required proof.

## H. Configuration status eligibility matrix

| Stage | `VERIFIED` configuration | `PROVISIONAL` configuration |
|---|---|---|
| Discovery | Eligible if catalog/mapping scope permits; evidence claims follow this policy | May be presented only as catalog-led, explicitly provisional discovery outside the evidence-backed active runtime universe |
| Consideration | Eligible | May remain a clearly provisional lead; no `VehicleEvidenceReadPort`-backed evaluation |
| Comparison | Eligible for governed evidence comparison | Ineligible for evidence-backed comparison; may be listed separately, not treated as a comparable evaluated candidate |
| Recommendation candidate | Eligible if all other gates pass | Ineligible |
| Final decision | Eligible if all final gates pass | Ineligible |

Architecture remains controlling: only `VERIFIED` configurations can participate in an active one-to-one evidence identity mapping. Product presentation of a provisional model does not create identity eligibility.

## I. Candidate evaluability model

These states are independent and must not be collapsed into one boolean:

- **Identity eligible:** the candidate is in the active artifact's validated `VERIFIED_ONE_TO_ONE` mapping and resolves exactly through `RuntimeVehicleCandidateId`.
- **Evidence evaluable:** all REQUIRED evidence for one specific requirement resolves with acceptable state, applicability, authority, context, and comparability. This is evaluated per requirement, not globally.
- **Requirement satisfaction:** an evaluable requirement is `SATISFIES` or `DOES_NOT_SATISFY`; otherwise it is insufficient/not applicable/unresolved conflict.
- **Recommendation eligible:** identity eligible; every material hard constraint is evaluable and satisfied; other material REQUIRED requirements are evaluable; no material unresolved conflict; current recommendation authorization passes. A preference mismatch alone does not make a candidate ineligible.
- **Final decision eligible:** recommendation eligible and sufficiently supported to select one candidate under section P, with limitations disclosed and no selected-candidate material dependency on limited-only evidence.

Candidate progression is:

```text
DISCOVERY -> CONSIDERATION -> EVALUATION -> RECOMMENDATION -> FINAL DECISION
```

Discovery may surface catalog candidates broadly, including clearly provisional leads. Consideration may retain candidates with known evidence gaps. Evaluation assigns per-requirement outcomes. Recommendation applies strict material gates. Final decision selects one eligible candidate; this policy does not replace the existing single-decision Product goal with a ranked-list-only result.

## J. Hard constraint versus preference policy

DecisionContext/materiality authority supplies the distinction; this policy consumes it.

- A confirmed hard material constraint must be evaluated with its REQUIRED evidence. A verified exact contradiction eliminates that candidate for recommendation. Example: required `seats >= 7`, accepted evidence `seats = 5` -> `DOES_NOT_SATISFY`.
- An unknown or conflicted value does not eliminate as a mismatch; it makes the material requirement non-evaluable and closes the reliable recommendation/final gate for that candidate.
- A preference may differentiate candidates only when acceptable comparable evidence exists. Missing supporting/optional preference evidence does not eliminate a candidate. A deterministically missed preference is disclosed, not treated as a hard rejection unless materiality authority classified it as a constraint.
- No numeric confidence, weight, or suitability score is implied. If two candidates remain, Product may use explicit ordered criteria only under a separately governed ranking/tie-break contract.

## K. Missing evidence policy

Deterministic disposition:

```text
REQUIRED + acceptable VERIFIED/EXACT evidence -> evaluate rule
REQUIRED + UNKNOWN or absent row              -> INSUFFICIENT_EVIDENCE
REQUIRED + CONFLICTING                        -> UNRESOLVED_CONFLICT
REQUIRED + NOT_AVAILABLE                      -> DOES_NOT_SATISFY when capability is required
REQUIRED + NOT_APPLICABLE                     -> evaluate parent requirement
SUPPORTING missing/unacceptable               -> preserve core result; reduce explanation/support breadth
OPTIONAL missing/unacceptable                 -> no sufficiency consequence
```

An absent equipment row is unknown, not `NOT_AVAILABLE`, and equipment is never inherited. Missing supporting evidence may justify a limitation or prevent a supporting tie-break, but it cannot reverse an otherwise valid REQUIRED evaluation. Optional absence affects only enrichment.

## L. Conflict policy

Applicable conflicts are preserved as conflicts. The runtime and LLM must not select newest, first, average, highest, most convenient, or model-consistent values. For REQUIRED evidence, a conflict yields `UNRESOLVED_CONFLICT`; a material conflict blocks recommendation and final decision for that candidate. For supporting/optional evidence, the core result can remain but the conflicted item cannot influence differentiation and must be disclosed when material to the explanation. Resolution requires a new approved evidence release, not conversational judgment.

## M. Source authority acceptance policy

Source authority is categorical and must be considered together with evidence state and applicability. There is no point score.

| Authority class | REQUIRED evidence | SUPPORTING evidence | Explanation/audit |
|---|---|---|---|
| `A1_OFFICIAL_MARKET` | Accepted for market/configuration claims | Accepted | Accepted |
| `A2_OFFICIAL_MANUFACTURER` | Accepted when exact market/configuration applicability is established | Accepted | Accepted |
| `A3_AUTHORITATIVE_INDEPENDENT` | Accepted only for facts that the independent authority is institutionally competent to establish and exact applicability is established (for example a future applicable safety assessment); not a replacement for manufacturer-rated payload/towing/configuration equipment | Accepted within competence | Accepted |
| `A4_TRUSTED_STRUCTURED` | Not accepted for final material REQUIRED evidence in v0.1 | Accepted for limited support if provenance and exact subject are retained | Accepted |
| `A5_TRUSTED_SECONDARY` | Not accepted | Limited support only; cannot overturn A1–A3 | Accepted with attribution |
| `A6_EXPIYA_EXPERIENCE` | Not accepted as vehicle-spec proof | Not accepted as atomic capability proof | Explanation only in separately authorized experience domains |
| `A7_COMMUNITY` | Not accepted | Not accepted as atomic capability proof | Discovery lead/audit only |
| `UNKNOWN` | Unsupported | Unsupported | Audit only |

The dataset validator's `VERIFIED` state does not by itself waive source competence, exact applicability, or identity. Runtime does not re-fetch sources; approved artifact provenance is the traceability boundary.

## N. Limited Support relationship

The existing `LimitedSupportAssessment` remains authoritative and fail-closed; this policy does not redefine how `PERMITTED`, `NOT_PERMITTED`, or `UNRESOLVED` is produced.

Vehicle Evidence can provide inputs/limitations to that assessment:

- `REPORTED`, `PARTIAL`, or supporting-only evidence may justify a limited discovery/consideration statement when limited support is explicitly `PERMITTED`.
- Non-material evidence gaps and incomplete discovery coverage can be carried as limitations.
- `LimitedSupport` never converts insufficient REQUIRED evidence into `SATISFIES`, never overrides a hard mismatch, never resolves a conflict, and never makes a selected candidate final-decision eligible when a material requirement depends on it.
- `UNRESOLVED` or absent limited-support determination remains fail-closed under the existing runtime.

## O. User clarification boundary

Ask the user only to resolve user context: materiality, threshold, intended operating condition, equipment inclusion semantics, passenger count, trailer mass, SOC comparison interval, or whether a preference is actually a constraint. For example, “Yedi koltuk zorunlu mu?” is valid.

Do not ask the user to supply missing vehicle facts or choose between conflicting sources. “Bu aracın çekme kapasitesi nedir?” cannot repair dataset evidence. Vehicle-fact gaps require evidence collection/release work or remain explicit insufficiency.

If the user's clarified threshold would not change eligibility among candidates or the domain is unsupported, do not manufacture further questioning as a substitute for evidence.

## P. Final recommendation evidence gate

A reliable final recommendation of a selected candidate requires all of the following:

1. Candidate identity is eligible in the active pinned artifact.
2. DecisionContext/materiality sufficiency and the correct Cars policy are resolved.
3. Every material REQUIRED requirement for the selected candidate is evidence-evaluable using accepted source authority, `VERIFIED` state, and `EXACT` applicability.
4. Every material hard constraint returns `SATISFIES`; none returns `DOES_NOT_SATISFY`.
5. No material requirement has `INSUFFICIENT_EVIDENCE` or `UNRESOLVED_CONFLICT`.
6. Recommendation authorization is true and relevant population rejections are neither blocking nor unresolved.
7. Limited-support-only evidence is not load-bearing for selection; permitted non-material/supporting limitations are disclosed.
8. The selection does not depend on an arbitrary score or an unauthorized cross-metric normalization.

Perfect P1/P2 completeness is not required. Non-material supporting or optional gaps may remain. Other candidates may be eliminated for verified hard mismatch or may remain non-evaluable; the final explanation must distinguish those cases. If multiple candidates remain equally eligible and no authorized deterministic differentiator exists, this policy does not authorize silently declaring a winner; a separate existing selection rule, meaningful user clarification, or an explicit limitation is required.

## Q. Legacy heuristic migration matrix

| Current behavior | Classification | Product disposition |
|---|---|---|
| `resolveVehicleUseRequirements` domain names | `RETAIN AS PRODUCT POLICY` (names only) | Retain as Product-owned intermediate domain groups; version the atomic criterion output and lineage |
| Regex/pattern extraction in `resolveVehicleUseRequirements` and `matchesExplicitContext` | `MIGRATE TO EVIDENCE POLICY` for downstream effect | May remain bounded extraction/proposal logic subject to DecisionContext confirmation; it must not itself prove suitability |
| `hardBodyTypes` use-case allowlists | `REMOVE AFTER MIGRATION` | Body family is at most declared supporting evidence except when the user explicitly requires a body type |
| `specializedOffRoadIds` hard-coded `Car.id` set | `REMOVE AFTER MIGRATION` | Hidden ID membership is invalid suitability authority; use ground clearance/drivetrain/angle facts under this policy |
| `offRoadModels` model-name set | `REMOVE AFTER MIGRATION` | Model-name membership cannot prove rough-road capability |
| `CLASSIC` / model-year `<= 1999` | `DEPRECATE` | No Product authority for the threshold; domain is deferred pending explicit Product definition |
| Performance by Coupe/Sedan allowlist | `REMOVE AFTER MIGRATION` | Use atomic power/torque/0–100 requirements; body type is not performance proof |
| Cargo/passenger/towing/family/urban by body type | `REMOVE AFTER MIGRATION` | Replace with the corresponding atomic rules; body type may remain supporting/presentation data |
| Explicit fuel, transmission, body type, price, mileage, and new/used filters | `MIGRATE TO EVIDENCE POLICY` where the category becomes governed; otherwise `UNRELATED` legacy/catalog constraint behavior | Preserve exact user constraints, but route migrated technical categories through their single authority. Price/mileage/listing-state evidence is outside this Vehicle Evidence policy |
| `calculateDecisionScore` age/km/price score and use-case bonus | `DEPRECATE` | Not authorized by this policy; must not govern evidence-backed recommendation or final selection |
| `defaultRanking` / top-three and `isTopPick` | `DEPRECATE` for evidence-backed final authority | Requires separate Product ranking/selection authorization; cannot compensate for evidence insufficiency |
| `USE_CASE_MATCH` reasons emitted merely from detected text | `REMOVE AFTER MIGRATION` | A reason must cite an evaluated atomic requirement, not just echo detected intent |
| Consumer experience by `Car.id` | `UNRELATED` to Vehicle Evidence v0.1 and unsupported as proof | Must not establish atomic capability or final eligibility under this policy |
| Existing sufficiency, materiality, rejection, authorization, and `LimitedSupport` gates | `RETAIN AS PRODUCT POLICY` | Extend their inputs with governed evaluation outcomes; preserve fail-closed behavior |

The invalidated behavior is any heuristic that treats ID, name, body type, or keyword detection as hidden proof once that category migrates to governed atomic evidence.

## R. Policy versioning

This authority is identified by:

```text
policy_id      = cars.requirement-to-evidence
policy_version = 0.1.0
```

The Development Contract must pin or otherwise record the accepted policy version in each evaluation/decision trace and in the deterministic policy configuration that consumes the active runtime artifact. This is a Product/evaluation pin, not a fifth Vehicle Evidence source input and does not amend the architecture's four-input artifact identity.

- Patch: wording/diagnostic clarification with no result-semantic change.
- Minor: additive supported requirement or stricter/expanded evidence mapping with explicit compatibility review.
- Major: changed outcome semantics, evidence acceptance, material gate, or incompatible requirement representation.

Every version change requires Product approval, deterministic fixtures, migration notes, and replay impact assessment. Dataset coverage improvement does not silently change policy; policy evolution does not mutate historical artifacts or decisions.

## S. Remaining Product gaps

Non-blocking deferred gaps are:

- authoritative Classic meaning and any age/production-period rule;
- serious off-road categories and thresholds;
- generic qualitative thresholds for family practicality, urban ease, efficiency, EV usability, charging speed, and performance;
- cross-propulsion efficiency/TCO comparison, especially PHEV dual-mode semantics;
- Safety P1 policy and exact applicability treatment for assessment results;
- ranking/tie-break/single-winner authority when multiple candidates satisfy every material requirement;
- reliability, maintenance/service availability, TCO, price history, owner experience, resale, and insurance evidence contracts;
- an authored Product Specification/behavioral clarification corpus outside the current typed/tested repository contracts.

These gaps do not block deterministic v0.1 development for the supported atomic requirements. A request whose final selection materially depends on a deferred/unsupported domain cannot receive a reliable evidence-backed final recommendation under this policy.

## T. Development readiness

```text
PRODUCT READY WITH DEFERRED NON-BLOCKING DOMAINS
```

The next bounded gate may define the Development Contract for deterministic policy configuration/read model, identity map, `VehicleEvidenceReadPort`, evaluation outcomes, trace/version recording, and phased provider migration over approved v0.4.0 inputs. It must preserve single authority, fail closed, and contain no arbitrary suitability scoring.
