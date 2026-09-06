# Electronics Runtime Migration Runbook

`0015_electronics_runtime_foundation.sql` is prepared but is not applied by `WU-ELECTRONICS-XPY-DECISION-RUNTIME-01`.

For the presentation/production unit, first verify the active policy, runtime catalog, activation event, database backup, and migration ledger. Apply the migration once inside its existing transaction. Confirm the three Electronics tables, category constraint, message-id primary key, and replay indexes before enabling traffic.

Rollback-forward is the safe recovery path: disable Electronics routing, preserve all append-only rows, correct the additive schema with a new numbered migration, revalidate active authority, and then restore traffic. Do not drop conversation, event, or message tables to roll back an application release.
