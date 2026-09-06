import {describe,expect,it} from "vitest";
import {canonicalUsedCarsUrl,futureUsedCarsRedirectRules,validateUsedCarsRedirectRules} from "./routing/migration";
describe("used-cars route migration",()=>{
 it("preserves root and every nested path",()=>{expect(validateUsedCarsRedirectRules(futureUsedCarsRedirectRules)).toEqual([]);expect(canonicalUsedCarsUrl("/ikinciel/arac/a1")).toBe("https://www.expiya.com/cars/ikinciel/arac/a1");});
 it("keeps redirect disabled before migration approval",()=>expect(futureUsedCarsRedirectRules.every(rule=>!rule.enabled)).toBe(true));
 it("rejects unrelated canonical paths",()=>expect(()=>canonicalUsedCarsUrl("/cars")).toThrow("OUTSIDE_USED_CARS_ROUTE"));
});
