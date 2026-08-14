# Targeted Vehicle Evidence Enrichment — cargo_volume_l

## Executive verdict

TARGETED VEHICLE EVIDENCE ENRICHMENT VERIFIED WITH NON-BLOCKING NOTES

## Starting evidence matrix (Vehicle Evidence v0.4.0)

| Configuration | seats | cargo_volume_l | official_fuel_consumption_combined | Current state | Applicability |
|---|---|---|---|---|---|
| CFG-000037 — Hyundai IONIQ 9 Progressive | 7 — FAC-000178 / AST-000332 / SRC-000050 | 338 L — FAC-000182 / AST-000336 / SRC-000050 | UNKNOWN | seats and cargo VERIFIED | EXACT; TR Progressive 160 kW 4x2; cargo all rows upright |
| CFG-000055 — Renault Captur techno | 5 — FAC-000251 / AST-000447 / SRC-000065 | UNKNOWN | 5.9 L/100km — FAC-000252 / AST-000448 / SRC-000065 | seats and fuel VERIFIED; cargo UNKNOWN | EXACT; TR techno mild hybrid EDC 140 hp |
| CFG-000058 — Toyota Yaris Cross Hybrid Dream | 5 — FAC-000257 / AST-000453 / SRC-000068 | 397 L — FAC-000258 / AST-000454 / SRC-000068 | 4.6 L/100km — FAC-000259 / AST-000455 / SRC-000068 | all three VERIFIED | EXACT; TR MY2026 Hybrid Dream; cargo rear seats upright |
| CFG-000054 — Opel Corsa Hybrid GS | UNKNOWN | UNKNOWN | UNKNOWN | no applicable fact in target categories | UNKNOWN retained |
| CFG-000063 — BMW 320i Sedan M Sport | UNKNOWN | UNKNOWN | 7.3 L/100km — FAC-000266 / AST-000462 / SRC-000073 | fuel VERIFIED; seats and cargo UNKNOWN | fuel EXACT; cargo not yet collected |

## Source research result

| Candidate | Authoritative result | Applicability | Snapshot |
|---|---|---|---|
| IONIQ 9 | Existing 338 L retained; no duplicate collection | Exact TR Progressive, seven seats, all rows upright | Existing SRC-000050 snapshot and hash retained |
| Captur | Official Renault Türkiye cabin/dimensions page: 484–616 L, rear bench upright at rearward/forward slide endpoints; VDA ISO 3832 | Exact mild-hybrid powertrain; exact active techno configuration supported by SRC-000065 | SRC-000079 captured; SHA-256 `7814d091efca15599850609a73629bb29156cf02f6421d80432c4712059a90a0` |
| Yaris Cross | Existing 397 L retained; no duplicate collection | Exact TR MY2026 Hybrid Dream, rear seats upright | Existing SRC-000068 PDF snapshot and hash retained |
| Corsa | No authoritative Turkey source established exact MY26 Hybrid GS normal cargo volume or seat count | Not proven; UNKNOWN retained | No new source row |
| BMW 320i | Official BMW Türkiye 3 Series Sedan technical page: 480 L | BMW 320i Sedan value; cargo is configuration-independent across applicable M Sport trim | SRC-000080 captured; SHA-256 `1e5b585f8271e48e5e95763b288bdc909e751b53cebaa48b3986e75f7752776b` |

## Changes

| Fact | Subject | Value | State / semantics | Assertion | Source |
|---|---|---|---|---|---|
| FAC-000299 | CFG-000055 | 484–616 L | VERIFIED; EXACT_RANGE; MIN_MAX; rear seats upright; VDA ISO 3832 | AST-000495, EXACT | SRC-000079 |
| FAC-000300 | CFG-000063 | 480 L | VERIFIED; EXACT_SCALAR; rear seats upright | AST-000496, EXACT | SRC-000080 |

No seats fact was added. Corsa and BMW seat counts remain UNKNOWN because the bounded official cargo sources did not explicitly establish exact configuration seating.

## Before / after coverage

| Candidate | seats before | seats after | cargo before | cargo after | cargo migration eligible? |
|---|---|---|---|---|---|
| RVC-PILOT-0001 / CFG-000037 | VERIFIED+EXACT 7 | unchanged | VERIFIED+EXACT 338 L | unchanged | yes |
| RVC-PILOT-0002 / CFG-000055 | VERIFIED+EXACT 5 | unchanged | UNKNOWN | VERIFIED+EXACT 484–616 L | yes |
| RVC-PILOT-0003 / CFG-000058 | VERIFIED+EXACT 5 | unchanged | VERIFIED+EXACT 397 L | unchanged | yes |
| RVC-PILOT-0004 / CFG-000054 | UNKNOWN | unchanged | UNKNOWN | UNKNOWN | no; fail closed |
| RVC-PILOT-0005 / CFG-000063 | UNKNOWN | unchanged | UNKNOWN | VERIFIED+EXACT 480 L | yes |

- cargo VERIFIED+EXACT: 2/5 → 4/5
- seats VERIFIED+EXACT: 3/5 → 3/5
- Differentiation exists: 338 L, 397 L, 480 L, and adjustable 484–616 L; Corsa remains UNKNOWN for NOT_EVALUABLE testing.

## Dataset release and gates

- Dataset: v0.4.1 (backward-compatible evidence enrichment; no schema change)
- Schema: 0.1
- Batch: RUNTIME_CANDIDATE_ENRICHMENT_01
- Workbook SHA-256: `910507ec41cbb82a16a7b5ab31e37e0275c8d868a0c0baeb8275f0d29d18a7de`
- Validator: PASS, 0 ERROR, 10 inherited allowed snapshot warnings
- BMW fuel disagreement remains an audit note: Catalog 7.6 vs Vehicle Evidence 7.3 L/100km; no change or resolution in this batch.
- Corsa cargo/seats remain UNKNOWN / NOT_FOUND; not converted to NOT_AVAILABLE.

## Readiness

CARGO MIGRATION READY WITH PARTIAL COVERAGE

The controlled slice has four VERIFIED+EXACT candidates, differentiated positive/range values, and one intentional UNKNOWN. Current resolver scope supports configuration facts. No cargo conflict or Product/Architecture blocker was found. Runtime migration was not performed.

## Next gate

READY FOR CARGO RUNTIME MIGRATION
