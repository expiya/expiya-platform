import { zodTextFormat } from "openai/helpers/zod";

import { openai } from "@/lib/openai";

import {
  explicitExtractionOutputSchema,
  type ExplicitExtractionOutput,
} from "./explicitExtractionSchema";

export interface ExplicitExtractionInput {
  text: string;
  sourceReferenceId: string;
}

export async function extractExplicitUserContext(
  input: ExplicitExtractionInput,
): Promise<ExplicitExtractionOutput> {
  const response = await openai.responses.parse({
    model: "gpt-5.5",
    input: [
      {
        role: "system",
        content: [
          "Extract only decision-context information explicitly stated by the user.",
          "Do not infer preferences, priorities, constraints, needs, criteria, options, or facts that the user did not explicitly state.",
          "Do not generate new user facts.",
          "Return zero facts when there is no explicit extractable decision-context information.",
          "Each fact must use exactly one allowed target from the supplied schema.",
          "Preserve the user's meaning; do not add interpretation.",
          "The input may contain multiple labeled user turns from one conversation.",
          "When a later turn explicitly corrects or changes an earlier fact, keep only the latest value for that fact.",
        ].join("\n"),
      },
      {
        role: "user",
        content: input.text,
      },
    ],
    text: {
      format: zodTextFormat(
        explicitExtractionOutputSchema,
        "explicit_context_extraction",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Explicit context extraction returned no parsed output.");
  }

  return explicitExtractionOutputSchema.parse(response.output_parsed);
}
