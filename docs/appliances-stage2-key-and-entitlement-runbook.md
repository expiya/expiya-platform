# AŞAMA 2 key and entitlement operations

## Startup gate

Production must provide `APPLIANCES_STAGE2_HANDOFF_KEYS` as a JSON array. Exactly one entry is `ACTIVE`; overlap keys are `VERIFY_ONLY`; immediately distrusted keys remain present as `REVOKED`. Every secret is at least 32 UTF-8 bytes and every ID is unique. `APPLIANCES_STAGE2_HANDOFF_TTL_SECONDS` is 60–3600 (default 900). Startup/readiness must call `checkSigningKeyReadiness(new EnvironmentProductionKeyProvider(...))`; a failed result is a hard readiness failure. No fallback key exists in production.

Example shape (placeholders only—never commit real values):

```json
[
  {"id":"stage2-2026-10","secret":"<from production secret manager>","state":"ACTIVE"},
  {"id":"stage2-2026-09","secret":"<from production secret manager>","state":"VERIFY_ONLY"}
]
```

Local/unit tests use `StaticLocalTestKeyProvider` with explicitly test-only material. That provider is not loaded by the production environment loader.

## Rotation, retirement, and emergency revocation

1. Add the new key as `ACTIVE` and change the old active key to `VERIFY_ONLY` in one atomic secret-manager revision.
2. Run readiness and a canary issue/verify check. Audit contains key IDs and outcomes only, never material or token bodies.
3. Keep the old key `VERIFY_ONLY` for at least the maximum token TTL plus clock-skew allowance.
4. Change it to `REVOKED`. Tokens bearing that `kid` fail immediately with `REVOKED_KEY`.
5. Remove a revoked key only after the audit-retention/incident window. Unknown IDs fail closed.

For compromise, skip overlap: install a new active key and mark the compromised key `REVOKED`. Expect all outstanding tokens signed by it to stop working. AŞAMA 1 state remains durable and users can request a fresh handoff.

## Entitlement security boundary

`comparison_entitlements` is authoritative. Browser flags, handoff claims, and request bodies never grant paid comparison. A verified issuer adapter produces a normalized, sequence-numbered event; absent configuration or a bad signature fails closed. `(issuer,event_id)` and `(issuer,idempotency_key)` prevent replay. Higher-sequence revoke/refund events supersede issue events; late lower-sequence events cannot reactivate access. Expiry is checked at read time.

Authorization binds subject, department, category, conversation, decision revision, decision fingerprint, and the exact evidence-set fingerprint. Runtime additionally intersects authorized exact IDs with the authoritative evidence set. Any extra ID rejects the entire entitlement rather than partially escalating it. Advisor remains read-only and cannot add products, alter context, or rerun the decision.

Migration `0014_comparison_entitlement_foundation.sql` is prepared only. Apply it through the normal reviewed staging-to-production migration process after backup/rollback validation; this work unit does not apply it.

## External prerequisites

- production secret-manager/KMS ownership, generated key material, access policy, rotation automation, and audit sink;
- payment provider selection and contract, webhook signing credentials, provider-specific adapter, purchase/refund reconciliation, and legal/tax approval;
- authoritative authenticated user/session binding if purchase portability beyond the current conversation session is required;
- reviewed exact multi-product evidence-set materialization before any paid multi-product comparison can be exposed.
