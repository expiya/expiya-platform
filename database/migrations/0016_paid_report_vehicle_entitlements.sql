create table if not exists paid_report_vehicle_entitlements (
  order_id uuid not null references paid_report_orders(id) on delete cascade,
  quote_id uuid not null references comparison_report_quotes(id) on delete cascade,
  conversation_id text not null,
  exact_variant_id text not null,
  source_role text not null check (source_role in ('DECISION_CARD','ALTERNATIVE_1','ALTERNATIVE_2')),
  catalog_release_version text not null,
  granted_at timestamptz not null,
  revoked_at timestamptz,
  primary key (order_id, exact_variant_id)
);

create index if not exists paid_report_vehicle_entitlements_conversation_idx
  on paid_report_vehicle_entitlements (conversation_id, granted_at desc)
  where revoked_at is null;

create table if not exists paid_report_recomparison_handoffs (
  token_hash text primary key,
  order_id uuid not null references paid_report_orders(id) on delete cascade,
  conversation_id text not null,
  exact_variant_id text not null,
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  approved_needs jsonb not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists paid_report_recomparison_handoffs_expiry_idx
  on paid_report_recomparison_handoffs (expires_at)
  where revoked_at is null;

alter table paid_report_orders
  add column if not exists delivery_email_encrypted text,
  add column if not exists delivery_email_masked text;

create table if not exists paid_report_email_outbox (
  order_id uuid primary key references paid_report_orders(id) on delete cascade,
  report_id uuid not null references comparison_report_documents(id) on delete cascade,
  status text not null check (status in ('PENDING','SENDING','SENT','FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  created_at timestamptz not null,
  started_at timestamptz,
  sent_at timestamptz,
  failure_code text
);

create index if not exists paid_report_email_outbox_pending_idx
  on paid_report_email_outbox (status, created_at)
  where status in ('PENDING','FAILED');
