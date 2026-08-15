# Alfa Romeo Brand Batch 01 — Discovery Report

Observed in Turkey on 2026-08-16. This is a controlled discovery artifact, not a production
activation decision.

## Official current-sale universe

The Alfa Romeo Turkey price page embeds the official Tofaş price circular. The circular is
effective from 2026-08-03, covers model year 2026 and contains four exact new-car price rows:

| Model / powertrain | Trim | Fuel | Transmission | List price |
|---|---|---|---|---:|
| Junior Elettrica | Speciale+ | Electric | Dual-clutch automatic | TRY 2,474,300 |
| Junior Ibrida | Speciale+ | Petrol hybrid | Dual-clutch automatic | TRY 2,668,200 |
| Tonale Hybrid 175 | Speciale | Petrol hybrid | DCT automatic | TRY 3,773,800 |
| Tonale Diesel 130 | Ti | Diesel | DCT automatic | TRY 3,455,400 |

These rows establish current Turkey-market configuration identity, model year and dated list
price. A price passing its effective date will remain usable by Expiya as a dated observation;
expiry is not a recommendation-filter exclusion rule.

## Models deliberately not promoted

Giulia and Stelvio material remains discoverable on the official site, but neither model occurs
in the current official price circular. The material is therefore not sufficient to label either
model as currently sold new in Turkey. They may remain catalog candidates pending a current
official order/configurator/price record. The 33 Stradale showcase is also outside this batch.

## Reconciliation and production gate

The four rows represent two model families and four exact powertrain/trim configurations. Each
row was reconciled with its official Turkey model page, official technical brochure vocabulary
and configuration-specific June 2026 WLTP label.

The completed evidence pass:

1. Resolved brochure facts to each exact powertrain and trim without back-applying generic facts.
2. Retained Junior Elettrica's 54 kWh total and 51 kWh net battery semantics separately.
3. Preserved its 20-80% / 27-minute charging context in provenance rather than flattening it
   into a context-free charge-time field.
4. Distinguished Tonale's system/combustion/electric power semantics and verified the price-page
   `HYBRID 175` identity against the technical table.
5. Passed conflict, record-consistency, P0 coverage and production-readiness validation.

## Production activation

All four exact configurations are active in immutable production catalog `v0.4.0`, bringing the
catalog to 56 records. The prior Hyundai release `v0.3.0` is the rollback target. Giulia,
Stelvio and 33 Stradale remain withheld.

Direct binary PDF retrieval was blocked by the publisher CDN in the collector environment. This
was not bypassed. Facts were cross-checked using the current official model pages, the official
catalog links and indexed official PDF content; the limitation is declared in the release
manifest. No brochure image or prose is republished.

Final verification: `PASS` - 98 test files / 763 tests, TypeScript, active catalog authority,
vehicle-evidence runtime checks and the Next.js production build.

## Source chain and usage policy

- Parent page: https://www.alfaromeo.com.tr/alfa-romeo-fiyat-listesi
- Official Tofaş circular: https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo
- Market / condition: Turkey / new
- Raw HTML snapshots are retained locally and SHA-256 hashes are recorded in `manifest.json`.
- Extract only public factual fields. Do not republish Alfa Romeo imagery, brochure prose or page
  design. The site copyright notice means broader commercial content reuse requires permission.

The collector requires exactly four rows for this observed circular. If the official list changes,
it stops for manual review instead of silently importing a changed universe.
