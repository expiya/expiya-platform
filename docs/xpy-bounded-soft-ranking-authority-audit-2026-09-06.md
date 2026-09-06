# XPY bounded soft-ranking authority audit

Baseline: `78e120a32733a00fc80b82253c3a38c2b04adf74` (universal Stage 1 card revision). Candidate is intentionally not deployed.

## Cars 0.75 reconstruction

| Signal class | Authority | Effect | Weight / cap | Candidate-count effect | UNKNOWN | Tie behavior |
|---|---|---|---|---|---|---|
| V3.9 owner-approved persona traits | `v3.9.0-catalog-v0.55.4-2026-08-24-owner-reviewed-rc.1`; payload digest `sha256:5bde…65a` | `BASE_SCORE_PLUS_CAPPED_PERSONA`; `BOUNDED_SOFT_RANKING_ONLY` | concept/trait contributions are 0.25, 0.5, or 0.75; aggregate persona contribution is `min(0.75, sum)` | none; ranking receives only the already eligible set | missing trait contributes zero | exact score equality remains a tie; stable exact ID is serialization only and cannot authorize a unique selection |
| Active explicit V3 preference | user-confirmed ledger event with `decisionUse=SOFT_RANK` | activates only an approved concept/trait mapping | no universal weight; uses the mapping above | none | no inferred event or trait | correction/supersession removes the old contribution |
| V2 daily-life / functional / affordability tiers | their existing policy and evidence authorities | lexicographic tiers in `rankSelectableCandidates` | existing tier-local values, not the V3.9 0.75 persona contract | none after the technical/affordability pool | incompatible/missing evidence follows the tier’s existing rules | deterministic exact identity serialization after all tier comparisons |

The 0.75 authority is therefore not a universal per-answer score. It bounds the total V3.9 persona contribution for one candidate after multiple eligible matches have been added.

## P→Y audit and coverage

| Domain / categories | P records | Domain mapping | Y consumes | Bounded additive status |
|---|---|---|---|---|
| Cars / NEW_CAR | explicit V3 ledger events; corrections supersede prior events | approved V3.9 concept→persona-trait table plus owner-approved exact-family traits | V3 catalog scorer; V2 has separate governed ranking tiers | ACTIVE for the V3.9 persona class, cap 0.75 |
| Appliances / 24 | accepted category context; Washing Machine has three active Pareto dimensions | Washing Machine maps remote control, detergent convenience, and comparable spin noise; other category mappings vary | governed Pareto selector | FAILED_CLOSED for additive ranking: active policy freezes global/contextual weights to `NONE` |
| Electronics / 24 | generic `IMPORTANT`, `NOT_IMPORTANT`, `UNKNOWN` question answers | no accepted value→technical fact/direction mapping; Laptop `IMPORTANT` is not a workload | conversation currently bypasses `selectByEvidenceDominance` after the question plan and returns the entire category as `NON_DOMINATED_SET` | FAILED_CLOSED: Product must approve material value domains, mappings, weights, and caps |
| Baby / STROLLER | hard/preference fields in stroller state | exact stroller evidence is used by hard compatibility/Pareto logic | stroller selector / explicit exact selection authorization | FAILED_CLOSED: active pack declares `scores=false`, `weights=false` |

Registered coverage is 50 categories: Cars 1 + Appliances 24 + Electronics 24 + Baby/STROLLER 1. Registration is not falsely reported as ranking parity: every non-Cars pack carries a machine-readable Product-authority gap.

## Required Product decisions

1. Appliances: approve category-owned additive soft mappings, contribution weights and per-class caps for all 24 categories, or explicitly retain the current unweighted Pareto contract.
2. Electronics: replace generic importance prompts with category-owned values and approve mapping direction/weight/cap. For Laptop, WORKLOAD must be a real use case mapped only to approved processor/RAM/GPU/storage evidence; DISPLAY and PORTABILITY must ask values that materially differ in the live pool.
3. Baby/STROLLER: approve additive classes/mappings/weights/caps, or retain the current score-free Pareto contract.

Until those decisions exist, transcripts for Laptop, Smartphone, Washing Machine, Refrigerator, Headphones, and STROLLER can honestly demonstrate retained membership and non-dominated/tied behavior, but cannot demonstrate authorized additive score contributions. Creating such traces would fabricate authority.
