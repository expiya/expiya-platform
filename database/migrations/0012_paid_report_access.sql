alter table paid_report_orders
  add column if not exists access_token_hash text;

create unique index if not exists paid_report_orders_access_token_hash_unique
  on paid_report_orders (access_token_hash)
  where access_token_hash is not null;
