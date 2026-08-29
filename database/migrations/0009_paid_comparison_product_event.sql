alter table product_events
  drop constraint if exists product_events_event_name_check;

alter table product_events
  add constraint product_events_event_name_check
  check (event_name in (
    'SELLER_RESEARCH_OPENED',
    'SELLER_RESEARCH_SUBMITTED',
    'paid_comparison_offer_clicked'
  ));
