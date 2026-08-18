# Dacia Brand Batch 01 — Configuration Integrity Audit

Active catalog `v0.55.1` provenance produced **18** Dacia records from `dacia-brand-batch-01`. The audit did not use the generator array length as scope authority.

## Verdict

| Model | Audited | Valid current | Identity mismatch | Provenance insufficient |
|---|---:|---:|---:|---:|
| Bigster | 2 | 0 | 0 | 2 |
| Duster | 3 | 0 | 0 | 3 |
| Jogger | 4 | 1 | 3 | 0 |
| Logan | 3 | 3 | 0 | 0 |
| Sandero | 2 | 1 | 0 | 1 |
| Sandero Stepway | 3 | 2 | 1 | 0 |
| Spring | 1 | 0 | 0 | 1 |
| **Total** | **18** | **7** | **4** | **7** |

Exact configurations supported by official Turkey evidence are: Sandero Essential TCe 100 manual; Sandero Stepway Expression and Extreme Eco-G 120 auto/EDC; Jogger Extreme Eco-G 120 auto, 7-seat/EDC (`VEC063_TURQ`); Logan Essential TCe 100 manual; Logan Expression and Journey Eco-G 120 auto/EDC.

`VEC076_TURQ` proves Jogger Expression Eco-G 120, 5-seat, manual/BVM6—not the catalog EDC record. The audited Jogger Expression 7-seat EDC and Essential 5-seat EDC likewise do not match the official trim/seat/transmission binding. Sandero Stepway currently exposes only Expression and Extreme, so generated Essential EDC is a mismatch.

Bigster, Duster, Spring and Sandero Expression EDC were not labelled unsupported: exact immutable Turkey configuration evidence was insufficient, so they remain `PROVENANCE_INSUFFICIENT`. Current omission alone was not interpreted as “never sold.”

## Price separation

Three catalog prices are exact public observations, two are public but attached to unresolved configurations, and thirteen are internal estimates. Public price does not validate an exact configuration; internal estimates never establish availability.

## Root cause

`createBrandBatch()` assigns `HIGH` confidence and `ON_SALE` to every supplied candidate. The Dacia input uses shared-powertrain maps for Jogger and Sandero Stepway, parses Jogger seat count from the trim label, and uses one model-family URL for all rows. The `exact` flag changes only price authority, not identity authority.

## Proposed patch boundary

- Keep 7 exact IDs.
- Supersede 4 mismatch IDs with aliases; create replacements only where exact official evidence exists.
- Quarantine 7 records pending exact evidence.
- If quarantine is applied before replacements, recommendation-eligible count falls from 577 to 566; physical historical rows need not be deleted.
- A new immutable catalog release and fingerprint are required.

Equipment Batch 002 is safe only after the catalog patch is active, exact-ID aliases are settled, the pilot manifest is superseded/reselected, and equipment compatibility is rebound. Batch 001 remains immutable historical evidence.
