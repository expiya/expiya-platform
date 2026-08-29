create table if not exists comparison_report_quotes (
  id uuid primary key,
  product_code text not null check (product_code = 'CARS_COMPARISON_3'),
  conversation_id text not null,
  decision_id text not null,
  catalog_release_version text not null,
  catalog_fingerprint text not null,
  amount_kurus integer not null check (amount_kurus = 34900),
  currency text not null check (currency = 'TRY'),
  tax_included boolean not null check (tax_included),
  status text not null check (status in ('READY_FOR_CHECKOUT','CHECKOUT_STARTED','EXPIRED','CONSUMED')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists comparison_report_quote_vehicles (
  quote_id uuid not null references comparison_report_quotes(id) on delete cascade,
  exact_variant_id text not null,
  role text not null check (role in ('DECISION_CARD','ALTERNATIVE_1','ALTERNATIVE_2')),
  primary key (quote_id, role),
  unique (quote_id, exact_variant_id)
);

create table if not exists paid_report_orders (
  id uuid primary key,
  quote_id uuid not null unique references comparison_report_quotes(id),
  provider text not null check (provider = 'IYZICO'),
  provider_conversation_id text not null unique,
  status text not null check (status in ('CREATED','CHECKOUT_INITIALIZED','PAID','PAYMENT_FAILED','REFUND_PENDING','REFUNDED')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_webhook_events (
  provider text not null check (provider = 'IYZICO'),
  provider_event_key text not null,
  order_id uuid not null references paid_report_orders(id),
  signature_version text not null check (signature_version = 'V3'),
  status text not null check (status in ('ACCEPTED','REJECTED')),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  primary key (provider, provider_event_key)
);

create index if not exists paid_report_orders_status_idx on paid_report_orders (status, created_at desc);
