create table if not exists product_events (
  id uuid primary key,
  event_name text not null check (event_name in ('SELLER_RESEARCH_OPENED', 'SELLER_RESEARCH_SUBMITTED')),
  occurred_at timestamptz not null default now(),
  conversation_id uuid,
  decision_id text not null,
  car_id text not null,
  province text,
  district text,
  check (
    event_name <> 'SELLER_RESEARCH_SUBMITTED'
    or (province is not null and district is not null)
  )
);

create index if not exists product_events_name_occurred_at_idx
  on product_events (event_name, occurred_at desc);
