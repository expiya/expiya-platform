begin;
create table if not exists electronics_conversations (
  conversation_id text primary key,
  schema_version text not null check (schema_version = 'electronics-conversation/v1'),
  revision integer not null check (revision >= 1),
  department_id text not null check (department_id = 'ELECTRONICS'),
  category_id text not null check (category_id in ('SMARTPHONE','LAPTOP','TABLET','MONITOR','TELEVISION','E_READER','HEADPHONES','PORTABLE_SPEAKER','SOUNDBAR','DIGITAL_CAMERA','PROJECTOR','GAME_CONSOLE','WIFI_ROUTER_MESH','NETWORK_ATTACHED_STORAGE','EXTERNAL_STORAGE','PRINTER','WEBCAM','COMPUTER_AUDIO','SMARTWATCH','FITNESS_TRACKER','HOME_SECURITY_CAMERA','VIDEO_DOORBELL','SMART_HOME_HUB','UNINTERRUPTIBLE_POWER_SUPPLY')),
  pinned_catalog_release text not null, pinned_catalog_digest text not null check (pinned_catalog_digest ~ '^sha256:[a-f0-9]{64}$'), pinned_policy_version text not null, pinned_policy_digest text not null check (pinned_policy_digest ~ '^sha256:[a-f0-9]{64}$'), state jsonb not null, created_at timestamptz not null, updated_at timestamptz not null
);
create table if not exists electronics_conversation_messages (conversation_id text not null references electronics_conversations(conversation_id) on delete cascade, message_id text not null, payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'), committed_revision integer not null check (committed_revision >= 1), stored_outcome jsonb not null, created_at timestamptz not null default now(), primary key (conversation_id,message_id));
create table if not exists electronics_conversation_events (conversation_id text not null references electronics_conversations(conversation_id) on delete cascade, event_id text not null, concept_id text not null, canonical_event jsonb not null, created_revision integer not null check (created_revision >= 1), created_at timestamptz not null, primary key (conversation_id,event_id));
create index if not exists electronics_conversation_events_replay_idx on electronics_conversation_events (conversation_id,created_revision,created_at);
create index if not exists electronics_conversations_category_revision_idx on electronics_conversations (category_id,revision);
commit;
