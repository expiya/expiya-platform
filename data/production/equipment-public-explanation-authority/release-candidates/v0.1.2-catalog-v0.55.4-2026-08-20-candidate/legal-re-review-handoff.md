# Equipment Public Explanation Authority v0.1.2 — Legal Re-review Handoff

- Predecessor: `v0.1.1-catalog-v0.55.4-2026-08-20-candidate`
- Successor: `v0.1.2-catalog-v0.55.4-2026-08-20-candidate`
- Predecessor state: `SUPERSEDED_PENDING_CORRECTED_LEGAL_REVIEW`
- Daily-Life payload: `sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233` (byte-identical, 51 records)
- Scope: 2 exact variants; 62 confirmed included assertions; 3 verified absences, all on BYD Dolphin Comfort MY2025.

## Corrected blockers

1. REC acceptance must be strictly before reveal by sequence and strict RFC 3339 instant. Equal sequence or timestamp fails closed.
2. The two reviewed comparison templates now explicitly forbid superiority and general quality/safety inference.
3. Preference/decline state is `CURRENT_VEHICLE_SESSION_ONLY`, bound to `conversationId + exactVariantId + offerId`.
4. Public telemetry uses a three-field allowlist and excludes REC proof, evidence/provenance IDs, checksums and raw user text.
5. Daily-Life, copy, privacy and telemetry artifacts are bound by child checksums and composite checksum `sha256:59a65a589f1d04507c86ee68a3f573bfd28f8bfee8cce673f9547cfb37916222`.

Public integration remains disabled. Global Equipment filtering, ranking, question generation and offer/card ordering remain disabled. Owner approval event count is zero. No activation or materialization has been performed.
