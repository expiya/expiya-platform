create table if not exists cars_pilot_conversation_archives (
  conversation_id text primary key,
  pilot_username text not null,
  transcript jsonb not null,
  conversation_snapshot jsonb,
  user_turn_count integer not null check (user_turn_count > 0),
  assistant_turn_count integer not null check (assistant_turn_count >= 0),
  archive_checksum text not null check (archive_checksum ~ '^sha256:[a-f0-9]{64}$'),
  completion_reason text not null check (completion_reason = 'USER_CLICKED_DELETE'),
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists cars_pilot_conversation_archives_user_idx on cars_pilot_conversation_archives (pilot_username, completed_at desc);
