-- Discovery records are deliberately isolated from publishable vehicle variants.
create table catalog_candidate_batches (
  id uuid primary key,
  source_platform text not null check (source_platform in ('SAHIBINDEN','ARABAM','OTHER')),
  supplied_by text not null,
  captured_at date not null,
  imported_at timestamptz not null default now(),
  original_filename text not null,
  content_sha256 text not null,
  usage_attestation text not null,
  source_category_url text,
  status text not null default 'IMPORTED' check (status in ('IMPORTED','REVIEWED','REJECTED')),
  unique (content_sha256)
);

create table catalog_candidates (
  id uuid primary key,
  batch_id uuid not null references catalog_candidate_batches(id),
  source_row_number integer not null check (source_row_number >= 2),
  brand_raw text not null,
  model_raw text not null,
  generation_raw text,
  body_style_raw text,
  year_from integer check (year_from between 1900 and 2100),
  year_until integer check (year_until between 1900 and 2100),
  fuel_raw text,
  transmission_raw text,
  engine_raw text,
  trim_raw text,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  notes text,
  normalized_brand text not null,
  normalized_model text not null,
  candidate_fingerprint text not null,
  review_status text not null default 'PENDING' check (review_status in ('PENDING','MATCHED','REJECTED','NEEDS_REVIEW')),
  created_at timestamptz not null default now(),
  unique (batch_id, source_row_number)
);

create table vehicle_aliases (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references catalog_candidates(id),
  vehicle_variant_id uuid references vehicle_variants(id),
  alias_text text not null,
  match_method text check (match_method in ('EXACT','RULE','MANUAL','MODEL')),
  match_confidence text check (match_confidence in ('LOW','MEDIUM','HIGH')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  check ((vehicle_variant_id is null and match_method is null and match_confidence is null)
    or (vehicle_variant_id is not null and match_method is not null and match_confidence is not null))
);

create index catalog_candidates_fingerprint on catalog_candidates(candidate_fingerprint);
create index catalog_candidates_review_queue on catalog_candidates(review_status, normalized_brand, normalized_model);
create index vehicle_aliases_variant on vehicle_aliases(vehicle_variant_id) where vehicle_variant_id is not null;
