import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { openai } from "@/lib/openai";

import type { CarsDecisionTypeClassificationInput } from "../sufficiency/classifyCarsDecisionType";

const carsDecisionTypeSchema = z.enum([
  "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
  "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
]);

const carsDecisionTypeClassificationOutputSchema = z.object({
  candidateDecisionTypes: z.array(carsDecisionTypeSchema),
});

export interface ProduceCarsDecisionTypeClassificationInput {
  readonly text: string;
}

export async function produceCarsDecisionTypeClassificationInput(
  input: ProduceCarsDecisionTypeClassificationInput,
): Promise<CarsDecisionTypeClassificationInput> {
  try {
    const response = await openai.responses.parse({
      model: "gpt-5.5",
      input: [
        {
          role: "system",
          content: [
            "Classify the user's automotive purchase request using only the approved Cars decision types.",
            "Use AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION when the user wants suitable vehicle options discovered or recommended.",
            "Use AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON when the user wants two or more identified vehicle candidates compared.",
            "Return both types only when the request genuinely and explicitly requires both operations.",
            "Return no types when the request is not an automotive purchase request or cannot support either approved type.",
            "Do not recommend, rank, score, evaluate, or authorize any vehicle.",
          ].join("\n"),
        },
        {
          role: "user",
          content: input.text,
        },
      ],
      text: {
        format: zodTextFormat(
          carsDecisionTypeClassificationOutputSchema,
          "cars_decision_type_classification",
        ),
      },
    });

    if (!response.output_parsed) {
      return { status: "FAILED" };
    }

    const output = carsDecisionTypeClassificationOutputSchema.parse(
      response.output_parsed,
    );

    return {
      status: "READY",
      candidateDecisionTypes: output.candidateDecisionTypes,
    };
  } catch {
    return { status: "FAILED" };
  }
}
