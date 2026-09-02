create table if not exists paid_report_invoices (
  order_id uuid primary key references paid_report_orders(id) on delete cascade,
  provider text not null check (provider = 'ISBASI'),
  status text not null check (status in ('PROCESSING','ISSUED','REVIEW_REQUIRED')),
  provider_invoice_id text unique,
  attempt_count integer not null default 1 check (attempt_count = 1),
  failure_code text,
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check ((status = 'ISSUED') = (provider_invoice_id is not null))
);

create index if not exists paid_report_invoices_status_idx
  on paid_report_invoices (status, updated_at);
