/* eslint-disable @typescript-eslint/no-require-imports -- Promptfoo loads this CommonJS fixture directly. */
const source = require("./results/simulated-225.json");

module.exports = source.results.results
  .slice()
  .sort((left, right) => left.testIdx - right.testIdx)
  .map((result) => ({
    description: `Yeniden puanlama: ${result.vars.caseId}`,
    vars: {
      caseId: result.vars.caseId,
      personaId: result.vars.personaId,
      transcript: result.response.output,
    },
    assert: [{
      type: "llm-rubric",
      value: result.testCase.assert[0].value,
      provider: {
        id: "openai:responses:gpt-5.5",
        config: { reasoning_effort: "none", max_output_tokens: 240 },
      },
    }],
  }));
