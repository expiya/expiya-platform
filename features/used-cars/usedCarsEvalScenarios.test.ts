import {describe,expect,it} from "vitest";
import {requiredEvalScenarios,validateEvalSuite} from "./model-governance/evalScenarios";
describe("used-cars model eval scenarios",()=>{
 it("covers matching, evidence, handoff and offer boundaries",()=>expect(validateEvalSuite(requiredEvalScenarios)).toEqual([]));
 it("uses synthetic fixtures only",()=>expect(requiredEvalScenarios.every(scenario=>scenario.syntheticOnly)).toBe(true));
 it("requires human review for every critical scenario",()=>expect(requiredEvalScenarios.filter(scenario=>scenario.risk==="CRITICAL").every(scenario=>scenario.humanReviewRequired)).toBe(true));
});
