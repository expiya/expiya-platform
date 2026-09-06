alter table appliances_conversations drop constraint if exists appliances_conversations_product_type_check;
alter table appliances_conversations add constraint appliances_conversations_product_type_check check (product_type in ('WASHING_MACHINE', 'DRYER', 'REFRIGERATOR', 'DISHWASHER', 'VACUUM', 'ROBOT_VACUUM'));
