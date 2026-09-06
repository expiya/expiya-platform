create table if not exists comparison_entitlements (
 entitlement_id text primary key, subject_type text not null check(subject_type in ('USER','SESSION')), subject_id text not null,
 purchase_reference_id text not null, department_id text not null check(department_id in ('APPLIANCES','CARS')), category text not null,
 conversation_id text not null, decision_revision integer not null check(decision_revision>0), decision_fingerprint text not null,
 evidence_set_fingerprint text not null check(evidence_set_fingerprint ~ '^[a-f0-9]{64}$'), state text not null check(state in ('ACTIVE','REVOKED','REFUNDED','EXPIRED')),
 issued_at timestamptz not null, expires_at timestamptz not null check(expires_at>issued_at), revoked_at timestamptz,
 issuer text not null, provider text not null, issuer_event_sequence bigint not null check(issuer_event_sequence>=0), idempotency_key text not null, record jsonb not null,
 unique(issuer,idempotency_key)
);
create index if not exists comparison_entitlements_authority_idx on comparison_entitlements(subject_type,subject_id,department_id,category,conversation_id,decision_revision,decision_fingerprint,state,expires_at);
create table if not exists comparison_entitlement_events (
 issuer text not null, issuer_event_id text not null, entitlement_id text not null references comparison_entitlements(entitlement_id), event_type text not null,
 event_sequence bigint not null, occurred_at timestamptz not null, metadata jsonb not null default '{}'::jsonb, primary key(issuer,issuer_event_id)
);
create index if not exists comparison_entitlement_events_audit_idx on comparison_entitlement_events(entitlement_id,event_sequence,occurred_at);
