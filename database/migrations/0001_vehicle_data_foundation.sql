-- PostgreSQL foundation. Values are append-only observations; corrections create new rows.
create extension if not exists pgcrypto;

create table data_sources (
  id text primary key,
  name text not null,
  authority text not null check (authority in ('PRIMARY','OFFICIAL','LICENSED','COMMUNITY')),
  homepage_url text not null,
  terms_url text,
  robots_url text,
  usage_permission text not null check (usage_permission in ('OPEN_LICENSE','PUBLIC_FACTS_ONLY','CONTRACT_REQUIRED','PERMISSION_REQUIRED','INTERNAL_ONLY','PROHIBITED')),
  license text,
  reviewed_at timestamptz not null,
  review_notes jsonb not null default '[]'
);

create table source_documents (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references data_sources(id),
  source_url text not null,
  accessed_at timestamptz not null,
  published_at timestamptz,
  document_version text,
  content_sha256 text,
  extraction_method text not null check (extraction_method in ('MANUAL','API','LICENSED_FEED','DOCUMENT_IMPORT','USER_SUBMISSION')),
  raw_object_uri text,
  parser_version text,
  limitations jsonb not null default '[]'
);

create table vehicle_variants (
  id uuid primary key default gen_random_uuid(),
  market text not null check (market = 'TR'),
  brand text not null,
  model text not null,
  generation text,
  body_style text not null,
  trim text not null,
  model_year integer not null,
  lifecycle_status text not null check (lifecycle_status in ('ANNOUNCED','ON_SALE','ORDER_CLOSED','DISCONTINUED')),
  on_sale_from date,
  on_sale_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market, brand, model, generation, trim, model_year)
);

create table vehicle_facts (
  id uuid primary key default gen_random_uuid(),
  vehicle_variant_id uuid not null references vehicle_variants(id),
  fact_key text not null,
  value jsonb not null,
  unit text,
  confidence text not null check (confidence in ('LOW','MEDIUM','HIGH')),
  valid_from timestamptz not null,
  valid_until timestamptz,
  conflict_group_id uuid,
  supersedes_id uuid references vehicle_facts(id),
  created_at timestamptz not null default now()
);

create table fact_provenance (
  fact_id uuid not null references vehicle_facts(id),
  source_document_id uuid not null references source_documents(id),
  primary key (fact_id, source_document_id)
);

create table price_observations (
  id uuid primary key default gen_random_uuid(),
  vehicle_variant_id uuid not null references vehicle_variants(id),
  source_document_id uuid not null references source_documents(id),
  condition text not null check (condition in ('NEW','USED')),
  amount_try numeric(14,2) not null check (amount_try >= 0),
  price_type text not null check (price_type in ('LIST','CAMPAIGN','ASKING','TRANSACTION','VALUATION')),
  valid_from timestamptz not null,
  valid_until timestamptz,
  mileage_km integer,
  seller_type text,
  confidence text not null check (confidence in ('LOW','MEDIUM','HIGH')),
  check ((condition = 'NEW' and mileage_km is null) or condition = 'USED')
);

create table experience_signals (
  id uuid primary key default gen_random_uuid(),
  vehicle_variant_id uuid references vehicle_variants(id),
  model_scope_id text not null,
  source_document_id uuid not null references source_documents(id),
  market text not null,
  sentiment text not null check (sentiment in ('POSITIVE','NEGATIVE','UNCERTAIN')),
  theme_code text not null,
  summary text not null,
  ownership_verified boolean not null default false,
  sample_size integer not null check (sample_size > 0),
  exposure_denominator integer,
  observed_at timestamptz not null,
  confidence text not null check (confidence in ('LOW','MEDIUM','HIGH')),
  moderation_status text not null check (moderation_status in ('PENDING','APPROVED','REJECTED')),
  contains_personal_data boolean not null default false
);

create index vehicle_facts_lookup on vehicle_facts(vehicle_variant_id, fact_key, valid_from desc);
create index prices_lookup on price_observations(vehicle_variant_id, condition, valid_from desc);
create index experience_lookup on experience_signals(model_scope_id, theme_code, observed_at desc);
