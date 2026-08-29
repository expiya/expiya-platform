alter table paid_report_orders
  add column if not exists provider_token text,
  add column if not exists provider_payment_id text,
  add column if not exists checkout_expires_at timestamptz;

create unique index if not exists paid_report_orders_provider_payment_id_idx
  on paid_report_orders (provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists paid_report_orders_provider_token_idx
  on paid_report_orders (provider, provider_token)
  where provider_token is not null;

create table if not exists comparison_report_jobs (
  id uuid primary key,
  order_id uuid not null unique references paid_report_orders(id),
  quote_id uuid not null unique references comparison_report_quotes(id),
  status text not null check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','REFUND_REQUIRED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  failure_code text
);

create index if not exists comparison_report_jobs_status_idx
  on comparison_report_jobs (status, created_at);
