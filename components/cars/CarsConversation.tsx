"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CarCard } from "@/components/cars/CarCard";
import { V2AuthorizedCarCard } from "@/components/cars/V2AuthorizedCarCard";
import { clearSubmittedV2MultiSelection, selectedV2OptionLabels, toggleV2MultiSelection } from "@/components/cars/v2MultiSelectState";
import { productEvents, recordProductEventOnce } from "@/lib/analytics/productEvents";
import {
  createRecommendationTermsAcceptance,
  RECOMMENDATION_TERMS_VERSION,
} from "@/lib/legal/recommendationTerms";
import {
  hasActiveFinalDiscriminator,
  shouldRenderRecommendationCards,
  shouldShowRecommendationTermsGate,
  shouldShowVehicleQuickReplies,
} from "@/features/decision/conversation/carsConversationUiState";
import type {
  CarsConversationMessage,
  CarsConversationResponse,
  CarsConversationTrace,
  CarsFinalDiscriminatorChoice,
  PersistedCarsConversation,
} from "@/types/carsConversation";

interface CarsConversationProps {
  readonly initialQuery: string;
  readonly pilotUsername?: string;
}

function newMessage(role: CarsConversationMessage["role"], content: string) {
  return { id: crypto.randomUUID(), role, content } as const;
}

export function splitAssistantMessageSegments(content: string): readonly string[] {
  const paragraphs = content
    .split(/\n\s*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : [content];
}

const storageKey = "expiya:cars-conversation:v5";
const legacyStorageKey = "expiya:cars-conversation:v4";

function readPersistedConversation(): PersistedCarsConversation | null {
  try {
    // Session storage avoids leaving sensitive conversation context on a shared device.
    localStorage.removeItem(storageKey);
    localStorage.removeItem(legacyStorageKey);
    const raw = sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey);
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<PersistedCarsConversation>;
    if (
      (candidate.version !== 4 && candidate.version !== 5)
      || typeof candidate.conversationId !== "string"
      || !Array.isArray(candidate.messages)
      || !candidate.messages.every((message) => (
        message
        && typeof message.id === "string"
        && (message.role === "user" || message.role === "assistant")
        && typeof message.content === "string"
      ))
    ) return null;
    return candidate as PersistedCarsConversation;
  } catch {
    return null;
  }
}

export function CarsConversation({ initialQuery, pilotUsername }: CarsConversationProps) {
  const router = useRouter();
  const conversationId = useRef<string>("");
  const initialRequestStarted = useRef(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const shouldFollowConversationRef = useRef(true);
  const [messages, setMessages] = useState<CarsConversationMessage[]>([]);
  const [conversation, setConversation] = useState<CarsConversationTrace | undefined>();
  const [draft, setDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [v2MultiSelections, setV2MultiSelections] = useState<Record<string, readonly string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [assistantReveal, setAssistantReveal] = useState<null | {
    readonly messageId: string;
    readonly visibleSegments: number;
    readonly totalSegments: number;
  }>(null);
  const [equipmentExplanationPendingActionId, setEquipmentExplanationPendingActionId] = useState<string | null>(null);
  const [equipmentExplanation, setEquipmentExplanation] = useState<null | { actionId: string; offerToken: string; sessionToken: string; message: string; options: readonly { id: "ACCEPT" | "DECLINE"; label: string }[]; notice?: string | null; items?: readonly { label: string; explanation: string; caveat: string }[] }>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [recommendationTermsChecked, setRecommendationTermsChecked] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const locale = "tr" as const;
  const isTurkish = true;

  const conversationRef = useRef<CarsConversationTrace | undefined>(undefined);
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const continueConversation = useCallback(async (
    nextMessages: CarsConversationMessage[],
    choiceId?: CarsFinalDiscriminatorChoice["id"],
    selectedOptionId?: string,
    selectedOptionIds?: readonly string[],
    recommendationTermsAcceptance?: ReturnType<typeof createRecommendationTermsAcceptance>,
  ) => {
    setIsLoading(true);
    let keepBusyForReveal = false;

    try {
      const response = await fetch("/api/cars/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current,
          messages: nextMessages,
          choiceId,
          selectedOptionId,
          selectedOptionIds,
          recommendationTermsAcceptance,
          v2OfferToken: [...nextMessages].reverse().find((message) => message.role === "assistant" && message.v2OfferToken)?.v2OfferToken,
          conversation: conversationRef.current,
        }),
      });
      const payload = await response.json() as CarsConversationResponse | { message?: string };
      if (response.ok) recordProductEventOnce("chat-started:legacy", productEvents.chatStarted("legacy"));
      if (response.ok && "kind" in payload && payload.kind === "RECOMMENDATIONS" && payload.recommendations.length > 0) recordProductEventOnce("recommendations-revealed:legacy", productEvents.recommendationsRevealed("legacy_recommendations", payload.recommendations.length));
      if (response.ok && "kind" in payload && payload.kind === "V2_DECISION" && payload.cards.length > 0) recordProductEventOnce("recommendations-revealed:v2", productEvents.recommendationsRevealed("v2_recommendations", payload.cards.length));
      const content = payload.message ?? (isTurkish
        ? "Cevabınızı işleyemedim. Lütfen yeniden deneyin."
        : "I couldn't process that answer. Please try again.");

      const responseConversation = response.ok && "conversation" in payload ? payload.conversation : conversationRef.current;
      if (response.ok && "conversation" in payload) setConversation(payload.conversation);
      const assistantMessage = {
        ...newMessage("assistant", content),
        quickReplies: response.ok && "kind" in payload && payload.kind === "QUESTION"
          && shouldShowVehicleQuickReplies(nextMessages.filter((item) => item.role === "user").at(-1)?.content ?? "", payload.options)
          ? payload.options
          : undefined,
        optionSet: response.ok && "kind" in payload && payload.kind === "QUESTION"
          ? payload.conversation?.activeOptionSet
          : undefined,
        discriminatorChoices: response.ok && "kind" in payload && payload.kind === "QUESTION"
          ? payload.discriminatorChoices
          : undefined,
        recommendations: response.ok && "kind" in payload && payload.kind === "RECOMMENDATIONS"
          ? payload.recommendations
          : undefined,
        v2Cards: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.cards : undefined,
        v2Options: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.options : undefined,
        v2OptionSelection: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.optionSelection : undefined,
        v2CandidateSummary: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.candidateSummary : undefined,
        v2OfferToken: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.offer?.token : undefined,
        equipmentExplanationActions: response.ok && "kind" in payload && payload.kind === "V2_DECISION" ? payload.equipmentExplanationActions : undefined,
        recommendationIds: response.ok && "kind" in payload && payload.kind === "RECOMMENDATIONS"
          ? payload.recommendations.map((item) => item.car.id)
          : undefined,
      };
      const updatedMessages = [...nextMessages, assistantMessage];
      setMessages(updatedMessages);
      const segmentCount = splitAssistantMessageSegments(content).length;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (segmentCount > 1 && !reduceMotion) {
        keepBusyForReveal = true;
        setAssistantReveal({
          messageId: assistantMessage.id,
          visibleSegments: 1,
          totalSegments: segmentCount,
        });
      }
      // Persist before the card can be clicked; the effect-based write can lose this race during navigation.
      sessionStorage.setItem(storageKey, JSON.stringify({
        version: 5,
        conversationId: conversationId.current,
        messages: updatedMessages,
        conversation: responseConversation,
      } satisfies PersistedCarsConversation));
    } catch {
      setMessages((current) => [
        ...current,
        newMessage("assistant", isTurkish
          ? "Karar servisine şu anda ulaşamıyorum. Konuşmanız korundu; lütfen yeniden deneyin."
          : "I couldn't reach the decision service. Your conversation is safe; please try again."),
      ]);
    } finally {
      if (!keepBusyForReveal) setIsLoading(false);
    }
  }, [isTurkish]);

  useEffect(() => {
    if (!assistantReveal) return;
    if (assistantReveal.visibleSegments >= assistantReveal.totalSegments) {
      const completionTimer = window.setTimeout(() => {
        setAssistantReveal(null);
        setIsLoading(false);
      }, 280);
      return () => window.clearTimeout(completionTimer);
    }

    const message = messages.find((item) => item.id === assistantReveal.messageId);
    const nextSegment = message
      ? splitAssistantMessageSegments(message.content)[assistantReveal.visibleSegments] ?? ""
      : "";
    const delay = Math.min(1100, Math.max(520, 360 + nextSegment.length * 4));
    const revealTimer = window.setTimeout(() => {
      setAssistantReveal((current) => current && current.messageId === assistantReveal.messageId
        ? { ...current, visibleSegments: current.visibleSegments + 1 }
        : current);
    }, delay);
    return () => window.clearTimeout(revealTimer);
  }, [assistantReveal, messages]);

  useEffect(() => {
    const persisted = readPersistedConversation();
    const normalizedInitialQuery = initialQuery.trim();
    const persistedInitialQuery = persisted?.messages.find((message) => message.role === "user")?.content.trim();

    if (persisted && (!normalizedInitialQuery || persistedInitialQuery === normalizedInitialQuery)) {
      conversationId.current = persisted.conversationId;
      initialRequestStarted.current = true;
      queueMicrotask(() => {
        setMessages([...persisted.messages]);
        setConversation(persisted.conversation);
        setIsRestored(true);
      });
    } else {
      conversationId.current = crypto.randomUUID();
      queueMicrotask(() => setIsRestored(true));
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!isRestored || !conversationId.current) return;
    sessionStorage.setItem(storageKey, JSON.stringify({
      version: 5,
      conversationId: conversationId.current,
      messages,
      conversation,
    } satisfies PersistedCarsConversation));
  }, [conversation, isRestored, messages]);

  useEffect(() => {
    if (!isRestored || !initialQuery.trim() || initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    const firstMessage = newMessage("user", initialQuery.trim());
    setMessages([firstMessage]);
    void continueConversation([firstMessage]);
  }, [continueConversation, initialQuery, isRestored]);

  useEffect(() => {
    if (!isRestored || messages.length === 0) return;
    const frame = requestAnimationFrame(() => {
      if (!shouldFollowConversationRef.current) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      conversationEndRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "end",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoading, isRestored, messages]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isLoading) return;

    const activeMultiMessage = [...messages].reverse().find((message) => message.role === "assistant" && message.v2OptionSelection?.mode === "MULTIPLE" && (v2MultiSelections[message.id]?.length ?? 0) > 0);
    const selectedOptionIds = activeMultiMessage ? v2MultiSelections[activeMultiMessage.id] : undefined;
    const userMessage = newMessage("user", editingMessageId ? `Düzeltme: ${content}` : content);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setEditingMessageId(null);
    if (activeMultiMessage) setV2MultiSelections((current) => clearSubmittedV2MultiSelection(current, activeMultiMessage.id));
    void continueConversation(nextMessages, undefined, undefined, selectedOptionIds);
  }

  function submitContent(
    content: string,
    selectedOptionId?: string,
    selectedOptionIds?: readonly string[],
    recommendationTermsAcceptance?: ReturnType<typeof createRecommendationTermsAcceptance>,
  ) {
    if (!content.trim() || isLoading) return;
    const userMessage = {
      ...newMessage("user", content.trim()),
      ...(recommendationTermsAcceptance ? { recommendationTermsAcceptance } : {}),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    void continueConversation(nextMessages, undefined, selectedOptionId, selectedOptionIds, recommendationTermsAcceptance);
  }

  function acceptRecommendationTermsAndReveal() {
    if (!recommendationTermsChecked || isLoading) return;
    const acceptance = createRecommendationTermsAcceptance();
    setRecommendationTermsChecked(false);
    submitContent("Evet, araç önerisini göster.", undefined, undefined, acceptance);
  }

  function toggleV2MultiOption(messageId: string, optionId: string, maximumSelections: number) {
    setV2MultiSelections((current) => {
      const selected = current[messageId] ?? [];
      const next = toggleV2MultiSelection(selected, optionId, maximumSelections);
      const message = messages.find((item) => item.id === messageId);
      setDraft(selectedV2OptionLabels(next, message?.v2Options ?? []).join(" veya "));
      setEditingMessageId(null);
      queueMicrotask(() => draftRef.current?.focus());
      return { ...current, [messageId]: next };
    });
  }

  function editLastUserMessage(message: CarsConversationMessage) {
    if (isLoading) return;
    setEditingMessageId(message.id);
    setDraft(message.content.replace(/^Düzeltme:\s*/u, ""));
    queueMicrotask(() => draftRef.current?.focus());
  }

  function submitDiscriminatorChoice(choice: CarsFinalDiscriminatorChoice) {
    if (isLoading) return;
    const userMessage = newMessage("user", choice.label);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    void continueConversation(nextMessages, choice.id);
  }

  const isFinalDiscriminatorRequired = hasActiveFinalDiscriminator(messages);
  const isRecommendationOfferAwaitingTerms = shouldShowRecommendationTermsGate(messages, conversation);
  const lastUserMessageId = [...messages].reverse().find((message) => message.role === "user")?.id;
  const inputIsDecisionLocked = !editingMessageId && (isFinalDiscriminatorRequired || isRecommendationOfferAwaitingTerms);

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitContent(draft);
  }

  async function clearConversation() {
    if (pilotUsername && messages.some((message) => message.role === "user")) {
      setArchiveError(null); setIsLoading(true);
      try {
        const response = await fetch("/api/pilot/conversations/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId.current, messages: messages.map(({ id, role, content }) => ({ id, role, content })), conversation: conversationRef.current }) });
        if (!response.ok) { const payload = await response.json() as { message?: string }; throw new Error(payload.message ?? "Pilot görüşme kaydedilemedi."); }
      } catch (error) { setArchiveError(error instanceof Error ? error.message : "Pilot görüşme kaydedilemedi."); setIsLoading(false); return; }
    }
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(legacyStorageKey);
    router.push(pilotUsername ? "/pilot" : "/");
  }

  async function openEquipmentExplanation(actionId: string, offerToken: string | undefined) {
    if (!offerToken || equipmentExplanationPendingActionId) return;
    setEquipmentExplanationPendingActionId(actionId);
    try {
      const response = await fetch("/api/cars/equipment-explanation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId.current, offerToken, actionId, operation: "OPEN_SOLICITATION" }) });
      const payload = await response.json() as { message?: string; sessionToken?: string; options?: readonly { id: "ACCEPT" | "DECLINE"; label: string }[] };
      if (payload.message && payload.sessionToken) setEquipmentExplanation({ actionId, offerToken, sessionToken: payload.sessionToken, message: payload.message, options: payload.options ?? [] });
      else if (payload.message) setMessages((current) => [...current, newMessage("assistant", payload.message!)]);
    } finally {
      setEquipmentExplanationPendingActionId(null);
    }
  }

  async function answerEquipmentExplanation(operation: "ACCEPT" | "DECLINE") {
    const current = equipmentExplanation;
    if (!current || equipmentExplanationPendingActionId) return;
    setEquipmentExplanationPendingActionId(current.actionId);
    try {
      const response = await fetch("/api/cars/equipment-explanation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conversationId.current, offerToken: current.offerToken, actionId: current.actionId, operation, sessionToken: current.sessionToken }) });
      const payload = await response.json() as { message?: string | null; notice?: string | null; sessionToken?: string; items?: readonly { label: string; explanation: string; caveat: string }[] };
      const sections = [payload.notice, payload.message, ...(payload.items ?? []).map((item) => `${item.label}: ${item.explanation} ${item.caveat}`)].filter((value): value is string => Boolean(value));
      if (sections.length) setMessages((messages) => [...messages, newMessage("assistant", sections.join("\n\n"))]);
      setEquipmentExplanation(null);
    } finally {
      setEquipmentExplanationPendingActionId(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
            Expiya Cars
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {isTurkish ? "Doğru arabayı birlikte bulalım." : "Let's find the right car together."}
          </h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-300">
            {isTurkish
              ? "Sizi dinleyip seçenekleri birlikte tartacağım; hazır olduğumuzda net bir karar çıkaracağız."
              : "I will listen, weigh the tradeoffs with you, and reach a clear decision when we are ready."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{pilotUsername ? `Pilot kullanıcı: ${pilotUsername}. Görüşme tamamlandığında arşivlenir.` : "Görüşme yalnızca bu sekme açıkken tarayıcınızda tutulur."}</span>
            <button type="button" disabled={isLoading} onClick={() => void clearConversation()} className="font-semibold underline underline-offset-4 disabled:opacity-50">Görüşmeyi sil</button>
          </div>
          {archiveError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{archiveError}</p> : null}
        </div>

        <section className="mt-10 flex h-[min(70dvh,48rem)] min-h-[30rem] flex-col rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6" aria-label="Car decision conversation">
          <div onScroll={(event) => { const element = event.currentTarget; shouldFollowConversationRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
           <div className="flex min-h-full flex-col justify-end space-y-4">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {isTurkish
                  ? "Nasıl bir araç düşündüğünüzü anlatın veya karşılaştırmak istediğiniz araçları yazın."
                  : "Describe the car you need, or name the cars you want to compare."}
              </div>
            )}
            {messages.map((message) => {
              const assistantSegments = message.role === "assistant"
                ? splitAssistantMessageSegments(message.content)
                : [message.content];
              const visibleSegmentCount = assistantReveal?.messageId === message.id
                ? assistantReveal.visibleSegments
                : assistantSegments.length;
              const fullyRevealed = visibleSegmentCount >= assistantSegments.length;

              return (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`${message.recommendations?.length || message.v2Cards?.length ? "w-full" : "max-w-[88%]"} leading-6 ${
                  message.role === "user"
                    ? "rounded-2xl bg-neutral-900 px-4 py-3 text-white dark:bg-neutral-100 dark:text-neutral-950"
                    : "space-y-2 text-neutral-800 dark:text-neutral-100"
                }`}>
                  {message.role === "assistant"
                    ? assistantSegments.slice(0, visibleSegmentCount).map((segment, index) => (
                      <div
                        key={`${message.id}-segment-${index}`}
                        className="w-fit max-w-full rounded-2xl bg-neutral-100 px-4 py-3 whitespace-pre-wrap dark:bg-neutral-800"
                      >
                        {segment}
                      </div>
                    ))
                    : <span className="whitespace-pre-wrap">{message.content}</span>}
                  {message.role === "user" && message.id === lastUserMessageId && (
                    <button type="button" onClick={() => editLastUserMessage(message)} disabled={isLoading} className="mt-2 block text-xs font-medium text-neutral-300 underline underline-offset-2 disabled:opacity-50 dark:text-neutral-600">Düzelt</button>
                  )}
                  {fullyRevealed && message.role === "assistant" && message.v2CandidateSummary && (
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400" aria-label="Kalan araç seçeneği sayısı">{message.v2CandidateSummary.label}</p>
                  )}
                  {fullyRevealed && message.recommendations && message.recommendations.length > 0
                    && shouldRenderRecommendationCards("RECOMMENDATIONS", conversation?.offerPurpose) && (
                    <div className="mt-4 grid gap-4 text-neutral-900 dark:text-neutral-100 sm:grid-cols-2 lg:grid-cols-3">
                      {message.recommendations.map((recommendation, index) => (
                        <CarCard key={recommendation.car.id} recommendedCar={recommendation} locale={locale} position={index + 1} />
                      ))}
                    </div>
                  )}
                  {fullyRevealed && message.v2Cards && message.v2Cards.length > 0 && (
                    <div className="mt-4 grid gap-4 text-neutral-900 dark:text-neutral-100 sm:grid-cols-2 lg:grid-cols-3">
                      {message.v2Cards.map((card, index) => { const action = message.equipmentExplanationActions?.find((item) => item.exactVariantId === card.exactVariantId); return <V2AuthorizedCarCard key={card.exactVariantId} card={card} position={index + 1} equipmentAction={action} onEquipmentExplanation={action ? (actionId) => void openEquipmentExplanation(actionId, message.v2OfferToken) : undefined} equipmentExplanationPending={equipmentExplanationPendingActionId === action?.actionId} />; })}
                    </div>
                  )}
                  {fullyRevealed && message.role === "assistant" && message.v2Options && message.v2Options.length > 0 && (
                    <div className="mt-3">
                    {message.v2OptionSelection?.mode === "MULTIPLE" && <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">Çoklu seçim yapılabilir.</p>}
                    <div role="group" aria-label={message.v2OptionSelection?.mode === "MULTIPLE" ? "Bir veya daha fazla seçenek seçin" : "Bir seçenek seçin"} className="flex flex-wrap items-center gap-2">
                      {message.v2Options.map((option) => {
                        const multiple = message.v2OptionSelection?.mode === "MULTIPLE";
                        const selected = v2MultiSelections[message.id]?.includes(option.id) ?? false;
                        const selectionLimitReached = multiple && (v2MultiSelections[message.id]?.length ?? 0) >= message.v2OptionSelection!.maximumSelections && !selected;
                        return <button key={option.id} type="button" aria-pressed={multiple ? selected : undefined} onClick={() => multiple ? toggleV2MultiOption(message.id, option.id, message.v2OptionSelection!.maximumSelections) : submitContent(option.label, option.id)} disabled={isLoading || message !== messages[messages.length - 1] || selectionLimitReached} className={`max-w-xs rounded-xl border px-3 py-2 text-left text-sm disabled:opacity-50 ${selected ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 bg-white text-neutral-800 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"}`}><span className="block font-medium">{option.label}</span>{option.description && <span className={`mt-0.5 block text-xs ${selected ? "text-neutral-200 dark:text-neutral-600" : "text-neutral-500 dark:text-neutral-400"}`}>{option.description}</span>}</button>;
                      })}
                    </div>
                    </div>
                  )}
                  {fullyRevealed && message.role === "assistant" && shouldShowVehicleQuickReplies(
                    messages.slice(0, messages.indexOf(message)).reverse().find((item) => item.role === "user")?.content ?? "",
                    message.quickReplies,
                  ) && message.quickReplies && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.quickReplies.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => submitContent(
                            option,
                            message.optionSet?.options.find((item) => item.label === option)?.id,
                          )}
                          disabled={isLoading || message !== messages[messages.length - 1]}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-400"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  {fullyRevealed && message.role === "assistant" && message.discriminatorChoices && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Karar seçenekleri">
                      {message.discriminatorChoices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => submitDiscriminatorChoice(choice)}
                          disabled={isLoading || message !== messages[messages.length - 1]}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-400"
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {fullyRevealed && message.role === "assistant" && message === messages[messages.length - 1]
                    && isRecommendationOfferAwaitingTerms && (
                    <div className="mt-4 rounded-2xl border border-neutral-300 bg-white p-4 text-sm text-neutral-800 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100">
                      <p className="font-semibold">Aracı göstermeden önce</p>
                      <p className="mt-2 leading-6">Öneri; beyan ettiğiniz tercihler ile tarihli katalog kaynaklarının yapay zekâ destekli ve kural tabanlı değerlendirilmesidir. Satış teklifi, garanti veya ekspertiz değildir.</p>
                      <label className="mt-4 flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={recommendationTermsChecked}
                          onChange={(event) => setRecommendationTermsChecked(event.target.checked)}
                          className="mt-1 h-4 w-4 accent-neutral-950"
                        />
                        <span><Link href="/arac-oneri-kosullari" className="font-semibold underline underline-offset-4">Araç Önerisi ve Katalog Kullanım Koşulları’nı</Link> ({RECOMMENDATION_TERMS_VERSION}) okudum ve kabul ediyorum.</span>
                      </label>
                      <button
                        type="button"
                        onClick={acceptRecommendationTermsAndReveal}
                        disabled={!recommendationTermsChecked || isLoading}
                        className="mt-4 w-full rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600 dark:bg-sky-400 dark:text-neutral-950 dark:hover:bg-sky-300 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400"
                      >
                        Koşulları kabul et ve aracı göster
                      </button>
                      <button
                        type="button"
                        onClick={() => submitContent("Şimdilik gösterme.")}
                        disabled={isLoading}
                        className="mt-2 w-full rounded-xl border border-neutral-300 px-5 py-3 font-semibold disabled:opacity-40 dark:border-neutral-600"
                      >
                        Kabul etmeden sohbete devam et
                      </button>
                      <p className="mt-3 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Kabul etmezseniz araç kartı gösterilmez. KVKK aydınlatması ve varsa diğer izinler bu kabulden ayrıdır.</p>
                    </div>
                  )}
                </div>
              </div>
              );
            })}
            {equipmentExplanation && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                  <p>{equipmentExplanation.message}</p>
                  <div role="group" aria-label="Araç donanım anlatımı" className="mt-3 flex flex-wrap gap-2">
                    {equipmentExplanation.options.map((option) => <button key={option.id} type="button" onClick={() => void answerEquipmentExplanation(option.id)} disabled={Boolean(equipmentExplanationPendingActionId)} className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-900">{option.label}</button>)}
                  </div>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-neutral-100 px-4 py-4 dark:bg-neutral-800" role="status" aria-label="Yanıt hazırlanıyor">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"
                      style={{ animationDelay: `${index * 140}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={conversationEndRef} aria-hidden="true" />
           </div>
          </div>

          <form onSubmit={submit} className="mt-4 shrink-0 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            {editingMessageId && <div className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300"><span>Son mesajınızı düzeltiyorsunuz.</span><button type="button" className="font-semibold underline underline-offset-2" onClick={() => { setEditingMessageId(null); setDraft(""); }}>Vazgeç</button></div>}
            <label htmlFor="cars-reply" className="sr-only">{isTurkish ? "Mesajınız" : "Your message"}</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                ref={draftRef}
                id="cars-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                disabled={inputIsDecisionLocked}
                placeholder={isRecommendationOfferAwaitingTerms ? "Araç kartını görmek için yukarıdaki koşulları inceleyin." : isFinalDiscriminatorRequired ? "Devam etmek için yukarıdaki seçeneklerden birini seçin." : isTurkish ? "Bir şey anlatın, sorun veya önceki bilginizi düzeltin…" : "Tell me something, ask, or correct an earlier detail…"}
                rows={2}
                className="min-h-14 flex-1 resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-400"
              />
              <button
                type="submit"
                disabled={isLoading || inputIsDecisionLocked || !draft.trim()}
                className="rounded-2xl bg-neutral-950 px-6 py-3 font-semibold text-white! transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500! dark:bg-neutral-800 dark:text-white! dark:hover:bg-neutral-700 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400!"
              >
                {isTurkish ? "Gönder" : "Send"}
              </button>
            </div>
          </form>
        </section>

      </div>
    </main>
  );
}
