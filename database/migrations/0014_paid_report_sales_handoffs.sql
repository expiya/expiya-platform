create table if not exists paid_report_sales_handoffs (
  token_hash text primary key,
  order_id uuid not null references paid_report_orders(id),
  quote_id uuid not null references comparison_report_quotes(id),
  exact_variant_id text not null,
  intent text not null check (intent in ('REQUEST_QUOTE','REQUEST_TEST_DRIVE','REQUEST_DEALER_CONTACT')),
  conversation_id text not null,
  decision_fingerprint text not null,
  offer_id text not null,
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  approved_needs jsonb not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null
);

create index if not exists paid_report_sales_handoffs_expiry_idx on paid_report_sales_handoffs (expires_at);
