# Catalog Factory coverage audit — 2026-09-07

This is a repository-only, deterministic audit. It performed no external research, admission, activation, pointer change, deployment, database mutation, or XPY root migration.

## Production lineage snapshot

| Department | Active categories | Active exact variants | Boundary |
|---|---:|---:|---|
| Cars | 1 | 549 | Current checkout `data/production/catalog/active.json` |
| Appliances | 24 | 113 | Current authority pointers on the production lineage ref |
| Electronics | 24 | 93 | Active runtime v1.2 all-category authority |
| Baby & Child | 1 | 4 | Active stroller membership |
| Mobility | 3 | 10 | Active mobility manifest |
| Tools | 1 | 16 | Active cordless-drill event |

The pending Smartphone package contains 33 exact products, but contributes **zero** to active totals. Electronics remains 93, including the six Smartphones already present in v1.2. The pending package must not be treated as integrated or active.

The machine-readable ledger contains one row per active category with exact count, brand/product-class/segment diversity, observed technical-field fill and differentiation rates, persona, daily-life, primary-evidence, media, TR-commerce and UNKNOWN status. A metric is `null` when the active artifact does not make that metric machine-auditable; the audit does not manufacture a denominator.

## First expansion wave

Priority is high decision impact plus low current coverage. These are planning thresholds, not admissions.

| Priority | Category | Department | Exact variants | Brands | Segments | Source boundary |
|---:|---|---|---:|---:|---:|---|
| 1 | Child car seat | Baby & Child | 12 | 4 | 4 | Manufacturer/manual/TR retailer; affiliate not required |
| 2 | Baby monitor | Baby & Child | 12 | 4 | 3 | Primary evidence without affiliate; affiliate optional for commerce |
| 3 | Document scanner | Electronics | 15 | 5 | 4 | Manufacturer/manual/TR retailer; affiliate not required |
| 4 | Tyre | Cars | 20 | 5 | 5 | Specialist retailer or affiliate needed for broad current commerce discovery |
| 5 | Office chair | Home & Projects | 15 | 5 | 4 | Retailer discovery needed; Awin/Admitad is an optional accelerator |
| 6 | Lawn mower | Home & Projects | 15 | 5 | 4 | Primary evidence without affiliate; affiliate useful for volatile offers |

Affiliate feeds remain discovery and volatile-commerce inputs only. They are not identity, technical evidence, semantic, persona, or ranking authority. Price/stock/delivery freshness remains a commerce gap across every category until separately governed.

## Interpretation limits

- “Hard-filter coverage” measures observed technical fact keys because the active authorities do not expose one shared required-filter registry. It is explicitly labelled with that basis.
- Baby, Mobility and Tools active pointers/manifests do not embed their full product records, so several richness rates are deliberately `null`/not machine-auditable.
- Media and daily-life/persona authority are often separate layers. The ledger reports their declared state rather than inferring per-record coverage.
- The lineage ref is pinned by name in the generator and all row evidence paths are recorded. Re-running against another ref requires an explicit environment override.

