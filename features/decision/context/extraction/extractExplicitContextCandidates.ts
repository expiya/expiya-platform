import { randomUUID } from "node:crypto";

import type { ContextCandidate } from "@/types/contextCandidate";

import {
  extractExplicitUserContext,
  type ExplicitExtractionInput,
} from "./extractExplicitUserContext";
import { createExplicitContextCandidates } from "./createExplicitContextCandidates";

export async function extractExplicitContextCandidates(
  input: ExplicitExtractionInput,
): Promise<ContextCandidate[]> {
  const extraction = await extractExplicitUserContext(input);

  return createExplicitContextCandidates(
    {
      facts: extraction.facts,
      sourceReferenceId: input.sourceReferenceId,
    },
    randomUUID,
  );
}
