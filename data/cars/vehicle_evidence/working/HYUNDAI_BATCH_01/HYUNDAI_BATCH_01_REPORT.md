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

## Official brochure evidence pass

The official Turkey brochure centre was collected on 2026-08-16. It exposes 13 current PDF
documents covering every model family represented by the 44 price rows (TUCSON petrol,
diesel and hybrid share one document). Each downloaded PDF was signature-checked and hashed;
the reproducible registry and hashes are in `brochure-manifest.json`.

The technical tables cover power, torque, transmission, drivetrain, dimensions, luggage and
WLTP consumption/range as applicable. Their equipment tables also distinguish trims. For i20,
the brochure explicitly says that the cabin camera belongs to GSR-II-C vehicles and E-Call to
E-Call-labelled vehicles; those price-row suffixes must therefore remain part of configuration
identity rather than being deduplicated away. The same rule applies to corresponding BAYON
rows until their equipment columns have been imported.

### Gate result after document inspection

- `41` price rows have a current family-level official brochure and a matching published
  powertrain/trim vocabulary. They can enter structured fact extraction, but are not yet
  production-active records.
- `2` older model-year rows need an explicit model-year applicability check before technical
  assertions are attached: KONA Prime MY2025 and TUCSON Elite Plus diesel MY2025. A newer
  brochure must not automatically be back-applied.
- `1` existing production mapping is blocked by a material conflict: TUCSON Comfort MY2026.
  The current April 2026 brochure and current price API both specify 180 PS; the active record
  says 160 PS / 117.7 kW. The active fact must be superseded with an auditable assertion, not
  edited as though no conflict existed.

No new variant was activated in this pass. The next controlled step is deterministic extraction
of the 41 matching rows into proposed facts/assertions, followed by the two model-year reviews
and the TUCSON supersession decision.

## Staged production slice 01A

The first low-ambiguity structured slice now contains `21` MY2026 configurations:

- i20: 10 (manual/DCT and exact Jump, Style, Elite, GSR2C and E-Call identities)
- BAYON: 9 (manual/DCT and exact Jump, Style, Elite, GSR2C and E-Call identities)
- i30: 2 (Comfort and Prime)

Every record has deterministic identity and price UUIDs, official brochure hash provenance,
official price-API provenance, powertrain facts, WLTP combined consumption, core dimensions,
luggage volume and configuration-applicable safety evidence. Both list and lower campaign
prices are retained when they differ. The price observation has no artificial expiry gate.

All 21 records pass record-consistency and production-readiness validation as of the observation
date. They remain in `stagedHyundaiBatch01Records`; this module is deliberately not referenced
by the active v0.2.0 catalog pointer. Activation requires an immutable next release and its
explicit release gate, so a partially reviewed brand batch cannot leak into recommendations.

### Brochure source

- Index: https://www.hyundai.com/tr/tr/satis/brosurler.html
- Authority: official Hyundai Motor Türkiye distributor content
- Extraction permission policy: public facts only; do not republish brochure imagery or prose
- Raw PDFs are local working snapshots because the set is approximately 113 MB. The collector,
  official URLs, byte counts and SHA-256 hashes are versioned so the source package is
  reproducible without making the Git repository a binary archive.
