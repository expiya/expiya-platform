-- Additive schema recognition only. This migration creates no authority, catalog member, or runtime activation.
alter table appliances_conversations drop constraint if exists appliances_conversations_product_type_check;
alter table appliances_conversations add constraint appliances_conversations_product_type_check check (product_type in (
  'WASHING_MACHINE', 'DRYER', 'REFRIGERATOR', 'DISHWASHER', 'VACUUM', 'ROBOT_VACUUM',
  'FREEZER', 'BUILT_IN_OVEN', 'FREESTANDING_COOKER', 'HOB', 'RANGE_HOOD',
  'COUNTERTOP_MICROWAVE_OVEN', 'BUILT_IN_MICROWAVE_OVEN', 'SPLIT_AIR_CONDITIONER', 'AIR_PURIFIER',
  'FULLY_AUTOMATIC_ESPRESSO_MACHINE', 'MANUAL_ESPRESSO_MACHINE', 'FILTER_COFFEE_MACHINE', 'TURKISH_COFFEE_MACHINE',
  'AIR_FRYER', 'BLENDER', 'FOOD_PROCESSOR', 'ELECTRIC_STORAGE_WATER_HEATER', 'INSTANTANEOUS_ELECTRIC_WATER_HEATER'
));
