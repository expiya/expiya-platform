create table if not exists paid_comparison_events (
  id uuid primary key,
  event_name text not null check (event_name in (
    'OFFER_VIEWED','OFFER_CLICKED','OPTIONS_VIEWED','QUOTE_CREATED','CHECKOUT_STARTED',
    'PAYMENT_VERIFIED','REPORT_QUEUED','REPORT_READY','REPORT_FAILED','SALES_ACTION_STARTED'
  )),
  conversation_id text,
  decision_id text,
  exact_variant_id text,
  quote_id uuid references comparison_report_quotes(id),
  order_id uuid references paid_report_orders(id),
  occurred_at timestamptz not null default now()
);

create index if not exists paid_comparison_events_funnel_idx
  on paid_comparison_events (event_name, occurred_at desc);
