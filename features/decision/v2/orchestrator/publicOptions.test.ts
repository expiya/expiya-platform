import { describe, expect, it } from "vitest";
import { publicOptions } from "./types";
describe("public material question labels", () => { it.each([["GASOLINE", "Benzin"], ["BODY_SEDAN", "Sedan"]])("does not expose internal semantic value %s", (semanticValue, userFacingLabel) => { const result = publicOptions({ materialQuestion: { options: [{ id: "stable-option", semanticValue, userFacingLabel }] } } as never); expect(result).toEqual([{ id: "stable-option", label: userFacingLabel }]); expect(result[0]?.label).not.toBe(semanticValue); }); });
