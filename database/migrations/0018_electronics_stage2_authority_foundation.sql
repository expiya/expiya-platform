begin;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'comparison_entitlements'::regclass
      and conname = 'comparison_entitlements_department_id_check'
      and pg_get_constraintdef(oid) not like '%ELECTRONICS%'
  ) then
    alter table comparison_entitlements
      drop constraint comparison_entitlements_department_id_check;
    alter table comparison_entitlements
      add constraint comparison_entitlements_department_id_check
      check (department_id in ('APPLIANCES','CARS','ELECTRONICS')) not valid;
    alter table comparison_entitlements
      validate constraint comparison_entitlements_department_id_check;
  end if;
end $$;

create table if not exists electronics_stage2_consent_events (
  event_id uuid primary key,
  conversation_id text not null references electronics_conversations(conversation_id) on delete cascade,
  event_sequence bigint not null check (event_sequence >= 1),
  event_type text not null check (event_type in ('CONSENTED','REVOKED')),
  category_id text not null,
  decision_revision integer not null check (decision_revision >= 1),
  decision_fingerprint text not null check (decision_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  exact_product_id text not null,
  configuration_identity text not null,
  authority_fingerprint text not null check (authority_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  occurred_at timestamptz not null,
  canonical_event jsonb not null,
  unique (conversation_id, event_sequence),
  unique (conversation_id, idempotency_key)
);

create index if not exists electronics_stage2_consent_authority_idx
  on electronics_stage2_consent_events
  (conversation_id, category_id, decision_revision, decision_fingerprint, exact_product_id, occurred_at desc);

create table if not exists electronics_stage2_handoff_issuances (
  handoff_id uuid primary key,
  consent_event_id uuid not null references electronics_stage2_consent_events(event_id),
  conversation_id text not null references electronics_conversations(conversation_id) on delete cascade,
  category_id text not null,
  decision_revision integer not null check (decision_revision >= 1),
  authority_fingerprint text not null check (authority_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  key_id text not null,
  key_version text not null,
  token_fingerprint text not null unique check (token_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  nonce_fingerprint text not null unique check (nonce_fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  replay_policy text not null check (replay_policy = 'REVISION_BOUND_REUSABLE_UNTIL_EXPIRY'),
  issued_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > issued_at),
  idempotency_key text not null unique,
  canonical_issuance jsonb not null
);

create index if not exists electronics_stage2_handoff_authority_idx
  on electronics_stage2_handoff_issuances
  (conversation_id, category_id, decision_revision, authority_fingerprint, expires_at);

create table if not exists electronics_stage2_handoff_events (
  event_id uuid primary key,
  handoff_id uuid not null references electronics_stage2_handoff_issuances(handoff_id),
  event_sequence bigint not null check (event_sequence >= 1),
  event_type text not null check (event_type in ('VERIFIED','REPLAY_OBSERVED','REVOKED','EXPIRED','REJECTED')),
  reason text,
  idempotency_key text not null unique,
  occurred_at timestamptz not null,
  canonical_event jsonb not null,
  unique (handoff_id, event_sequence)
);

create index if not exists electronics_stage2_handoff_events_audit_idx
  on electronics_stage2_handoff_events (handoff_id, event_sequence, occurred_at);

commit;
