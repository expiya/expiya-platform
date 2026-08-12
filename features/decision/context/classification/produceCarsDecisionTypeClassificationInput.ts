import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";

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

function explicitUserText(text: string): string {
  const turns = text
    .split("\n")
    .map((line) => line.match(/^User turn \d+:\s*(.+)$/iu)?.[1])
    .filter((line): line is string => Boolean(line));
  return turns.length > 0 ? turns.join("\n") : text;
}

function classifyExplicitCarsIntent(
  text: string,
): CarsDecisionTypeClassificationInput | undefined {
  const userText = explicitUserText(text);
  if (
    /(?:karşılaştır|kıyasla)/iu.test(userText)
    || /\b(?:compare|comparison|versus|vs\.?)\b/iu.test(userText)
  ) {
    return {
      status: "READY",
      candidateDecisionTypes: ["AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"],
    };
  }

  const turkishPurchaseIntent = /(?:araba|otomobil|araç)[\s\S]*(?:almak|satın almak|arıyorum|istiyorum|lazım|öner)/iu.test(userText);
  const englishPurchaseIntent = /\b(?:buy|want|need|looking for|recommend)[\s\S]*(?:car|vehicle)\b/iu.test(userText);
  if (turkishPurchaseIntent || englishPurchaseIntent) {
    return {
      status: "READY",
      candidateDecisionTypes: ["AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION"],
    };
  }

  return undefined;
}

export async function produceCarsDecisionTypeClassificationInput(
  input: ProduceCarsDecisionTypeClassificationInput,
): Promise<CarsDecisionTypeClassificationInput> {
  const explicitClassification = classifyExplicitCarsIntent(input.text);
  if (explicitClassification) return explicitClassification;

  try {
    const response = await getOpenAIClient().responses.parse({
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
