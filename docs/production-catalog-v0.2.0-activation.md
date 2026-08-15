# Production Catalog v0.2.0 Activation

Status: **ACTIVE**

Market: **TR**

Activated at: **2026-08-16 (Europe/Istanbul)**

The immutable `v0.2.0` release remains unchanged. Production authority is granted by
`data/production/catalog/active.json`, which pins the release version and exact payload hash.

Activation gates:

- release validator: PASS
- approval state: APPROVED
- record count: 13
- payload hash: `sha256:393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba`
- previous/rollback release: `0.1.0`
- market: TR
- condition: NEW only

Production catalog reads fail closed if the active pointer, release version, payload hash,
approval, validator result, market or rollback target disagree.

Runtime price freshness remains request-time scoped and informational: a passed `validUntil`
date does not filter a variant or its last sourced price out of the decision catalog. A variant
stays part of the immutable active release, and an expired price remains usable while carrying
its original observation and validity dates.
