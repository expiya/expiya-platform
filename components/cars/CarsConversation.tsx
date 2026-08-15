"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CarCard } from "@/components/cars/CarCard";
import {
  hasActiveFinalDiscriminator,
  shouldRenderRecommendationCards,
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
}

function newMessage(role: CarsConversationMessage["role"], content: string) {
  return { id: crypto.randomUUID(), role, content } as const;
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

export function CarsConversation({ initialQuery }: CarsConversationProps) {
  const router = useRouter();
  const conversationId = useRef<string>("");
  const initialRequestStarted = useRef(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<CarsConversationMessage[]>([]);
  const [conversation, setConversation] = useState<CarsConversationTrace | undefined>();
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
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
  ) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/cars/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current,
          messages: nextMessages,
          choiceId,
          selectedOptionId,
          conversation: conversationRef.current,
        }),
      });
      const payload = await response.json() as CarsConversationResponse | { message?: string };
      const content = payload.message ?? (isTurkish
        ? "Cevabınızı işleyemedim. Lütfen yeniden deneyin."
        : "I couldn't process that answer. Please try again.");

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
        recommendationIds: response.ok && "kind" in payload && payload.kind === "RECOMMENDATIONS"
          ? payload.recommendations.map((item) => item.car.id)
          : undefined,
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        newMessage("assistant", isTurkish
          ? "Karar servisine şu anda ulaşamıyorum. Konuşmanız korundu; lütfen yeniden deneyin."
          : "I couldn't reach the decision service. Your conversation is safe; please try again."),
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isTurkish]);

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

    const userMessage = newMessage("user", content);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    void continueConversation(nextMessages);
  }

  function submitContent(content: string, selectedOptionId?: string) {
    if (!content.trim() || isLoading) return;
    const userMessage = newMessage("user", content.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    void continueConversation(nextMessages, undefined, selectedOptionId);
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

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitContent(draft);
  }

  function clearConversation() {
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(legacyStorageKey);
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
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
            <span>Görüşme yalnızca bu sekme açıkken tarayıcınızda tutulur.</span>
            <button type="button" onClick={clearConversation} className="font-semibold underline underline-offset-4">Görüşmeyi sil</button>
          </div>
        </div>

        <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-6" aria-label="Car decision conversation">
          <div className="min-h-64 space-y-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                {isTurkish
                  ? "Nasıl bir araç düşündüğünüzü anlatın veya karşılaştırmak istediğiniz araçları yazın."
                  : "Describe the car you need, or name the cars you want to compare."}
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`${message.recommendations?.length ? "w-full" : "max-w-[88%]"} rounded-2xl px-4 py-3 leading-6 ${
                  message.role === "user"
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950"
                    : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                }`}>
                  <span className="whitespace-pre-wrap">{message.content}</span>
                  {message.recommendations && message.recommendations.length > 0
                    && shouldRenderRecommendationCards("RECOMMENDATIONS", conversation?.offerPurpose) && (
                    <div className="mt-4 grid gap-4 text-neutral-900 dark:text-neutral-100 sm:grid-cols-2 lg:grid-cols-3">
                      {message.recommendations.map((recommendation) => (
                        <CarCard key={recommendation.car.id} recommendedCar={recommendation} locale={locale} />
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && shouldShowVehicleQuickReplies(
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
                  {message.role === "assistant" && message.discriminatorChoices && (
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
                </div>
              </div>
            ))}
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

          <form onSubmit={submit} className="mt-6 border-t border-neutral-200 pt-5 dark:border-neutral-700">
            <label htmlFor="cars-reply" className="sr-only">{isTurkish ? "Mesajınız" : "Your message"}</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                id="cars-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                disabled={isFinalDiscriminatorRequired}
                placeholder={isFinalDiscriminatorRequired ? "Devam etmek için yukarıdaki seçeneklerden birini seçin." : isTurkish ? "Bir şey anlatın, sorun veya önceki bilginizi düzeltin…" : "Tell me something, ask, or correct an earlier detail…"}
                rows={2}
                className="min-h-14 flex-1 resize-none rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none focus:border-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:focus:border-neutral-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-400"
              />
              <button
                type="submit"
                disabled={isLoading || isFinalDiscriminatorRequired || !draft.trim()}
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
