create table if not exists paid_report_legal_acceptances (
  order_id uuid primary key references paid_report_orders(id) on delete cascade,
  quote_id uuid not null references comparison_report_quotes(id),
  pre_information_version text not null,
  pre_information_checksum text not null check (pre_information_checksum ~ '^[a-f0-9]{64}$'),
  distance_contract_version text not null,
  distance_contract_checksum text not null check (distance_contract_checksum ~ '^[a-f0-9]{64}$'),
  immediate_performance_version text not null,
  immediate_performance_checksum text not null check (immediate_performance_checksum ~ '^[a-f0-9]{64}$'),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{24}$'),
  accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);
