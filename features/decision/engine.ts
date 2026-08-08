import { Car } from "@/types/car";
import {
  DecisionReason,
  DecisionResult,
  Recommendation,
} from "@/types/decision";
import { calculateConfidence } from "@/features/decision/confidence";
import { decisionStore } from "@/features/decision/store/decisionStore";

let decisionSequence = 0;

function createDecisionId(): string {
  decisionSequence += 1;
  return `dec_${Date.now()}${decisionSequence}`;
}

export function calculateDecisionScore(car: Car): number {
  let score = 100;

  // Daha eski araçlar puan kaybeder.
  score -= (2026 - car.year) * 2;

  // Kilometre arttıkça puan düşer.
  score -= Math.floor(car.km / 10000);

  // Fiyat arttıkça puan düşer.
  score -= Math.floor(car.price / 500000);

  return Math.max(0, Math.min(100, score));
}

function getRecommendation(score: number): Recommendation {
  if (score >= 90) {
    return "Excellent";
  }

  if (score >= 80) {
    return "Very Good";
  }

  if (score >= 70) {
    return "Good";
  }

  return "Consider Carefully";
}

function buildReasons(car: Car): DecisionReason[] {
  const reasons: DecisionReason[] = [];

  if (car.year >= 2023) {
    reasons.push({
      code: "NEW_MODEL",
      message: "Recent model year",
    });
  } else if (car.year <= 2018) {
    reasons.push({
      code: "OLD_MODEL",
      message: "Older model year",
    });
  }

  if (car.km < 30000) {
    reasons.push({
      code: "LOW_MILEAGE",
      message: "Low mileage",
    });
  } else if (car.km > 120000) {
    reasons.push({
      code: "HIGH_MILEAGE",
      message: "High mileage",
    });
  }

  if (car.price < 1300000) {
    reasons.push({
      code: "GOOD_PRICE",
      message: "Competitive price",
    });
  } else if (car.price > 1700000) {
    reasons.push({
      code: "HIGH_PRICE",
      message: "Premium pricing",
    });
  }

  return reasons;
}

export function evaluateCar(car: Car): DecisionResult {
  const score = calculateDecisionScore(car);
  const reasons = buildReasons(car);

  const decision: DecisionResult = {
    decisionId: createDecisionId(),
    score,
    recommendation: getRecommendation(score),
    reasons,
    confidence: calculateConfidence(reasons),
    trace: {
      steps: [
        "Vehicle data evaluated",
        "Scoring rules applied",
        "Supporting reasons generated",
        "Confidence calculated",
        "Recommendation created",
      ],
    },
  };

  decisionStore.save(decision);

  return decision;
}
