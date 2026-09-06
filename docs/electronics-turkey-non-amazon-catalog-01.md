# Electronics Türkiye non-Amazon catalog pass 01

## A. Verdict

`IMPLEMENTED` as a research-only, deterministic catalog-candidate bundle. No runtime, database, active pointer, deployment, affiliate, ranking, or recommendation behavior was changed.

## B. Scope

The pass investigated official Türkiye manufacturer pages, official Türkiye support/catalog pages, and authorized Türkiye channels for all 24 governed electronics categories. Amazon availability was recorded only as a relationship to the accepted first-pass bundle and never as technical, applicability, priority, or decision authority.

## C. Accepted input

The reconciliation is pinned to Amazon-first payload digest `sha256:09ef0e34db66fa00f9fb3b98f83db0370f1e0a2905da805c50282073576e3a20`. The generator fails closed if that digest changes.

## D. Method

- Two bounded product investigations per category; 48 total across four waves.
- Admission requires an exact manufacturer model code, an exact configuration identity, and Türkiye applicability from an official or authorized Türkiye source.
- Family-only pages, incomplete region/configuration identity, and already-admitted Amazon configurations are rejected.
- Retailers have no technical authority; international sources have no Türkiye-applicability authority.

## E. All-category coverage

| Wave | Category | Investigated | Admitted | Rejected |
| --- | --- | ---: | ---: | ---: |
| 1 | SMARTPHONE | 2 | 1 | 1 |
| 1 | LAPTOP | 2 | 0 | 2 |
| 1 | TABLET | 2 | 2 | 0 |
| 1 | MONITOR | 2 | 2 | 0 |
| 1 | TELEVISION | 2 | 0 | 2 |
| 1 | E_READER | 2 | 0 | 2 |
| 2 | HEADPHONES | 2 | 0 | 2 |
| 2 | PORTABLE_SPEAKER | 2 | 0 | 2 |
| 2 | SOUNDBAR | 2 | 0 | 2 |
| 2 | DIGITAL_CAMERA | 2 | 1 | 1 |
| 2 | PROJECTOR | 2 | 0 | 2 |
| 2 | GAME_CONSOLE | 2 | 0 | 2 |
| 3 | WIFI_ROUTER_MESH | 2 | 1 | 1 |
| 3 | NETWORK_ATTACHED_STORAGE | 2 | 0 | 2 |
| 3 | EXTERNAL_STORAGE | 2 | 1 | 1 |
| 3 | PRINTER | 2 | 0 | 2 |
| 3 | WEBCAM | 2 | 0 | 2 |
| 3 | COMPUTER_AUDIO | 2 | 0 | 2 |
| 4 | SMARTWATCH | 2 | 0 | 2 |
| 4 | FITNESS_TRACKER | 2 | 0 | 2 |
| 4 | HOME_SECURITY_CAMERA | 2 | 1 | 1 |
| 4 | VIDEO_DOORBELL | 2 | 1 | 1 |
| 4 | SMART_HOME_HUB | 2 | 0 | 2 |
| 4 | UNINTERRUPTIBLE_POWER_SUPPLY | 2 | 0 | 2 |

## F. Admitted exact candidates

| Category | Exact Türkiye configuration |
| --- | --- |
| SMARTPHONE | Samsung Galaxy A36 5G, `SM-A366BZKGTUR`, 8/256 GB, black |
| TABLET | Samsung Galaxy Tab S11 Wi-Fi, `SM-X730NZSPTUR`, 12/256 GB, silver |
| TABLET | Samsung Galaxy Tab S10 FE Wi-Fi, `SM-X520NZSPTUR`, 256 GB, silver |
| MONITOR | Samsung ViewFinity S6 S61F, `LS27F612EAUXUF`, 27-inch QHD 100 Hz |
| MONITOR | Samsung ViewFinity S9, `LS27C902PAUXUF`, 27-inch 5K |
| DIGITAL_CAMERA | Sony ZV-E10 II, `ZVE10M2B.CEC`, body only, black |
| WIFI_ROUTER_MESH | TP-Link Deco BE25, `Deco BE25(EU) V1 (2-pack)`, BE3600 |
| EXTERNAL_STORAGE | Samsung Portable SSD T9, `MU-PG1T0B/WW`, 1 TB, black |
| HOME_SECURITY_CAMERA | TP-Link Tapo C225, `Tapo C225(EU) V1`, indoor |
| VIDEO_DOORBELL | TP-Link Tapo D235, doorbell plus chime configuration |

## G. Reconciliation result

The second pass admitted 10 exact configurations. Combined with the 6 Amazon-first candidates, the research catalog contains 16 unique exact identities. Duplicate exact IDs: 0. Duplicate configuration identities: 0. Amazon-relationship priority effect: `false`.

## H. Remaining gaps

Fourteen categories produced no second-pass admission. Their 28 investigated rows remain explicit rejections, principally because a page exposed only a family/model name, a Türkiye configuration or region code could not be proven, or an international page could not establish Türkiye applicability. These are evidence gaps, not negative product judgments.

## I. Authority boundary

All admitted rows are `GOVERNED_CATALOG_CANDIDATE` only. Every candidate carries `decisionAuthority: NONE` and `amazonPriorityEffect: NONE`. The manifest expressly sets both activation permission and production authority to `false`.

## J. Artifacts

- `features/electronics/turkeySecondPass.ts`: validation and decision-neutral identity projection.
- `features/electronics/turkeySecondPass.test.ts`: contract and materialized-artifact checks.
- `scripts/generate-electronics-turkey-second-pass.ts`: deterministic generator with accepted-input digest guard.
- `data/research/electronics/turkey-non-amazon-catalog-01/turkey-second-pass.json`: queries, investigations, candidates, rejection ledger, coverage, and combined summary.
- `data/research/electronics/turkey-non-amazon-catalog-01/cross-pass-reconciliation.json`: cross-pass IDs, collision results, and digest.
- `data/research/electronics/turkey-non-amazon-catalog-01/manifest.json`: artifact digests, counts, and non-activation declaration.

## K. Verification contract

Verification covers all-category minimum investigation depth, exact candidate backing, uniqueness within the second pass, no Amazon-first collision, immutable Amazon-first digest binding, combined count, source-authority neutrality, non-activation, deterministic regeneration, lint, TypeScript, and whitespace integrity.

## L. Next work unit

`WU-ELECTRONICS-CATALOG-RICHNESS-01`
