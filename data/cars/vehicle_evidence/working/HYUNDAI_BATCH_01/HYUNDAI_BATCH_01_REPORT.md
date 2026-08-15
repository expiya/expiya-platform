# Hyundai Brand Batch 01 — Discovery Report

Observed in Turkey on 2026-08-16. This is a controlled discovery artifact, not a production
activation decision.

## Official result

- Official price-table model endpoints: 14
- Official Turkey new-car price rows: 44
- Model years represented: 2025 and 2026
- Every row carries an official list price and/or campaign price
- IONIQ 3 is present in Hyundai's model navigation but absent from the official price-table
  endpoint, so it remains an upcoming/non-price-verified candidate.

## Reconciliation with Expiya

- 2 official rows align with active production identities without a newly detected material
  conflict: IONIQ 5 Dynamic Visionroof 125 kW and IONIQ 9 Progressive 160 kW.
- 1 active production identity requires conflict review: the current official TUCSON Comfort
  row reports `1.6 T-GDI 180 PS`, while the active Expiya record carries `117.7 kW` (about
  160 PS). The price and trim identity align, but power must not be silently overwritten.
- 10 additional official rows align with verified Vehicle Evidence configurations that are not
  active in production: three i20 DCT trims, BAYON Style DCT, two INSTER trims, IONIQ 5 N,
  IONIQ 9 Calligraphy, SANTA FE Hybrid Progressive and STARIA Hybrid Elite.
- 31 rows are new exact configuration candidates, including i30, KONA, KONA Electric,
  TUCSON petrol/diesel alternatives, TUCSON Hybrid, the new IONIQ 6 powertrains, INSTER Cross
  and GSR2C/E-Call homologation/equipment distinctions.

## Production gate

The 44 rows prove current Turkey-market identity, model year and price applicability. They do
not by themselves prove all P0 technical and safety facts. Before activation, each row must be
linked to an exact official brochure/technical source, checked for equipment applicability and
passed through the existing production validator.

The TUCSON power conflict is blocking for that exact record until the current brochure is
reconciled. No conflict was averaged or overwritten.

## Source chain

- Page: https://www.hyundai.com/tr/tr/satis/fiyat-listesi.html
- Page-owned PAPI endpoint: https://org-eu-www.hyundai.com/eu/papi
- Query: `HppPriceListTR`, service `S03`, country `tr`
- Raw HTML and each model response are retained under `snapshots/` with SHA-256 hashes in
  `manifest.json`.
