create table if not exists appliances_conversations (
  conversation_id text primary key,
  schema_version text not null check (schema_version = 'appliances-conversation/v1'),
  revision integer not null check (revision >= 1),
  department_id text not null check (department_id = 'APPLIANCES'),
  product_type text not null check (product_type = 'WASHING_MACHINE'),
  pinned_catalog_release text not null,
  pinned_catalog_digest text not null check (pinned_catalog_digest ~ '^[a-f0-9]{64}$'),
  pinned_semantic_version text not null,
  pinned_semantic_digest text not null check (pinned_semantic_digest ~ '^[a-f0-9]{64}$'),
  state jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create table if not exists appliances_conversation_messages (
  conversation_id text not null references appliances_conversations(conversation_id) on delete cascade,
  message_id text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  committed_revision integer not null check (committed_revision >= 1),
  stored_outcome jsonb not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id)
);
create table if not exists appliances_conversation_events (
  conversation_id text not null references appliances_conversations(conversation_id) on delete cascade,
  event_id text not null,
  concept_id text not null,
  canonical_event jsonb not null,
  created_revision integer not null check (created_revision >= 1),
  created_at timestamptz not null,
  primary key (conversation_id, event_id)
);
create index if not exists appliances_conversation_events_replay_idx on appliances_conversation_events (conversation_id, created_revision, created_at);

