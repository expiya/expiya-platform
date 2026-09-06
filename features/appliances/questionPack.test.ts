import { describe, expect, it } from "vitest";
import { APPLIANCES_PRODUCT_TYPES, type AppliancesRuntimeOutcome } from "./contracts";
import { appliancesChoices, presentAppliancesOutcome, validateAppliancesChoice } from "./questionPack";

const representative = {
  WASHING_MACHINE: "appliances.wm.remoteControl.requirement", DRYER: "appliances.dryer.capacity", REFRIGERATOR: "appliances.refrigerator.freezerArrangement",
  DISHWASHER: "appliances.dishwasher.material", VACUUM: "appliances.vacuum.material", ROBOT_VACUUM: "appliances.robot.material",
  FREEZER:"appliances.freezer.material", BUILT_IN_OVEN:"appliances.oven.material", FREESTANDING_COOKER:"appliances.cooker.material", HOB:"appliances.hob.material", RANGE_HOOD:"appliances.hood.material",
  COUNTERTOP_MICROWAVE_OVEN:"appliances.countertop-microwave.material", BUILT_IN_MICROWAVE_OVEN:"appliances.built-in-microwave.material", AIR_PURIFIER:"appliances.air-purifier.material",
  FULLY_AUTOMATIC_ESPRESSO_MACHINE:"appliances.fully-automatic-espresso.material", MANUAL_ESPRESSO_MACHINE:"appliances.manual-espresso.material", FILTER_COFFEE_MACHINE:"appliances.filter-coffee.material", TURKISH_COFFEE_MACHINE:"appliances.turkish-coffee.material",
  AIR_FRYER:"appliances.air-fryer.material", BLENDER:"appliances.blender.material", FOOD_PROCESSOR:"appliances.food-processor.material", ELECTRIC_STORAGE_WATER_HEATER:"appliances.storage-water-heater.site-verification", INSTANTANEOUS_ELECTRIC_WATER_HEATER:"appliances.instant-water-heater.site-verification",
  SPLIT_AIR_CONDITIONER:"appliances.split-ac.site-verification",
} as const;

describe("Appliances XPY question pack", () => {
  it.each(APPLIANCES_PRODUCT_TYPES)("supplies typed choices and an escape for %s", type => {
    const choices = appliancesChoices(representative[type]);
    expect(choices).toMatchObject({ questionKey: representative[type], source: "DOMAIN_PACK", selectionMode: "SINGLE" });
    expect(choices!.options.length).toBeGreaterThan(0);
    expect(choices!.options.some(option => /bilmiyorum|önemli değil|fark etmez|sınırım yok|alt sınırım yok/iu.test(`${option.value} ${option.label}`))).toBe(true);
  });

  it("rejects cross-domain and stale choice values fail-closed", () => {
    expect(validateAppliancesChoice("REFRIGERATOR", "appliances.refrigerator.freezerArrangement", { questionKey: "appliances.refrigerator.freezerArrangement", values: ["Dondurucu altta olsun"] })).toBe(true);
    expect(validateAppliancesChoice("REFRIGERATOR", "appliances.refrigerator.freezerArrangement", { questionKey: "appliances.vacuum.material", values: ["HEPA filtre zorunlu"] })).toBe(false);
    expect(validateAppliancesChoice("REFRIGERATOR", "appliances.refrigerator.installationEnvelope", { questionKey: "appliances.refrigerator.freezerArrangement", values: ["Dondurucu altta olsun"] })).toBe(false);
  });

  it("replaces ontology-leaking fallback copy with one vetted concrete question", () => {
    const outcome: AppliancesRuntimeOutcome = { kind: "ASK", questionKey: "appliances.vacuum.material", message: "İhtiyacını kategoriye ait ölçü veya zorunlu işlevlerle biraz açar mısın?" };
    const presented = presentAppliancesOutcome("VACUUM", outcome);
    expect(presented).toMatchObject({ kind: "ASK", choices: { questionKey: "appliances.vacuum.material" } });
    expect("message" in presented && presented.message).toBe("Evcil hayvan başlığı mı, HEPA filtre mi vazgeçilmez?");
  });

  it("acknowledges accepted context before the next bounded question without making it authority", () => {
    const presented = presentAppliancesOutcome("VACUUM", { kind: "ASK", questionKey: "appliances.vacuum.radius", message: "En az çalışma yarıçapı kaç metre?" }, [{ eventId: "e", conceptId: "PET_HEAD", normalizedValue: true, sourceMessageId: "m", authority: "USER_EXPLICIT", strength: "HARD", status: "ACCEPTED_EXPLICIT", decisionUse: "HARD_FILTER", confirmationRequired: false, createdRevision: 1, createdAt: "2026-09-04T00:00:00.000Z" }]);
    expect("message" in presented && presented.message).toMatch(/^Evcil hayvan tüyü ihtiyacını koruyorum\./u);
  });
});
