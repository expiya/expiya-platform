import { describe, expect, it } from "vitest";
import { DEMO_PREFERENCE_SECTIONS, USED_CAR_PREFERENCE_FIELD_IDS } from "./preferenceFields";
describe("complete B2C used-car preference coverage",()=>{ it("covers every required input exactly once",()=>{ const flattened=DEMO_PREFERENCE_SECTIONS.flatMap(x=>x.fields); expect(flattened).toHaveLength(24); expect(new Set(flattened).size).toBe(24); expect(new Set(flattened)).toEqual(new Set(USED_CAR_PREFERENCE_FIELD_IDS)); }); });
