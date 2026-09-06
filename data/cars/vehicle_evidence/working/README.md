# Vehicle Evidence Dataset workflow

Only `../MASTER/Expiya_Cars_Vehicle_Evidence_MASTER.xlsx` is the authoritative editable dataset. Desktop downloads, chat attachments, working files, CSV snapshots, and releases are not authoritative.

## Controlled workflow

1. Confirm `CURRENT_MANIFEST.json`, dataset/schema version, and master SHA-256.
2. Create `ACTIVE_SESSION.lock` with `batch_id`, `started_at`, `working_file`, and `base_master_hash`. Stop if a live lock already exists.
3. Copy MASTER to a batch-specific working file; never edit MASTER in place.
4. Apply evidence changes without inventing facts. Existing IDs are immutable; allocate new IDs with `npm run vehicle-evidence:next-id -- <tables-dir> <file:column:PFX>`.
5. Export normalized CSV tables and run `npm run vehicle-evidence:validate -- <tables-dir> <report-path>`.
6. Resolve every ERROR, review every WARNING, and review workbook layout/formulas manually.
7. On validator PASS only, create a new immutable `releases/vX.Y.Z/` directory. Never overwrite a release.
8. Copy the approved workbook and CSVs into the release, generate its manifest, then replace MASTER and update `CURRENT_MANIFEST.json`.
9. Remove the lock only after the manifest and master hash reconcile.

## Contract notes

- `CONFIGURATION=VERIFIED` requires both its generation and powertrain to be `VERIFIED`. There is no exception state in schema v0.1.
- Numeric scalar facts use `value`; numeric ranges use only `value_min`/`value_max` with `range_semantics=MIN_MAX`. `source_value_raw` is audit-only.
- `ground_clearance_mm` is `CONDITIONAL_MUST` only when rough-road, camping, stabilized-road, off-road, or clearance constraints are materially relevant.
- Charging duration requires structured SOC start/end context. Free-text context remains available for audit.
- An empty `07_SAFETY` sheet is valid. Safety evidence authority is governed separately from manufacturer technical authority.
- Experience ingestion is not active. Its schema will be introduced as a separate work unit before any experience data is collected.

## Source identity

Canonicalization lowercases scheme/host, removes fragments and common tracking parameters, sorts remaining query parameters, and normalizes trailing slashes. One canonical URL represents one source identity. Dated content should be captured as version/snapshot metadata; do not create a second source identity for the same canonical URL.
