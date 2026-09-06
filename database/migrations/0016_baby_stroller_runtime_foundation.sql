begin;
create table if not exists baby_stroller_conversations (
  conversation_id uuid primary key,
  department_id text not null check (department_id = 'BABY_AND_CHILD'),
  category_id text not null check (category_id = 'STROLLER'),
  revision bigint not null default 0 check (revision >= 0),
  pinned_catalog_release text not null,
  pinned_catalog_digest text not null,
  pinned_policy_digest text not null,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists baby_stroller_messages (
  conversation_id uuid not null references baby_stroller_conversations(conversation_id) on delete cascade,
  message_id text not null,
  payload_hash text not null,
  committed_revision bigint not null check (committed_revision >= 0),
  outcome_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, message_id)
);
commit;
