-- Stable import keys keep repeated catalogue syncs idempotent without deleting observation history.
alter table vehicle_facts add column ingestion_key text;
alter table vehicle_facts alter column conflict_group_id type text using conflict_group_id::text;

create unique index vehicle_facts_ingestion_key
  on vehicle_facts (ingestion_key)
  where ingestion_key is not null;

create table price_provenance (
  price_observation_id uuid not null references price_observations(id),
  source_document_id uuid not null references source_documents(id),
  primary key (price_observation_id, source_document_id)
);

insert into price_provenance (price_observation_id, source_document_id)
select id, source_document_id from price_observations
on conflict do nothing;
