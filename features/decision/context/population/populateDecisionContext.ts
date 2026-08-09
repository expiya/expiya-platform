import type {
  ContextCandidate,
  ContextTarget,
} from "@/types/contextCandidate";
import type { DecisionContext } from "@/types/decisionContext";
import type {
  PopulationInput,
  PopulationRejection,
  PopulationResult,
} from "@/types/contextPopulation";

const arrayTargets = new Set<ContextTarget>([
  "userContext.needs",
  "userContext.priorities",
  "userContext.preferences",
  "userContext.constraints",
  "userContext.usageConditions",
  "evaluationContext.decisionCriteria",
]);

function createEmptyContext(decisionNeed: string): DecisionContext {
  return {
    decisionNeed,
    userContext: {
      needs: [],
      priorities: [],
      preferences: [],
      constraints: [],
      usageConditions: [],
    },
    evaluationContext: {
      decisionCriteria: [],
      decisionOptions: undefined,
    },
    domainContext: {
      contextualElements: undefined,
      contextualRelationships: undefined,
    },
  };
}

function cloneContext(context: DecisionContext): DecisionContext {
  return {
    decisionNeed: context.decisionNeed,
    userContext: {
      needs: [...context.userContext.needs],
      priorities: [...context.userContext.priorities],
      preferences: [...context.userContext.preferences],
      constraints: [...context.userContext.constraints],
      usageConditions: [...context.userContext.usageConditions],
    },
    evaluationContext: {
      decisionCriteria: [...context.evaluationContext.decisionCriteria],
      decisionOptions: context.evaluationContext.decisionOptions,
    },
    domainContext: {
      contextualElements: context.domainContext.contextualElements,
      contextualRelationships: context.domainContext.contextualRelationships,
    },
  };
}

function appendArrayValue(
  context: DecisionContext,
  candidate: ContextCandidate,
): boolean {
  if (!arrayTargets.has(candidate.target)) {
    return false;
  }

  if (typeof candidate.value !== "string") {
    return false;
  }

  switch (candidate.target) {
    case "userContext.needs":
      context.userContext.needs.push(candidate.value);
      return true;

    case "userContext.priorities":
      context.userContext.priorities.push(candidate.value);
      return true;

    case "userContext.preferences":
      context.userContext.preferences.push(candidate.value);
      return true;

    case "userContext.constraints":
      context.userContext.constraints.push(candidate.value);
      return true;

    case "userContext.usageConditions":
      context.userContext.usageConditions.push(candidate.value);
      return true;

    case "evaluationContext.decisionCriteria":
      context.evaluationContext.decisionCriteria.push(candidate.value);
      return true;

    default:
      return false;
  }
}

function isOpaqueTarget(
  target: ContextTarget,
): boolean {
  return (
    target === "evaluationContext.decisionOptions" ||
    target === "domainContext.contextualElements" ||
    target === "domainContext.contextualRelationships"
  );
}

function isOpaqueCandidateEligible(
  candidate: ContextCandidate,
): boolean {
  if (
    candidate.target ===
    "evaluationContext.decisionOptions"
  ) {
    return (
      candidate.provenance === "EXPLICIT_USER" ||
      candidate.provenance === "DOMAIN_SUPPLIED"
    );
  }

  return (
    candidate.target ===
      "domainContext.contextualElements" ||
    candidate.target ===
      "domainContext.contextualRelationships"
  );
}

function hasAppliedTarget(
  appliedCandidates: ContextCandidate[],
  target: ContextTarget,
): boolean {
  return appliedCandidates.some(
    (candidate) => candidate.target === target,
  );
}

function setOpaqueValue(
  context: DecisionContext,
  candidate: ContextCandidate,
): boolean {
  switch (candidate.target) {
    case "evaluationContext.decisionOptions":
      context.evaluationContext.decisionOptions =
        candidate.value;
      return true;

    case "domainContext.contextualElements":
      context.domainContext.contextualElements =
        candidate.value;
      return true;

    case "domainContext.contextualRelationships":
      context.domainContext.contextualRelationships =
        candidate.value;
      return true;

    default:
      return false;
  }
}

function reject(
  rejectedCandidates: PopulationRejection[],
  candidate: ContextCandidate,
  reason: PopulationRejection["reason"],
): void {
  rejectedCandidates.push({
    candidate,
    reason,
  });
}

export function populateDecisionContext(
  input: PopulationInput,
): PopulationResult {
  const previousApplied =
    input.current?.appliedCandidates ?? [];

  const previousRejected =
    input.current?.rejectedCandidates ?? [];

  const appliedCandidates = [...previousApplied];
  const rejectedCandidates = [...previousRejected];

  const appliedIds = new Set(
    previousApplied.map((candidate) => candidate.id),
  );

  let context =
    input.current?.ok === true
      ? cloneContext(input.current.context)
      : null;

  const initialDecisionNeedConflicts = new Set<string>();

  if (context === null) {
    const initialDecisionNeeds = input.candidates.filter(
      (
        candidate,
      ): candidate is ContextCandidate<"decisionNeed"> =>
        candidate.target === "decisionNeed" &&
        typeof candidate.value === "string",
    );

    const distinctDecisionNeedValues = new Set(
      initialDecisionNeeds.map(
        (candidate) => candidate.value,
      ),
    );

    if (distinctDecisionNeedValues.size === 1) {
      context = createEmptyContext(
        initialDecisionNeeds[0].value,
      );
    } else if (distinctDecisionNeedValues.size > 1) {
      for (const candidate of initialDecisionNeeds) {
        initialDecisionNeedConflicts.add(candidate.id);
      }
    }
  }

  for (const candidate of input.candidates) {
    if (initialDecisionNeedConflicts.has(candidate.id)) {
      reject(
        rejectedCandidates,
        candidate,
        "UNRESOLVED_CONFLICT",
      );
      continue;
    }

    if (appliedIds.has(candidate.id)) {
      reject(
        rejectedCandidates,
        candidate,
        "DUPLICATE_CANDIDATE",
      );
      continue;
    }

    if (candidate.target === "decisionNeed") {
      if (typeof candidate.value !== "string") {
        reject(
          rejectedCandidates,
          candidate,
          "INVALID_CANDIDATE",
        );
        continue;
      }

      if (context === null) {
        context = createEmptyContext(candidate.value);
        appliedCandidates.push(candidate);
        appliedIds.add(candidate.id);
        continue;
      }

      if (context.decisionNeed === candidate.value) {
        appliedCandidates.push(candidate);
        appliedIds.add(candidate.id);
        continue;
      }

      reject(
        rejectedCandidates,
        candidate,
        "UNRESOLVED_CONFLICT",
      );
      continue;
    }

    if (context === null) {
      reject(
        rejectedCandidates,
        candidate,
        "UNSUPPORTED_POPULATION",
      );
      continue;
    }

    if (isOpaqueTarget(candidate.target)) {
      if (!isOpaqueCandidateEligible(candidate)) {
        reject(
          rejectedCandidates,
          candidate,
          "UNSUPPORTED_POPULATION",
        );
        continue;
      }

      if (
        hasAppliedTarget(
          appliedCandidates,
          candidate.target,
        )
      ) {
        reject(
          rejectedCandidates,
          candidate,
          "UNRESOLVED_CONFLICT",
        );
        continue;
      }

      if (setOpaqueValue(context, candidate)) {
        appliedCandidates.push(candidate);
        appliedIds.add(candidate.id);
        continue;
      }
    }

    if (appendArrayValue(context, candidate)) {
      appliedCandidates.push(candidate);
      appliedIds.add(candidate.id);
      continue;
    }

    reject(
      rejectedCandidates,
      candidate,
      "UNSUPPORTED_POPULATION",
    );
  }

  if (context === null) {
    return {
      ok: false,
      appliedCandidates,
      rejectedCandidates,
    };
  }

  return {
    ok: true,
    context,
    appliedCandidates,
    rejectedCandidates,
  };
}
