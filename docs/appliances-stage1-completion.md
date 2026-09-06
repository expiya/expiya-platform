# WU-APPL-AŞAMA1-COMPLETION-01

## Cars parity audit

| Cars responsibility / reference | Reuse and Appliances adapter | Classification |
| --- | --- | --- |
| `executeAuthorizedCarsRecommendation`, `presentGovernedRecommendation` | Reconstruction from frozen catalog, semantic, question, sufficiency, selection and construction authorities; no Cars ranking or prose imported | EXPECTED DOMAIN DIFFERENCE |
| `carsHeldAuthorization`, V2 `offer/authorize` | Same server-only exact-identity/context-bound authorization-before-projection invariant. Appliances performs final validation immediately; no Cars offer/terms lifecycle or bearer token is introduced | EXPECTED DOMAIN DIFFERENCE |
| V2 fingerprint canonicalization | Imports existing domain-independent `canonicalize` for authorization identity; frozen Appliances policy hashes retain their original serialization | EXISTING PLATFORM CONTRACT REUSED |
| `projectAuthorizedCard.server`, `publicCardSchema`, `publicOutput` | Explicit typed public projection; revalidates current structured artifact and authorization. Vehicle/media/estimated-price fields are intentionally absent | EXPECTED DOMAIN DIFFERENCE |
| `runCarsDecisionTurnV2`, public route | Existing Appliances PostgreSQL store, CAS revision and message replay, with context + outcome + decision record committed together. No parallel persistence | EXISTING PLATFORM CONTRACT REUSED |
| Public conversation handoff | Natural-message API and `/appliances` client; ASK, CLARIFY, RESPOND, exact single decision, honest set states and safe failure | PLATFORM GAP resolved in repository |

## Authority and authorization

The active construction policy remains `WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY/v0.1`, digest `ebb53920764b5b85f4bd8df5d4f587181b8e9795bb3890e41b839a50ab5f987f`. No policy release or active pointer is changed.

Construction recomputes candidate evaluation, question planning, sufficiency and selection against the loaded authority. Caller-provided hashes are insufficient. The structured artifact includes all required contract fields, exact identities, upstream fingerprints, eligible evidence, rationale/semantic bindings, qualifications, warranty and budget-unknown alternatives.

Final authorization independently reconstructs and compares the artifact and binds conversation, revision, configuration identity and artifact fingerprint. Projection revalidates that authorization. Construction itself does not confer authorization. The public API accepts neither artifacts nor authorizations from clients. Tied, non-dominated, no-selection, pending questions, confirmations and ended conversations cannot obtain single-product authorization.

The decision artifact and authorization are persisted inside the existing conversation state JSON and message result transaction. Replay cannot resurrect a stale card after another turn, authority change or price expiry. READ recovers the current revision's last outcome, revalidating any card against current authority; it does not restore historical cards. RESPOND does not advance the decision and clears the current authorization reference.

## Integration corrections

- Soft evidence uncertainty is not promoted to hard uncertainty when partitioning budget-unknown alternatives. This follows the frozen sufficiency policy's mixed-price coverage rule.
- The budget-compatible recommendation pool is intersected with known-eligible candidates; price compatibility never overrides a technical incompatibility.
- Whole-number budgets such as `23000`, question-bound bare budget answers, and installation dimension additions are accepted without inventing context.
- `otomatik dozaj önemli değil` is not a domain-information question; unrelated negative preferences do not mark a first budget statement as a correction.

No AŞAMA 2 Advisor, seller selection, checkout, affiliate routing or marketplace ranking is implemented.

## PostgreSQL activation — completed 2026-09-03

Under explicit approval in **WU-APPL-AŞAMA1-POSTGRES-ACTIVATION-SMOKE-01**, the application database and role were matched against the same Next development environment and PostgreSQL pool used by the running application. No credentials were disclosed. All three Appliances tables and the replay index were initially absent.

Only existing migration `0009_appliances_runtime_foundation.sql` was applied using the repository's single-file transaction pattern. SHA-256: `706a6f5f8e90eb7de73ac6beaa4fbc6f0d76755bd631ff8a7a365f716b65f5c2`. All three tables and the replay index were verified before commit. No unrelated migrations, resets, deletes, evidence edits or changes to pre-existing user data were performed. Smoke conversations remain stored.

Live browser checks at `http://localhost:3000/appliances`, backed by the configured PostgreSQL:

- Page opens; natural messages produce ASK, CLARIFY and RESPOND.
- Refresh recovers the conversation and last outcome from PostgreSQL. The initial smoke exposed missing client recovery; the client now keeps only a conversation locator in the URL fragment, and READ revalidates recovered cards against current authority without writes or revision changes.
- Conversation `a773cd41-b211-43e0-b976-24705d5ed73a`, revision 5: authorized Beko CMX 8100 card, including exact configuration, governed evidence, price freshness, unknown-price alternatives and warranty/disclosures. Card survives refresh through server-side revalidation. Read-only DB audit confirms artifact/authorization fingerprint equality.
- Conversation `51c4657d-f0e8-44b4-a7b6-b97ce8c543ce`, revision 2: TIED_SET_EXPLANATION; no card and no stored authorization.
- Conversation `5eab33e3-51d4-41f7-8f8e-a14b7e2f198a`, revision 3: TRADE_OFF_SET_EXPLANATION; no card and no stored authorization.

Focused verification only: API integration and migration contract tests, **3 tests passed in 2 files**; scoped ESLint passed. Fresh-card and expired-card recovery are covered. The earlier 283/91/4518 test matrices and production build were not rerun during activation.

**AŞAMA 1 activation is complete on the configured database and local application.** No remaining activation blocker or new Product policy is required. This is not a production deployment, nor an implementation of AŞAMA 2/3.
