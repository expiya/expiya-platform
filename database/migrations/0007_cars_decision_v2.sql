create table if not exists cars_decision_v2_conversations (
  conversation_id text primary key,
  revision integer not null default 0 check (revision >= 0),
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  memory jsonb not null,
  memory_fingerprint text not null,
  decision_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cars_decision_v2_messages (
  conversation_id text not null references cars_decision_v2_conversations(conversation_id) on delete cascade,
  message_id text not null,
  idempotency_key text not null,
  payload_hash text not null,
  committed_revision integer not null check (committed_revision > 0),
  public_output jsonb not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id),
  unique (conversation_id, idempotency_key)
);
create table if not exists cars_decision_v2_events (
  conversation_id text not null references cars_decision_v2_conversations(conversation_id) on delete cascade,
  event_id text not null,
  source_turn integer not null check (source_turn >= 0),
  sequence integer not null check (sequence >= 0),
  event_type text not null,
  schema_version integer not null check (schema_version = 1),
  canonical_payload jsonb not null,
  created_at timestamptz not null,
  primary key (conversation_id, event_id),
  unique (conversation_id, source_turn, sequence)
);
create table if not exists cars_decision_v2_offers (
  offer_id text primary key,
  conversation_id text not null references cars_decision_v2_conversations(conversation_id) on delete cascade,
  lifecycle text not null check (lifecycle in ('CREATED','CONSENTED','REVEALED','EXPIRED','REVOKED')),
  mode text not null check (mode in ('FAMILY_DIVERSE','SINGLE_REQUESTED','TRIM_COMPARISON','APPROXIMATE_BUDGET','PRICE_UNRESOLVED_ALTERNATIVES')),
  candidate_refs jsonb not null,
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  decision_fingerprint text not null,
  nonce text not null,
  expires_at timestamptz not null,
  authorization_version text not null,
  created_at timestamptz not null,
  consented_at timestamptz,
  revealed_at timestamptz
);
create index if not exists cars_decision_v2_events_replay_idx on cars_decision_v2_events (conversation_id, source_turn, sequence);
create index if not exists cars_decision_v2_offers_conversation_idx on cars_decision_v2_offers (conversation_id, lifecycle);
create index if not exists cars_decision_v2_offers_expiry_idx on cars_decision_v2_offers (expires_at) where lifecycle in ('CREATED','CONSENTED');
