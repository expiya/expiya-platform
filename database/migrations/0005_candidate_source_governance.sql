alter table catalog_candidate_batches
  add column source_url text,
  add column extraction_method text not null default 'USER_SUBMISSION'
    check (extraction_method in ('USER_SUBMISSION','PUBLIC_PAGE','SITEMAP','API','LICENSED_FEED')),
  add column permission_status text not null default 'USER_ATTESTED'
    check (permission_status in ('USER_ATTESTED','RESEARCH_ONLY','ALLOWED','CONTRACT_REQUIRED','PROHIBITED')),
  add column robots_url text,
  add column terms_url text,
  add column permission_reviewed_at timestamptz,
  add column license_notes text;

create index catalog_candidate_batches_source
  on catalog_candidate_batches(source_url, captured_at desc);
