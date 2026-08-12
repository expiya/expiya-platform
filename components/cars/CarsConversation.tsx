"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { CarCard } from "@/components/cars/CarCard";
import type {
  CarsConversationMessage,
  CarsConversationResponse,
  PersistedCarsConversation,
} from "@/types/carsConversation";

interface CarsConversationProps {
  readonly initialQuery: string;
}

function newMessage(role: CarsConversationMessage["role"], content: string) {
  return { id: crypto.randomUUID(), role, content } as const;
}

const storageKey = "expiya:cars-conversation:v1";

function readPersistedConversation(): PersistedCarsConversation | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value !== "object") return null;
    const candidate = value as Partial<PersistedCarsConversation>;
    if (
      candidate.version !== 1
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

  async function continueConversation(nextMessages: CarsConversationMessage[]) {
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
      const content = payload.message ?? "I couldn't process that answer. Please try again.";

      const assistantMessage = {
        ...newMessage("assistant", content),
        recommendations: response.ok && "kind" in payload && payload.kind === "RECOMMENDATIONS"
          ? payload.recommendations
          : undefined,
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        newMessage("assistant", "I couldn't reach the decision service. Please try again."),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

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
      version: 1,
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
  }, [initialQuery, isRestored]);

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

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Expiya Cars
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Let&apos;s find the right car together.
          </h1>
          <p className="mt-4 text-neutral-600">
            Tell me what you need, answer one question at a time, and update any preference whenever you like.
          </p>
        </div>

        <section className="mt-10 max-w-3xl rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Car decision conversation">
          <div className="min-h-64 space-y-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-neutral-100 p-4 text-neutral-700">
                Describe the car you need, or name the cars you want to compare.
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
                        <CarCard key={recommendation.car.id} recommendedCar={recommendation} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500">
                  Reviewing the full conversation…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={submit} className="mt-6 border-t border-neutral-200 pt-5">
            <label htmlFor="cars-reply" className="sr-only">Your answer</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                id="cars-reply"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a preference, answer the question, or correct something…"
                rows={2}
                className="min-h-14 flex-1 resize-none rounded-2xl border border-neutral-300 px-4 py-3 outline-none focus:border-neutral-900"
              />
              <button
                type="submit"
                disabled={isLoading || !draft.trim()}
                className="rounded-2xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                Send
              </button>
            </div>
          </form>
        </section>

      </div>
    </main>
  );
}
