# Global evidence consolidation and activation review

Date: 2026-09-05  
Original review: `WU-XPY-GLOBAL-EVIDENCE-CONSOLIDATION-ACTIVATION-REVIEW-01`  
Repair: `WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01`  
Overall verdict: **READY_FOR_APPROVAL**  
Activation performed: **NO**

The two bounded defects from the original review are repaired. Both candidates remain inactive and decision-neutral. This verdict means the repaired bytes may be submitted for a separate approval decision; it is not an activation approval and no active pointer, runtime selection, deployment, database, migration, price, offer, affiliate, media, licensing, UX, or commerce authority changed.

## Repaired candidate decisions

| Candidate | Candidate identity | Repaired digests | Verdict |
|---|---|---|---|
| Cars | `v1.0.0-catalog-v0.55.4-2026-09-05` | candidate file `sha256:e3eb57753c5deb7f8a259639ea560848f8dc093a51098877c23d73cb34c007f6`; release `sha256:316d2238c40b0330fe1f4d722c8121ab1e429cca93bc3fd9899a929c9a9f67ed`; manifest bytes `sha256:976b7b04e4d2040d23b4ffd492e6a90b83b462249506896ba540f08111e5868b` | **READY_FOR_APPROVAL** |
| Appliances | `APPLIANCES-GLOBAL-EVIDENCE-TR-v0.1-rc1` | candidate payload `sha256:24f2918b39f8955ae4cfe8101067081e0ab63353c98b647aefcecf8c6a22d9ff`; release `sha256:d10f0773b7503d7125255ccf0f53b45257ff539a235b7328da351f34ebe637df`; manifest bytes `sha256:97cadbf859224e25560c4acb9834ef24d883c2abd6f76e24b638693d50581b51` | **READY_FOR_APPROVAL** |

These digests supersede the repair-required digests recorded by the original review.

## Cars repair and independent findings

- The two BYD SEAL U EV L9 records now resolve to the preserved PDF bytes: adaptive cruise control is physical PDF page 118, section `Adaptif Hız Sabitleme Sistemi (AHSS)`; blind-spot support is physical PDF page 134, section `Kör Nokta Destek Sistemi`.
- The corrected locators are present in both `manual-index.json` and the candidate-local `daily-life-exact-applications.json`. The source equipment and daily-life releases were not mutated.
- All ten Cars L9 locators were textually and visually checked against their physical PDF pages. The three PDFs match their declared SHA-256 values and byte lengths and are valid, unencrypted PDFs.
- Independent recomputation proves 549 unique catalog members with a catalog-identical ID set; 11,154→11,154 exact technical fields; 112→126 equipment assertions; 6→10 equipment-covered variants; 4→8 exact verified variants; three L9-ready exact variants; and 0→20 daily-life applications over five exact variants.
- All 20 daily-life applications remain `decisionUse=NONE` and `directCandidateEffect=NONE`. The exact manual surface remains L9 read-only and isolated from P/Y, filtering, ranking, sufficiency, recommendation, and authorization.
- Fourteen manifest members, including the candidate-local corrected daily-life projection and three manual byte artifacts, recompute to their recorded digests. The composite release digest recomputes exactly.
- The five recorded Cars active-pointer hashes are byte-identical before/after and still match the current files.

## Appliances repair and independent findings

- Arzum AR 012 is no longer counted as a new manual because its product/artifact pair is already active in governed manual release v0.2. Its active page-4 grounding is removed from the candidate as an overlapping duplicate; its distinct page-10 `MONTAJ ŞEMASI` installation record remains.
- Canonical-set recomputation yields 14→17 unique manuals, 9→16 non-duplicate L9 records, and 213→207 absent units. The reduction is based on three newly covered manual products plus three newly covered L9 products, not raw locator count.
- All four manual-researched products are classified `RESEARCHED_EXACT_MANUAL_ADMITTED` and none appears in `unresolved-ledger.json`.
- All four referenced exact-manual artifacts, including the active Arzum bytes supporting the new page-10 record, match SHA-256, byte length, and page count. Every identity and knowledge page/section was textually and visually verified.
- Independent active-catalog recomputation proves 97 unique products, 24 categories, and 1,253→1,253 exact technical/capability assertions. The candidate adds 60 family-scoped `EXPLANATION_ONLY` assertions and 60 one-to-one L6 interpretations.
- All seven new L9 records are Advisor-read-only with `decisionAuthority=NONE` and `candidateEffect=NONE`. No family item enters P/Y or any executable decision surface.
- LG `GC-B569NLLM` remains `UNKNOWN_EXCLUDED` with no assertion admitted.
- Candidate, coverage, research ledger, source registry, unresolved ledger, dry run, completion report, manual exclusions, admitted-manual input, all manual byte bindings, canonical-set hashes, and the composite release digest recompute exactly.
- Thirty-one Appliances active-pointer hashes are byte-identical before/after and still match the current files.

## Consolidated verified matrix

| Scope | Members | Exact accepted | Family/explanation | Exact manuals | L9 | L6 / exact daily-life | Improved / unchanged |
|---|---:|---:|---:|---:|---:|---:|---:|
| Cars | 549 | 11,154→11,154 technical fields | 0→352 variants | 0→3 | 0→3 variants | 0→20 exact apps | 5 / 544 |
| Appliances | 97 | 1,253→1,253 assertions | 0→60 assertions | 14→17 | 9→16 records | 0→60 L6 | 29 / 68 |

Appliances retains 12 explicit unresolved products after the LG conflict is recorded; absence remains 207 canonical coverage units. Cars retains 197 researched-inconclusive variants and 8,646 absent/unknown technical-to-daily-life assignments. All unknowns remain neutral.

## Execution ledger update

Machine-readable evidence is in `docs/audits/WU-XPY-GLOBAL-EVIDENCE-CANDIDATE-REPAIR-01.execution-ledger.json`.

| Gate | Command/evidence | Result |
|---|---|---|
| Cars regeneration | `node scripts/generate-cars-global-evidence-enrichment-01.mjs` | PASS |
| Appliances regeneration | `node --import tsx scripts/generate-appliances-global-evidence-candidate.ts` | PASS |
| Independent canonical recomputation | `node scripts/verify-global-evidence-candidate-repair.mjs` | PASS |
| Appliances composite verifier | `node --import tsx scripts/verify-appliances-global-evidence-candidate.ts` | PASS, all checks and four manual checksums |
| Focused regressions | `npx vitest run features/appliances/globalEvidence.test.ts features/appliances/globalEvidenceArtifacts.test.ts features/vehicle-data/carsGlobalEvidenceEnrichmentArtifacts.test.ts` | PASS, 3 files / 17 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| PDF page/section inspection | Text extraction plus rendered review of 22 relevant identity/locator pages | PASS |
| Active-pointer mutation | Five Cars and 31 Appliances pointer hashes | NOT PERFORMED / byte-identical |
| Activation, deployment, database, migration, fetch | Prohibited | NOT PERFORMED |

## Approval boundary

**READY_FOR_APPROVAL.** Both repaired candidates pass the bounded consolidation review. Approval and activation remain separate actions. This work unit does not recommend additional open-ended research and does not activate either candidate.
