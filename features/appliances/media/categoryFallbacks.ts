import type { AppliancesCategoryId } from "../categoryRegistry";

export interface AppliancesCategoryFallback {
  readonly kind: "CATEGORY_SYMBOL_FALLBACK";
  readonly symbol: string;
  readonly alt: string;
  readonly disclosure: "Temsilî kategori simgesi · Ürün veya model görseli değildir.";
}

const symbols: Readonly<Record<AppliancesCategoryId, string>> = Object.freeze({
  WASHING_MACHINE: "◉",
  REFRIGERATOR: "▥",
  DISHWASHER: "⋮",
  DRYER: "◎",
  VACUUM: "⌁",
  ROBOT_VACUUM: "◌",
  FREEZER: "❄",
  BUILT_IN_OVEN: "▣",
  FREESTANDING_COOKER: "♨",
  HOB: "⊙",
  RANGE_HOOD: "⌃",
  COUNTERTOP_MICROWAVE_OVEN: "▤",
  BUILT_IN_MICROWAVE_OVEN: "▦",
  AIR_PURIFIER: "≈",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: "☕",
  MANUAL_ESPRESSO_MACHINE: "♨",
  FILTER_COFFEE_MACHINE: "▽",
  TURKISH_COFFEE_MACHINE: "◡",
  AIR_FRYER: "◫",
  BLENDER: "♢",
  FOOD_PROCESSOR: "✣",
  ELECTRIC_STORAGE_WATER_HEATER: "◒",
  INSTANTANEOUS_ELECTRIC_WATER_HEATER: "≋",
  SPLIT_AIR_CONDITIONER: "❄",
});

export function appliancesCategoryFallback(categoryId: AppliancesCategoryId, publicLabelTr: string): AppliancesCategoryFallback {
  return Object.freeze({
    kind: "CATEGORY_SYMBOL_FALLBACK",
    symbol: symbols[categoryId],
    alt: `${publicLabelTr} kategorisi için temsilî simge`,
    disclosure: "Temsilî kategori simgesi · Ürün veya model görseli değildir.",
  });
}
