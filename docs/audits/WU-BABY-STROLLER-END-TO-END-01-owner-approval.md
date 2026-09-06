# WU-BABY-STROLLER-END-TO-END-01 — consolidated owner approval

Status: `OWNER_APPROVED_AND_REPOSITORY_ACTIVATED`

Candidate release: `BABY-STROLLER-TR-v0.2-approval-candidate`

Authority digest: `sha256:e0f9a3bd92488849e81b0462ada33056a450bab9f5f08759fbf01e91bbc9e4ae`

The prior provisional digest `sha256:ae362103ae21a2a95122fdf308c6bfbc954d21c60d2dc44de29adc33da713ac9` is superseded, is not approved, and must never be activated.

## Recovery ledger

- Source and production baseline observed read-only: `246e4c02278fa664093f4eed9fb218ed6a556aca`.
- Prior owned delta: 11 files, 198 insertions: `app/baby/**`, `features/baby/**`, migration `0016`, and this report.
- Source checkpoint: `58a0648`; reconciled checkpoint: `d944204`.
- Excluded as unrelated: package-file changes and shared pre-existing platform files.

## Exact catalog and evidence closure

Admitted exact Türkiye-applicable configurations:

1. Chicco Goody Plus / `04079877190000` / Dusty Green / Türkiye.
2. Chicco Mysa / `05087158450000` / Black Satin / Türkiye.
3. Chicco Bellagio 2.0 / `07087183330000` / Fir Tree / Türkiye.
4. CYBEX Balios S Lux / `520001251` / Navy Blue, Silver Frame / Türkiye.

Manufacturer sources and their separate identity/applicability, technical-fact, and manual/support purposes are frozen in `features/baby/catalog.ts`. Missing fields remain `UNKNOWN`; no comfort, safety, airline, terrain, newborn, or compatibility guarantee is inferred.

Joie Pact and Tourist were checked once against manufacturer-controlled Türkiye/distributor authority. Their Turkish manufacturer manuals do not prove an exact Türkiye color/SKU configuration, so both are terminally rejected. Reconciliation: 11 observed = 4 admitted + 5 insufficient Türkiye applicability + 2 ambiguous identity; zero silent drops.

## Runtime and boundary

The STROLLER Domain Pack retains all 16 shared XPY behavioral capabilities. X provides bounded novice information; P asks one evidence-material Turkish question at a time; Y filters deterministically, preserves unknowns, returns a non-dominated set instead of inventing a winner, and authorizes only an eligible exact card. Price is only an explicit filter and is not technical authority.

Migration `0016` is additive and category constrained. `/api/baby/conversation` uses strict validation, same-origin/rate-limit controls, PostgreSQL transactions, revision CAS, message-idempotency conflicts, pinned authority digests, and refresh recovery. `/baby` reloads server-owned state. AŞAMA 2/3 remain gated.

Secretary routes `bebek arabası`, `puset`, `travel sistem`, and `çocuk arabası` to `/baby`; Cars compound suppression remains for toy cars, car seats, and car beds. The current repository `LayoutProps` failure was reproduced and repaired at its source with an explicit root-layout children type; no generated workaround was added.

## Verification before approval freeze

- Repository TypeScript: passed.
- Focused Baby/Secretary/API/landing suite: 6 files, 28 tests passed.
- `git diff --check`: passed.
- Full suite: 680 files / 5,538 tests exercised; one root-label HTML-escaping assertion failed after the department addition, was repaired, and its targeted 4-test file then passed. A final full rerun remains an activation gate.
- Scoped stroller/platform lint passed. Full lint remains blocked by 14 pre-existing `no-explicit-any` errors in unrelated appliances evidence scripts.
- Production build passed on host Node 26.6.0 and emitted `/baby`, `/baby/stage/2`, `/baby/stage/3`, and `/api/baby/conversation`; the specifically requested Node 24 build remains an activation gate because no Node 24 runtime is installed on this host.
- Desktop/mobile persisted browser matrix, activation, deployment, and production smoke remain mandatory post-approval gates; no database environment was available in this isolated worktree for a truthful persisted browser claim.

## Exact owner approval wording

`I approve WU-BABY-STROLLER-END-TO-END-01 authority digest sha256:e0f9a3bd92488849e81b0462ada33056a450bab9f5f08759fbf01e91bbc9e4ae for bounded STROLLER activation.`

Approval covers only this immutable four-product STROLLER package. It does not authorize infant car seats, another Baby & Child category, silent mutation, or deployment without the remaining release and host safety gates.
