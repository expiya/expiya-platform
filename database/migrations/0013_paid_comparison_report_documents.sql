alter table comparison_report_quotes
  add column if not exists approved_needs jsonb not null default '[]'::jsonb;

create table if not exists comparison_report_documents (
  id uuid primary key,
  order_id uuid not null unique references paid_report_orders(id),
  quote_id uuid not null unique references comparison_report_quotes(id),
  schema_version text not null check (schema_version = 'paid-comparison-report/v1'),
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  document jsonb not null,
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);
