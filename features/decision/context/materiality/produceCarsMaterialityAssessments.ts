import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import { assessMateriality } from "@/features/decision/context/sufficiency/assessMateriality";
import type {
  CarsSufficiencyPolicy,
  MaterialityAssessment,
} from "@/types/contextSufficiency";

const materialityOutputSchema = z.object({
  determinations: z.array(z.object({
    requirementId: z.string().min(1),
    outcome: z.enum(["MATERIAL", "NOT_MATERIAL", "UNRESOLVED"]),
    limitations: z.array(z.string()),
  })),
});

export interface ProduceCarsMaterialityAssessmentsInput {
  readonly query: string;
  readonly policy: CarsSufficiencyPolicy;
}

export async function produceCarsMaterialityAssessments(
  input: ProduceCarsMaterialityAssessmentsInput,
): Promise<readonly MaterialityAssessment[] | undefined> {
  try {
    const requirements = input.policy.requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      target: requirement.target,
      mode: requirement.mode,
    }));
    const response = await getOpenAIClient().responses.parse({
      model: "gpt-5.5",
      store: false,
      max_output_tokens: 1_200,
      input: [
        {
          role: "system",
          content: [
            "Determine materiality for every supplied Cars sufficiency requirement using only the user's explicit request.",
            "Return exactly one determination for every supplied requirementId and no others.",
            "A REQUIRED requirement is MATERIAL.",
            "A CONDITIONAL requirement is MATERIAL only when the explicit request makes its target relevant.",
            "Use NOT_MATERIAL when the explicit request does not mention or otherwise make a conditional target relevant to the current decision.",
            "Use UNRESOLVED only when the explicit request contains genuinely conflicting or ambiguous statements about whether a conditional target matters.",
            "A later user turn may make a previously NOT_MATERIAL target MATERIAL; evaluate the complete supplied conversation each time.",
            "Do not infer unstated user needs, preferences, constraints, priorities, usage conditions, or criteria.",
            "Do not recommend, rank, score, evaluate, or authorize any vehicle.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            request: input.query,
            requirements,
          }),
        },
      ],
      text: {
        format: zodTextFormat(
          materialityOutputSchema,
          "cars_requirement_materiality",
        ),
      },
    });

    if (!response.output_parsed) {
      return undefined;
    }

    const output = materialityOutputSchema.parse(response.output_parsed);
    const expectedIds = new Set(
      input.policy.requirements.map((requirement) => requirement.requirementId),
    );
    const receivedIds = output.determinations.map(
      (determination) => determination.requirementId,
    );

    if (
      receivedIds.length !== expectedIds.size ||
      new Set(receivedIds).size !== receivedIds.length ||
      receivedIds.some((requirementId) => !expectedIds.has(requirementId))
    ) {
      return undefined;
    }

    const byRequirementId = new Map(
      output.determinations.map((determination) => [
        determination.requirementId,
        determination,
      ]),
    );

    return input.policy.requirements.map((requirement) => {
      const determination = byRequirementId.get(requirement.requirementId);

      if (!determination) {
        throw new Error("Materiality determination coverage changed.");
      }

      return assessMateriality({
        requirementId: determination.requirementId,
        outcome: determination.outcome,
        supportingCandidateIds: [],
        limitations: determination.limitations,
      });
    });
  } catch {
    return undefined;
  }
}
