# WU-XPY-STAGE2-ELECTRONICS-SIGNED-HANDOFF-AUTHORITY-01

## A. Scope

Prepare one shared signed Stage 2 handoff authority candidate for all 24 active Electronics categories. Preserve base `a2d8aae8d176968af1e88a7727f1daa926301dd1`, production source `015e2cf2327874fa0e481ace06f9f6e58209e1eb`, Stage 1 membership/ranking/P/Y, and all active pointers. No secret creation, environment mutation, database migration, runtime registration, deployment, Stage 3, sales or payment.

## B. Candidate contract

`electronics-stage2-handoff/v1-candidate` binds department/category, conversation, decision revision/fingerprint, exact product/configuration, catalog release/digest, policy version/digest, explicit consent event/time, category comparison-schema digest, key id, issue/expiry, nonce and revision-bound replay policy.

## C. Explicit consent

Issuance requires a separate `electronics-stage2-consent/v1-candidate` event with purpose `OPEN_STAGE_TWO_EXACT_PRODUCT_EVALUATION`. The event must exactly match conversation, category, decision, product and configuration and must predate issuance. Stage 1 purchase intent or a decision card is not treated as implicit Stage 2 consent.

## D. Category comparison authority

Each category receives a distinct candidate schema digest derived only from its existing category-policy keys. Lifecycle is `PENDING_OWNER_APPROVAL`; the candidate does not authorize display rows or comparisons before approval and durable entitlement integration.

## E. Readiness matrix

All 24 categories — SMARTPHONE, LAPTOP, TABLET, MONITOR, TELEVISION, E_READER, HEADPHONES, PORTABLE_SPEAKER, SOUNDBAR, DIGITAL_CAMERA, PROJECTOR, GAME_CONSOLE, WIFI_ROUTER_MESH, NETWORK_ATTACHED_STORAGE, EXTERNAL_STORAGE, PRINTER, WEBCAM, COMPUTER_AUDIO, SMARTWATCH, FITNESS_TRACKER, HOME_SECURITY_CAMERA, VIDEO_DOORBELL, SMART_HOME_HUB and UNINTERRUPTIBLE_POWER_SUPPLY — have the authority candidate and category schema prepared. All remain runtime `MISSING_STAGE_TWO_AUTHORITY` and adapter-unregistered until exact package approval, durable consent/audit persistence and production key configuration exist.

## F. Key lifecycle and rollback

Exactly one ACTIVE key signs and verifies. During rotation, the prior key becomes VERIFY_ONLY until maximum token TTL elapses. REVOKED keys reject immediately. Rollback may restore a prior key only through a separately approved environment change and audit event. No key material or environment variable value exists in this package or commit.

## G. Threats and invariants

Tests cover tamper, malformed material, expiry, future consent, cross-category use, exact product/configuration mismatch, revision/fingerprint mismatch, catalog/policy mismatch, consent substitution, verify-only rotation and revoked-key rejection. Unknown price/media remain outside the authority candidate and cannot be promoted by it.

## H. Replay and expiry

Tokens are reusable only for the same persisted decision revision and current authority until their bounded expiry. Nonce prevents token identity collision; durable replay observation is required before activation. Any current-authority change fails closed.

## I. Database migration assessment

A migration is required before activation because the current Electronics persistence schema has no append-only Stage 2 consent event, handoff issuance/audit, replay observation or consent revocation linkage. This unit supplies only the assessment. No SQL or database state was changed.

## J. Immutable owner-review package

Package: `data/research/electronics/stage2-signed-handoff-authority-01/owner-review-package.json`. Single eligible digest: `sha256:ac684b0970c3ec1098cabcdb1dd09f650c6fae26d4c61b6a32214752a5f94abc`. Serializer/digest and membership tests bind the exact package. The adjacent approval sentence authorizes the whole later activation/configuration/deployment scope at once and avoids intermediate approval loops.

## K. Runtime and UI boundary

No adapter is registered, so unsupported access remains on the existing protected Electronics Stage 2 page. No product, price, media, Advisor, comparison, sales or payment UI was activated. The shared renderer’s honest unavailable states remain available for a later approved adapter unit.

## L. Verification

Focused contract, digest, membership and threat gates passed 6 files / 25 tests before approval. The full Node 24 suite passed 778 files / 5,892 tests. TypeScript and diff check passed. Lint reported 0 errors and the same 12 unrelated baseline warnings. The Node 24 production build passed release typecheck, active-authority checks, compilation and all 626 pages. At 390×844 the protected Electronics Stage 2 page has no horizontal overflow, returns to Electronics, exposes no payment/order/offer action and shows no internal identifier. A valid Stage 2 state remains intentionally unavailable because the candidate is not approved or registered.

## M. Exactly one next bounded recommendation

After exact package approval, execute `WU-XPY-STAGE2-ELECTRONICS-CONSENT-PERSISTENCE-ACTIVATION-01`: add the reviewed append-only migration and server persistence only, configure no secret, register no adapter and deploy nothing until its migration verification receipt is approved.
