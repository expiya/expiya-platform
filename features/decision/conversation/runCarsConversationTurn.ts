import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import {
  deriveCarsEvidenceBackedRequirementsFromQuery,
  runCarsEvidenceBackedDecision,
  type CarsEvidenceBackedDecisionResult,
} from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type {
  CarsConversationRequest,
  CarsConversationResponse,
} from "@/types/carsConversation";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import {
  createCarsClarificationRepair,
  isCarsClarificationRepair,
  suppressRepeatedCarsResponse,
} from "./carsConversationRepair";
import { createCarsConversationGuidance } from "./createCarsConversationGuidance";
import { createCarsFollowUp } from "./createCarsFollowUp";
import {
  isCandidateComparisonConversation,
} from "./hasActionableCarsContext";
import {
  buildCarsRequirementLedger,
  carsQuestionPurpose,
  latestRequirement,
  withCarsConversationState,
} from "./carsRequirementLedger";

const MAX_USER_TURNS = 20;

function evidenceDecision(result: CarsEvidenceBackedDecisionResult) {
  return {
    conversationState: result.status === "DECISION_READY" ? "DECISION_READY" as const
      : result.status === "INSUFFICIENT_VEHICLE_EVIDENCE" ? "EVIDENCE_INSUFFICIENT" as const
        : result.status === "NO_ELIGIBLE_CANDIDATE" ? "NO_ELIGIBLE_CANDIDATE" as const
          : result.discriminatorChoices ? "FINAL_DISCRIMINATOR_REQUIRED" as const : "FOLLOW_UP" as const,
    decisionStatus: result.status,
    evidenceBacked: result.status === "DECISION_READY",
    selectedRuntimeVehicleCandidateId: result.selectedRuntimeVehicleCandidateId,
    selectedVehicle: result.selectedVehicle,
    requirements: result.materialRequirements.map(({ factKey, predicate, value }) => ({ factKey, predicate, value })),
    candidateDispositions: result.candidateEvaluations.map(({ runtimeVehicleCandidateId, disposition }) => ({ runtimeVehicleCandidateId, disposition })),
    evidenceTrace: { candidateIds: result.evidenceTrace.candidateIds, artifactVersion: result.evidenceTrace.authority.artifactVersion },
    followUpQuestion: result.followUpQuestion,
    limitations: result.status === "INSUFFICIENT_VEHICLE_EVIDENCE"
      ? ["Bu araç için gerekli doğrulanmış veri yeterli değil."] : undefined,
    discriminatorChoices: result.discriminatorChoices,
  };
}

function missingEvidenceDimensionQuestion(hasSeats: boolean, isTurkish: boolean): string {
  if (hasSeats) return isTurkish
    ? "Bagaj için zorunlu bir minimum hacim beklentiniz var mı? Varsa litre olarak belirtir misiniz?"
    : "Do you have a required minimum cargo volume? If so, please give it in litres.";
  return isTurkish
    ? "En az kaç koltuk olmasını istiyorsunuz?"
    : "What is the minimum number of seats you require?";
}

function latestUserRejectedRecommendations(input: CarsConversationRequest): boolean {
  const latest = [...input.messages].reverse().find((message) => message.role === "user");
  return Boolean(latest && /(?:beğenmedim|hoşuma gitmedi|istemiyorum|başka seçenek|bunlar olmaz|not like|don'?t like|different options)/iu.test(latest.content));
}

function fallbackGuidance(
  input: CarsConversationRequest,
  locale: "tr" | "en",
): CarsConversationResponse {
  const isTurkish = locale === "tr";
  const trace = buildCarsRequirementLedger(input.messages);
  if (!trace.answeredQuestionPurposes.includes("PRIMARY_USAGE")) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Sizi doğru anladığımdan emin olmak istiyorum: Bu araç günlük hayatınızda en çok hangi işi kolaylaştırmalı?"
        : "I want to understand you correctly: what should this car make easier in your daily life?",
      options: isTurkish
        ? ["İşe gidip gelme", "Aile kullanımı", "Uzun yol", "Henüz bilmiyorum"]
        : ["Commuting", "Family use", "Long trips", "I am not sure yet"],
    };
  }
  if (!trace.answeredQuestionPurposes.includes("BUDGET_MAX")) {
    return {
      kind: "QUESTION",
      message: isTurkish
        ? "Anladım. Bu ihtiyacı karşılamak için rahat edeceğiniz yaklaşık üst bütçe nedir? Bütçeniz henüz net değilse şimdilik açık bırakabiliriz."
        : "Understood. What approximate maximum budget would feel comfortable? It is fine if you do not know yet.",
    };
  }
  if (!trace.answeredQuestionPurposes.includes("FINAL_PRIORITY") && !trace.askedQuestionPurposes.includes("FINAL_PRIORITY")) return {
    kind: "QUESTION",
    message: isTurkish
      ? "Kararı gerçekten değiştirecek son noktayı netleştirelim: Sizin için vazgeçilmez olan özellik nedir?"
      : "Let's clarify the last decision-changing point: which quality is non-negotiable for you?",
  };
  return {
    kind: "QUESTION",
    message: isTurkish
      ? "Verdiğiniz ihtiyaçları koruyorum. Mevcut doğrulanmış karar kapsamım koltuk ve bagaj eşiklerini değerlendirebiliyor; bunlardan biri sizin için zorunluysa sayısal eşiği söyleyebilirsiniz. Aksi halde bu bilgilerle güvenilir bir araç seçemem."
      : "I am retaining your requirements. The current verified decision scope can evaluate seat and cargo thresholds; provide one if it is mandatory. Otherwise I cannot make a reliable selection from this context.",
  };
}

function unsupportedRequirementResponse(input: CarsConversationRequest): CarsConversationResponse | undefined {
  const trace = buildCarsRequirementLedger(input.messages);
  const latestUser = [...input.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const drivetrain = latestRequirement(trace, "DRIVETRAIN");
  const bodyType = latestRequirement(trace, "BODY_TYPE");
  const equipment = latestRequirement(trace, "EQUIPMENT_LEVEL");
  const latestCaptured = new Set(trace.capturedOnLatestTurn);
  const frustration = /(?:dedim ya|anlamadın mı|anlamdın mı|az önce söyledim|salaksın|aptal)/iu.test(latestUser);

  if (frustration && bodyType) return {
    kind: "QUESTION",
    message: "Pickup tercihinizi anladım ve kayıtlı; tekrar sormayacağım. Mevcut doğrulanmış karar verisi pickup gövde tipini adaylar arasında güvenilir biçimde değerlendirmediği için bu tercihi yok sayarak araç seçmeyeceğim.",
    conversation: withCarsConversationState(trace, "INSUFFICIENT_SUPPORTED_EVIDENCE"),
  };
  if (latestCaptured.has("DRIVETRAIN") && drivetrain) return {
    kind: "QUESTION",
    message: "4x4/AWD şartınızı kaydettim. Mevcut doğrulanmış karar verisinde bunu kontrollü adayların tamamı için güvenilir biçimde değerlendiremiyorum; bu nedenle yok sayarak karar vermeyeceğim. Kararı desteklenen bir boyutta ilerletmek için en az kaç koltuk gerekli?",
    conversation: withCarsConversationState(trace, "COLLECTING_CONTEXT"),
  };
  if (latestCaptured.has("BODY_TYPE") && bodyType) return {
    kind: "QUESTION",
    message: "Pickup tercihinizi kaydettim. Mevcut doğrulanmış karar verisi gövde tipini bu karar akışında güvenilir biçimde değerlendirmiyor; bu nedenle pickup tercihinizi yok sayarak seçim yapmayacağım. Bagaj için zorunlu bir minimum hacminiz varsa litre olarak belirtebilirsiniz.",
    conversation: withCarsConversationState(trace, "COLLECTING_CONTEXT"),
  };
  if (latestCaptured.has("EQUIPMENT_LEVEL") && equipment) return {
    kind: "QUESTION",
    message: "Yüksek donanım tercihinizi kaydettim. Mevcut doğrulanmış karar verisi donanım seviyesini adaylar arasında güvenilir biçimde değerlendirmiyor; bu nedenle değerlendirmiş gibi davranmayacağım. Araç düzenli olarak kaç kişiyi taşımalı?",
    conversation: withCarsConversationState(trace, "COLLECTING_CONTEXT"),
  };
}

function runtimeGap(result: Awaited<ReturnType<typeof runCarsRuntime>>): string {
  const reason = result.reasons[0];
  return reason ? `${reason.stage}: ${reason.code}` : "The governed runtime needs more explicit context.";
}

async function createCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const locale = "tr" as const;
  const isTurkish = locale === "tr";
  const userTurnCount = input.messages.filter((message) => message.role === "user").length;
  const comparison = isCandidateComparisonConversation(input.messages);
  const minimumTurns = comparison ? 2 : 3;
  const recommendationAllowed = userTurnCount >= minimumTurns;
  const atTurnLimit = userTurnCount >= MAX_USER_TURNS;
  const hasPriorRecommendations = input.messages.some(
    (message) => (message.recommendationIds?.length ?? 0) > 0,
  );
  const rejectedRecommendations = hasPriorRecommendations
    && latestUserRejectedRecommendations(input);
  const effectiveRecommendationAllowed = recommendationAllowed && !rejectedRecommendations;

  const latestUser = [...input.messages].reverse().find((message) => message.role === "user");
  if (
    userTurnCount === 1
    && latestUser
    && /(?:arazi|off-road|off road|stabilize|kamp yolu|kötü yol|rough road)/iu.test(latestUser.content)
  ) {
    return {
      kind: "QUESTION",
      message: "Evet, arazi ve kötü yol kullanımına uygun araçları değerlendirebiliriz. Daha çok kamp ve stabilize yol mu, çamurlu/kötü yollar mı, yoksa ciddi arazi kullanımı mı düşünüyorsunuz?",
      options: ["Kamp ve stabilize yol", "Çamurlu/kötü yol", "Ciddi arazi kullanımı"],
      conversation: buildCarsRequirementLedger(input.messages),
    };
  }

  const unsupportedResponse = unsupportedRequirementResponse(input);
  if (unsupportedResponse) return unsupportedResponse;

  const query = buildCarsConversationQuery(input.messages);
  const bridge = deriveCarsEvidenceBackedRequirementsFromQuery(query);
  const hasEvidenceConversation = bridge.requirements.length > 0
    || bridge.materialPreferencesWithoutThreshold.length > 0
    || bridge.partySize !== undefined;

  if (hasEvidenceConversation) {
    const result = runCarsEvidenceBackedDecision({ query, vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort, discriminatorChoiceId: input.choiceId });
    const structured = evidenceDecision(result);
    if (result.status === "NO_ELIGIBLE_CANDIDATE") {
      return { kind: "QUESTION", message: isTurkish
        ? "Şu anda doğrulanmış verileriyle değerlendirdiğim araçların hiçbiri zorunlu şartınızı karşılamıyor. Şartlardan hangisinin esneyebileceğini konuşabiliriz."
        : "None of the vehicles I can currently evaluate with verified data meets that requirement. We can discuss which constraint could flex.", decision: structured };
    }
    if (result.status === "INSUFFICIENT_VEHICLE_EVIDENCE") {
      return { kind: "QUESTION", message: isTurkish
        ? "Güvenilir bir seçim için gereken doğrulanmış araç verisi şu anda yeterli değil. Bu nedenle bir araç önermeyeceğim."
        : "The verified vehicle data needed for a reliable decision is not sufficient right now, so I will not recommend a vehicle.", decision: structured };
    }
    const hasSeats = bridge.requirements.some((item) => item.factKey === "seats");
    const hasCargo = bridge.requirements.some((item) => item.factKey === "cargo_volume_l");
    if (!hasSeats || !hasCargo) {
      const ledger = buildCarsRequirementLedger(input.messages);
      const confirmedSeatsOnLatestTurn = ledger.capturedOnLatestTurn.includes("MIN_SEATS")
        && /^(?:evet|aynen|doğru|olur|yes|correct)[.!\s]*$/iu.test(latestUser?.content.trim() ?? "");
      const message = confirmedSeatsOnLatestTurn && hasSeats && !hasCargo
        ? isTurkish
          ? `${latestRequirement(ledger, "MIN_SEATS")?.value} koltuk şartınızı onayladım. Bagaj için zorunlu bir minimum hacminiz var mı? Varsa litre olarak belirtir misiniz?`
          : `I confirmed your ${latestRequirement(ledger, "MIN_SEATS")?.value}-seat requirement. Do you have a required minimum cargo volume in litres?`
        : bridge.partySize !== undefined && !hasSeats
        ? isTurkish
          ? `${bridge.partySize} kişi olduğunuzu anladım. En az ${bridge.partySize} koltuk sizin için zorunlu mu?`
          : `I understand there are ${bridge.partySize} people. Is at least ${bridge.partySize} seats a firm requirement?`
        : bridge.materialPreferencesWithoutThreshold.includes("cargo_volume_l") && !hasCargo
          ? isTurkish ? "Bagajın önemli olduğunu anladım. Zorunlu bir minimum hacim beklentiniz var mı? Varsa litre olarak belirtir misiniz?" : "I understand cargo space matters. Do you have a required minimum volume in litres?"
          : missingEvidenceDimensionQuestion(hasSeats, isTurkish);
      return { kind: "QUESTION", message, decision: {
        ...structured,
        conversationState: "FOLLOW_UP",
        decisionStatus: "NEEDS_MORE_USER_CONTEXT",
        evidenceBacked: false,
        selectedRuntimeVehicleCandidateId: undefined,
        selectedVehicle: undefined,
        followUpQuestion: message,
        discriminatorChoices: undefined,
      } };
    }
    if (result.status === "DECISION_READY") {
      return { kind: "QUESTION", message: result.userFacingExplanation ?? "Güvenilir seçim hazır.", decision: structured };
    }
    if (result.discriminatorChoices) return {
      kind: "QUESTION",
      message: result.followUpQuestion ?? "Kararı değiştirecek seçeneği seçin.",
      discriminatorChoices: result.discriminatorChoices,
      decision: structured,
    };
    return { kind: "QUESTION", message: result.followUpQuestion ?? (isTurkish
      ? "Birden fazla araç zorunlu şartlarınızı karşılıyor. Kararı ayırabilecek başka bir zorunlu tercihiniz var mı?"
      : "More than one vehicle meets your requirements. Do you have another must-have that could separate them?"), decision: structured };
  }

  const clarificationRepair = createCarsClarificationRepair(input.messages);
  if (clarificationRepair) return clarificationRepair;

  const guidance = await createCarsConversationGuidance({
    messages: input.messages,
    locale,
    recommendationAllowed: effectiveRecommendationAllowed,
    remainingUserTurns: Math.max(0, MAX_USER_TURNS - userTurnCount),
    hasPriorRecommendations,
    latestUserRejectedRecommendations: rejectedRecommendations,
  });

  if (!guidance) return fallbackGuidance(input, locale);
  if (guidance.action === "REDIRECT") {
    return { kind: "QUESTION", message: guidance.message, options: guidance.options };
  }
  if (!atTurnLimit && (guidance.action === "ASK" || !effectiveRecommendationAllowed)) {
    return { kind: "QUESTION", message: guidance.message, options: guidance.options };
  }

  const result = await runCarsRuntime({
    requestId: `${input.conversationId}:turn:${randomUUID()}`,
    contextReference: `${input.conversationId}:context`,
    query,
  });

  if (result.status === "SUCCEEDED") {
    return {
      kind: "RECOMMENDATIONS",
      message: result.recommendations.length > 0
        ? isTurkish
          ? result.recommendations.length === 1
            ? "Konuştuklarımıza göre net seçimim bu araç. Kartı açarak gerekçelerini inceleyebilir veya bana itiraz edip sohbete devam edebilirsiniz."
            : "Konuştuklarımıza göre ilk araç net seçimim; diğerleri yalnızca güçlü alternatifler. En fazla üç sonuç gösteriyorum. Kartları açarak gerekçeleri inceleyebilirsiniz."
          : "Weighing everything we discussed, these are the strongest decisions right now. You can inspect the reasoning, challenge it, or keep talking."
        : isTurkish
          ? "Konuştuklarımız yeterince net, fakat mevcut katalogda koşullarınızı dürüstçe karşılayan bir araç yok. İsterseniz hangi koşulun esneyebileceğini konuşalım."
          : "Our conversation is clear enough, but no current catalog car honestly meets it. We can discuss which constraint could flex.",
      recommendations: result.recommendations,
    };
  }

  if (result.status === "FAILED") {
    return { kind: "ERROR", message: createCarsFollowUp(result, locale) };
  }

  if (atTurnLimit) {
    return {
      kind: "ERROR",
      message: isTurkish
        ? "Bu görüşme için güvenli tur sınırına ulaştık; elimizdeki bilgiler hâlâ güvenilir bir karar için yeterli değil. Yeni bir görüşmede bütçe, kullanım ve vazgeçilmez ihtiyacınızı birlikte yazarak başlayabilirsiniz."
        : "We reached this conversation's safe turn limit without enough information for a reliable decision. Start a new conversation with your budget, usage, and one non-negotiable need.",
    };
  }

  const followUp = await createCarsConversationGuidance({
    messages: input.messages,
    locale,
    recommendationAllowed: false,
    remainingUserTurns: MAX_USER_TURNS - userTurnCount,
    runtimeGap: runtimeGap(result),
    hasPriorRecommendations,
    latestUserRejectedRecommendations: rejectedRecommendations,
  });
  return followUp
    ? { kind: "QUESTION", message: followUp.message, options: followUp.options }
    : { kind: "QUESTION", message: createCarsFollowUp(result, locale) };
}

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  const response = await createCarsConversationTurn(input);
  const repaired = suppressRepeatedCarsResponse(input.messages, response);
  if ("conversation" in repaired && repaired.conversation) return repaired;
  const baseTrace = buildCarsRequirementLedger(input.messages);
  const trace = input.choiceId
    ? { ...baseTrace, didConversationProgress: true }
    : baseTrace;
  const latestUserContent = [...input.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  if (
    repaired.kind === "QUESTION"
    && !repaired.discriminatorChoices
    && !repaired.decision
    && response === repaired
    && !isCarsClarificationRepair(latestUserContent)
  ) {
    const purpose = carsQuestionPurpose(repaired.message);
    const answered = purpose && trace.answeredQuestionPurposes.includes(purpose);
    const stalledRepeat = purpose && trace.askedQuestionPurposes.includes(purpose) && !trace.didConversationProgress;
    if (answered || stalledRepeat) return {
      kind: "QUESTION",
      message: "Bu bilgiyi daha önce verdiniz; aynı soruyu tekrar sormayacağım. Kayıtlı ihtiyaçlarınız mevcut doğrulanmış karar boyutlarıyla güvenilir bir seçim üretmeye yetmiyorsa, eksik kapasiteyi açıkça belirterek burada duracağım.",
      conversation: withCarsConversationState(trace, "INSUFFICIENT_SUPPORTED_EVIDENCE"),
    };
  }
  const state = repaired.kind === "RECOMMENDATIONS" ? "DECISION_READY"
    : repaired.kind === "ERROR" ? "SYSTEM_FAILURE"
      : repaired.decision?.conversationState === "FINAL_DISCRIMINATOR_REQUIRED" ? "FINAL_DISCRIMINATOR_REQUIRED"
        : repaired.decision?.conversationState === "DECISION_READY" ? "DECISION_READY"
          : repaired.decision?.conversationState === "EVIDENCE_INSUFFICIENT" ? "INSUFFICIENT_SUPPORTED_EVIDENCE"
            : repaired.decision?.conversationState === "NO_ELIGIBLE_CANDIDATE" ? "NO_SUPPORTED_CANDIDATE"
              : "COLLECTING_CONTEXT";
  return { ...repaired, conversation: withCarsConversationState(trace, state) } as CarsConversationResponse;
}
