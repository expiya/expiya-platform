"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { CarCard } from "@/components/cars/CarCard";
import type {
  CarsConversationMessage,
  CarsConversationResponse,
  PersistedCarsConversation,
} from "@/types/carsConversation";

interface CarsConversationProps {
  readonly initialQuery: string;
}

interface RecommendationActionsProps {
  readonly message: CarsConversationMessage;
  readonly onUpdate: (patch: Partial<CarsConversationMessage>) => void;
}

function RecommendationActions({ message, onUpdate }: RecommendationActionsProps) {
  const [showLocation, setShowLocation] = useState(false);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");

  return (
    <div className="mt-5 space-y-4 border-t border-neutral-200 pt-4">
      <div>
        <p className="text-sm font-semibold">Bu karar size yardımcı oldu mu?</p>
        {message.satisfaction ? (
          <p className="mt-2 text-sm text-neutral-600">
            {message.satisfaction === "HELPFUL" ? "Bunu duymak güzel. Geri bildiriminiz kaydedildi." : "Anladım. Neyi beğenmediğinizi yazın; seçenekleri yeniden değerlendireyim."}
          </p>
        ) : (
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => onUpdate({ satisfaction: "HELPFUL" })} className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:border-black">Evet</button>
            <button type="button" onClick={() => onUpdate({ satisfaction: "NOT_HELPFUL" })} className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:border-black">Hayır</button>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-neutral-900 p-4 text-white">
        <p className="font-semibold">Bu aracı Türkiye’nin güvenilir satıcılarında araştırmamı ister misiniz?</p>
        <p className="mt-1 text-sm text-neutral-300">Konumunuza göre satıcı, fiyat teklifi ve test sürüşü araştırması v0.2’de açılacak.</p>
        {message.sellerResearchRequest ? (
          <p className="mt-3 text-sm font-medium">Talep kaydedildi: {message.sellerResearchRequest.province} / {message.sellerResearchRequest.district}</p>
        ) : showLocation ? (
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              if (!province.trim() || !district.trim()) return;
              onUpdate({ sellerResearchRequest: { province: province.trim(), district: district.trim(), status: "PLANNED_V0_2" } });
            }}
          >
            <label className="sr-only" htmlFor={`province-${message.id}`}>İl</label>
            <input id={`province-${message.id}`} value={province} onChange={(event) => setProvince(event.target.value)} placeholder="İl" className="rounded-xl bg-white px-3 py-2 text-sm text-black" />
            <label className="sr-only" htmlFor={`district-${message.id}`}>İlçe</label>
            <input id={`district-${message.id}`} value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="İlçe" className="rounded-xl bg-white px-3 py-2 text-sm text-black" />
            <button type="submit" disabled={!province.trim() || !district.trim()} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">Kaydet</button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowLocation(true)} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Evet, konumumu paylaşayım</button>
        )}
      </div>
    </div>
  );
}

function newMessage(role: CarsConversationMessage["role"], content: string) {
  return { id: crypto.randomUUID(), role, content } as const;
}

const storageKey = "expiya:cars-conversation:v4";

function readPersistedConversation(): PersistedCarsConversation | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<PersistedCarsConversation>;
    if (
      candidate.version !== 4
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
  const conversationId = useRef<string>("");
  const initialRequestStarted = useRef(false);
  const [messages, setMessages] = useState<CarsConversationMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const locale = "tr" as const;
  const isTurkish = true;

  const continueConversation = useCallback(async (nextMessages: CarsConversationMessage[]) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/cars/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId.current,
          messages: nextMessages,
        }),
      });
      const payload = await response.json() as CarsConversationResponse | { message?: string };
      const content = payload.message ?? (isTurkish
        ? "Cevabınızı işleyemedim. Lütfen yeniden deneyin."
        : "I couldn't process that answer. Please try again.");

      const assistantMessage = {
        ...newMessage("assistant", content),
        quickReplies: response.ok && "kind" in payload && payload.kind === "QUESTION"
          ? payload.options
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
        setIsRestored(true);
      });
    } else {
      conversationId.current = crypto.randomUUID();
      queueMicrotask(() => setIsRestored(true));
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!isRestored || !conversationId.current) return;
    localStorage.setItem(storageKey, JSON.stringify({
      version: 4,
      conversationId: conversationId.current,
      messages,
    } satisfies PersistedCarsConversation));
  }, [isRestored, messages]);

  useEffect(() => {
    if (!isRestored || !initialQuery.trim() || initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    const firstMessage = newMessage("user", initialQuery.trim());
    setMessages([firstMessage]);
    void continueConversation([firstMessage]);
  }, [continueConversation, initialQuery, isRestored]);

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

  function submitContent(content: string) {
    if (!content.trim() || isLoading) return;
    const userMessage = newMessage("user", content.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    void continueConversation(nextMessages);
  }

  function updateMessage(messageId: string, patch: Partial<CarsConversationMessage>) {
    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, ...patch } : message
    )));
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submitContent(draft);
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Expiya Cars
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {isTurkish ? "Doğru arabayı birlikte bulalım." : "Let's find the right car together."}
          </h1>
          <p className="mt-4 text-neutral-600">
            {isTurkish
              ? "Sizi dinleyip seçenekleri birlikte tartacağım; hazır olduğumuzda net bir karar çıkaracağız."
              : "I will listen, weigh the tradeoffs with you, and reach a clear decision when we are ready."}
          </p>
        </div>

        <section className="mt-10 max-w-3xl rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Car decision conversation">
          <div className="min-h-64 space-y-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-700">
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
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 leading-6 ${
                  message.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-800"
                }`}>
                  {message.content}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="mt-4 grid gap-4 text-neutral-900">
                      {message.recommendations.map((recommendation) => (
                        <CarCard key={recommendation.car.id} recommendedCar={recommendation} locale={locale} />
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && message.quickReplies && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.quickReplies.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => submitContent(option)}
                          disabled={isLoading || message !== messages[messages.length - 1]}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && message.recommendations && message.recommendations.length > 0 && (
                    <RecommendationActions message={message} onUpdate={(patch) => updateMessage(message.id, patch)} />
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-neutral-100 px-4 py-4" role="status" aria-label="Yanıt hazırlanıyor">
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
          </div>

          <form onSubmit={submit} className="mt-6 border-t border-neutral-200 pt-5">
            <label htmlFor="cars-reply" className="sr-only">{isTurkish ? "Mesajınız" : "Your message"}</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                id="cars-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleDraftKeyDown}
                placeholder={isTurkish ? "Bir şey anlatın, sorun veya önceki bilginizi düzeltin…" : "Tell me something, ask, or correct an earlier detail…"}
                rows={2}
                className="min-h-14 flex-1 resize-none rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={isLoading || !draft.trim()}
                className="rounded-2xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
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
