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

The four rows represent two model families and four exact powertrain/trim candidates. Price
evidence alone does not establish the P0 technical, dimensions, safety and configuration-level
equipment contract. No row is production-active yet.

Before activation:

1. Download and hash the official Junior and Tonale Turkey brochures.
2. Resolve brochure facts to each exact powertrain and trim without back-applying generic facts.
3. Retain reported battery-capacity semantics and charging SOC context for Junior Elettrica.
4. Distinguish Tonale's system/combustion/electric power semantics and verify the price-page
   `HYBRID 175` identity against the technical table.
5. Run conflict, P0 coverage and production-readiness validation.

## Source chain and usage policy

- Parent page: https://www.alfaromeo.com.tr/alfa-romeo-fiyat-listesi
- Official Tofaş circular: https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo
- Market / condition: Turkey / new
- Raw HTML snapshots are retained locally and SHA-256 hashes are recorded in `manifest.json`.
- Extract only public factual fields. Do not republish Alfa Romeo imagery, brochure prose or page
  design. The site copyright notice means broader commercial content reuse requires permission.

The collector requires exactly four rows for this observed circular. If the official list changes,
it stops for manual review instead of silently importing a changed universe.
