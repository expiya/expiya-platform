# Lint ledger

Candidate-delta lint (`RootStageOneExperience`, its test, and Tools route/test): **PASS, 0 warnings, 0 errors**.

Full repository lint: **PASS with 12 warnings, 0 errors**. `--max-warnings=0` remains red. No configuration relaxation or suppression is present in the candidate.

All warning-bearing files are byte-identical to base commit `3d8003149f40da244daf0f9aeb53c3d1f90b0aae` (`git diff --quiet` exit 0) and are outside the candidate delta.

| File | Line(s) | Rule | Baseline classification |
|---|---:|---|---|
| `data/cars/vehicle_evidence/working/SCALE_BATCH_02/build-workbook.mjs` | 2 | `@typescript-eslint/no-unused-vars` (`path`) | Existing vehicle-evidence working artifact |
| `data/cars/vehicle_evidence/working/SCALE_BATCH_03/build-workbook.mjs` | 2 | `@typescript-eslint/no-unused-vars` (`path`) | Existing vehicle-evidence working artifact |
| `features/electronics/allCategoryCatalogActivation.ts` | 62 | `@typescript-eslint/no-unused-vars` (`_priorReleaseDigest`) | Existing production-lineage activation code |
| `scripts/activate-electronics-smartphone-v02-reconciled.ts` | 28 | `@typescript-eslint/no-unused-vars` (`_discard`) | Existing activation script |
| `scripts/build-alpine-verification-workbook.mjs` | 16 | `@typescript-eslint/no-unused-vars` (`gray`) | Existing workbook script |
| `scripts/generate-appliances-global-evidence-candidate.ts` | 140, 147 | `@typescript-eslint/no-unused-vars` (five parameters) | Existing evidence-generation script |
| `scripts/prepare-electronics-smartphone-v02-production-lineage.ts` | 10 | `@typescript-eslint/no-unused-vars` (`gitJson`) | Existing production-lineage script |
| `scripts/verify-global-evidence-candidate-repair.mjs` | 2 | `@typescript-eslint/no-unused-vars` (`stat`) | Existing evidence verifier |

The candidate does not hide these warnings: the full lint report records all 12, while the candidate-delta gate demonstrates that this work unit adds none.
