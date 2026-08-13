-- Preserve deployed migration history: add identity lineage and idempotent documents separately.
alter table source_documents
  add constraint source_documents_identity_key
  unique (source_id, source_url, accessed_at, document_version);

create table variant_provenance (
  vehicle_variant_id uuid not null references vehicle_variants(id),
  source_document_id uuid not null references source_documents(id),
  primary key (vehicle_variant_id, source_document_id)
);
