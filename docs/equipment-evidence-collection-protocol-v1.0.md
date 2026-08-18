# Equipment Evidence Collection Protocol v1.0

This protocol is pinned to Equipment Evidence schema `1.2.1`, collection protocol `1.0.1`, canonical identity policy `1.0.0`, pilot selection policy `1.0.1`, and catalog `v0.55.1`.

Operational IDs are fixed as `EE-PILOT-001`, `EE-PILOT-001-CYCLE-001`, and `EE-PILOT-001-BATCH-001`. Stable records use the prefixes `EE-RES`, `EE-AST`, `EE-LINK-TRIM`, `EE-LINK-PKG`, and `EE-REV` with a collision-resistant digest of their stable semantic key; array position is never identity.

## Evidence and research disposition

Every assertion must reference an immutable source-registry artifact, its SHA-256, and a structured locator. A PDF locator uses the physical artifact page number. HTML, configurator, and structured-data locators must identify a deterministic section, selection path, or record path. Family-level evidence never gains exact-variant authority.

`NOT_RESEARCHED` is a ledger state and must not create an assertion. `RESEARCHED_INCONCLUSIVE` records completed research without asserting absence. `RESEARCHED_CONCLUSIVE` requires at least one assertion. Missing mention is never negative evidence.

## Canonical identities

Trim IDs include market, brand, model family, model year, official trim name, and optional catalog configuration identity. Package IDs include market, brand, model family, applicability years, official package name, and optional revision. Inputs use Unicode NFKC, Turkish lowercase, punctuation/whitespace folding, and a SHA-256-derived stable suffix. Visible names are retained in links; they are not global identity.

Trim and package links remain provisional until a second reviewer verifies their exact variant, market, model-year range, canonical identity, and assertion provenance. `mandatoryInCanonicalVariant=true` requires an official equipment matrix or configurator locator; price-list presence or marketing copy alone is insufficient.

## Double-entry review

Review events are append-only. A collector creates `COLLECTED`; a different review role must pass `SECOND_REVIEW_REQUIRED`. Negative assertions and exact trim/package links always require second review. Conflicts enter `CONFLICT_REVIEW_REQUIRED` and are never silently merged. Corrections use a new assertion and a supersession chain rather than mutating the original assertion.

The originating collector actor is projected from the first `COLLECTED` event for the subject and remains fixed across coordination or conflict events. A secondary reviewer must use the secondary-review role and a different actor instance. Owner approval requires the owner-approver role and an actor distinct from both collector and secondary reviewer.

## Source priority

1. Official Türkiye equipment list.
2. Official Türkiye configurator.
3. Official Türkiye technical specification.
4. Official Türkiye brochure.
5. Official Türkiye distributor product page.
6. Global manufacturer evidence only with explicit Türkiye applicability.

Third-party automotive sites cannot authorize Equipment Evidence. Mutable web pages require an immutable snapshot. Lower-priority evidence is not silently merged over a higher-priority conflict.

## Pilot acceptance criteria

- Lifecycle records for 100% of pilot variants and all 51 features.
- Immutable provenance and a valid locator for 100% of assertions.
- Second review for 100% of negative assertions and exact trim/package links.
- Zero silent conflict merges, family-to-variant automatic projections, provenance-free authoritative projections, `OPTIONAL → STANDARD` mistakes, and `UNKNOWN → NOT_AVAILABLE` conversions.
- Identical checksum on deterministic regeneration.

Low evidence coverage is not pilot failure; evidence integrity and projection safety are the acceptance objective.

## Decision Engine boundary

This protocol does not enable Decision Engine behavior. `HARD_FILTER_AFTER_CONFIRMATION` can become hard only after a separate deterministic interpretation policy confirms that the user explicitly made the feature mandatory. Neither the equipment resolver nor candidate-effect evaluator may promote intent by itself. Pilot data is limited to shadow/diagnostic use. Public ranking or filtering requires later feature-specific activation thresholds and explicit release approval.
