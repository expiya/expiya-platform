# Catalog Evidence Audit Wave 001 — 19-subject scope

This is a read-only catalog identity audit against active catalog `v0.55.2`. It is not a catalog release and does not mutate any production authority.

## Scope reconciliation

The accepted scope is **19 unique exact IDs**: 16 terminal `CATALOG_EVIDENCE_AUDIT_REQUIRED` subjects, one additional Volvo catalog-evidence handoff subject, and two Alpine `DEFERRED_IDENTITY_AUDIT` subjects. The prior `scope-reconciliation-blocker.json` remains unchanged as historical provenance. The three `SOURCE_INSUFFICIENT` records are not audit subjects; their existing escalation/backlog state was only reverified.

## Terminal result

| Disposition | Count |
|---|---:|
| `IDENTITY_CONFIRMED` | 2 |
| `PROVENANCE_REINFORCEMENT_REQUIRED` | 8 |
| `IDENTITY_FIELD_MISMATCH` | 7 |
| `DEFERRED_IDENTITY_AUDIT` | 2 |
| Other controlled dispositions | 0 |
| **Total** | **19/19** |

Confirmed subjects are Audi A8 L 50 TDI quattro MY2026 and Fiat Egea Sedan Easy 1.6 MultiJet 130 6MT MY2026. Eight configurations remain substantively plausible but need an immutable, exact temporal/applicability locator. Seven records have an actual identity-field contradiction and should be quarantined by a future immutable catalog patch rather than edited in place.

## Volvo authoritative bridge

No authoritative bridge was found from catalog label `P4 Long Range Ultra` to official TR identity `Ultra, Single Motor Extended Range`. The official Volvo configurator print does establish EX30, Ultra, Single Motor Extended Range, electric, MY2026, 5 seats, single-speed automatic and **RWD**. The catalog record says **FWD**, creating a second independent identity contradiction.

The Volvo result is therefore `IDENTITY_FIELD_MISMATCH`. Equipment inclusion/availability semantics were not used in that identity decision. No alias is recommended. A future patch should preserve the old ID historically and create a new exact ID from the official identity.

## Principal mismatches

- Togg T10F V1 RWD Long Range is stored as FWD.
- Porsche 718 Boxster is stored as FWD although official technical material states RWD; the base Boxster also lacks current MY2026 configurability.
- Fiat Ducato Minibüs is stored as 180 HP while the current official TR 16+1 product publishes 140 HP.
- Fiat Doblo uses `Combi` as a trim although the official 2026 automatic diesel grade is `Premio Plus`.
- Mercedes Vito does not have an official exact Panelvan + 114 CDI + Select + MY2026 chain.
- SEAT Leon's exact official FR 1.5 eTSI 150 DSG page explicitly applies to MY2024, not catalog MY2026.

## Alpine

A110 S and A110 GT remain `DEFERRED_IDENTITY_AUDIT`. Official TR pages confirm the model/trim and technical family but state that ordering is closed and only last vehicles remain. That is not equivalent to catalog `ON_SALE`, and exact MY2025 applicability/current official pricing remain unresolved.

## Patch recommendation

Recommend—but do not generate—immutable catalog patch `v0.55.3`:

1. Preserve `v0.55.2` and every historical ID unchanged.
2. Retain the two confirmed records.
3. Retain the eight provisional subjects only after provenance reinforcement or explicitly remove them from recommendation eligibility until reinforced.
4. Quarantine the seven mismatched IDs.
5. Create new IDs for corrected identities; never reuse an old ID.
6. Do not transfer equipment evidence, create unproven aliases, or migrate persisted offers as part of the catalog patch.
7. Revalidate all release-bound dependencies before a future atomic pointer activation.

## Files and systems intentionally unchanged

- Production catalog and every existing release
- Active catalog/equipment pointers
- Equipment evidence and exact-ID associations
- Persisted offers/aliases/migrations
- Decision Engine, routes and UI
- Database state
- Git history and remote state
