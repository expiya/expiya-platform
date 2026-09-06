"use client";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "@/features/electronics/architectureBaseline";
import type { ElectronicsRuntimeOutcome } from "@/features/electronics/runtimeContracts";
import { ELECTRONICS_EXPERIENCE } from "@/features/xpy/visualPacks";
import { XpyDecisionCard } from "@/components/xpy/XpyDecisionCard";
import { ELECTRONICS_STAGE_ONE_PRESENTATION, projectElectronicsSet } from "@/features/electronics/presentation/stageOneAdapter";
import {
  XpyAssistantBubble,
  XpyBudgetBand,
  XpyChoiceGroup,
  XpyComposer,
  XpyHeader,
  XpyLoading,
  XpyStageOneFrame,
  XpyTranscript,
  XpyUserBubble,
} from "@/components/xpy/XpyPresentation";
type PublicReply = ElectronicsRuntimeOutcome & {
  readonly conversationId: string;
  readonly revision: number;
  readonly replayed?: boolean;
};
type Entry = {
  readonly id: string;
  readonly user?: string;
  readonly reply: PublicReply;
};
const request = async (body: unknown) => {
  const response = await fetch("/api/electronics/conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    response,
    body: (await response.json()) as PublicReply & { message?: string },
  };
};
export default function ElectronicsConversation({
  categoryId,
  categoryLabel,
  embedded = false,
}: {
  readonly categoryId: ElectronicsCategoryId;
  readonly categoryLabel: string;
  readonly embedded?: boolean;
}) {
  const [session, setSession] = useState<{
    conversationId: string;
    revision: number;
  }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState<{ message: string }>();
  const [choice, setChoice] = useState<string>();
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const latest = entries.at(-1)?.reply;
  useEffect(() => {
    let cancelled = false;
    const conversationId = crypto.randomUUID();
    void request({
      action: "CREATE",
      conversationId,
      messageId: crypto.randomUUID(),
      categoryId,
    })
      .then(({ response, body }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error(body.message);
        setSession({ conversationId, revision: body.revision });
        setEntries([{ id: crypto.randomUUID(), reply: body }]);
      })
      .catch((error) => {
        if (!cancelled)
          setEntries([
            {
              id: crypto.randomUUID(),
              reply: {
                kind: "FAILED_CLOSED",
                message:
                  error instanceof Error
                    ? error.message
                    : "Görüşme başlatılamadı.",
                conversationId,
                revision: 0,
              },
            },
          ]);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, busy]);
  async function send(message = draft, selected?: string) {
    if (!session || busy || (!message.trim() && !selected)) return;
    const text =
      selected === "IMPORTANT"
        ? "Önemli"
        : selected === "NOT_IMPORTANT"
          ? "Önemli değil"
          : selected === "UNKNOWN"
            ? "Henüz bilmiyorum"
            : message.trim();
    const payload = {
      action: "TURN",
      conversationId: session.conversationId,
      messageId: crypto.randomUUID(),
      expectedRevision: session.revision,
      message: text,
      ...(selected && latest?.questionKey
        ? { choice: { questionKey: latest.questionKey, values: [selected] } }
        : {}),
    };
    setBusy(true);
    setRetry(undefined);
    try {
      const { response, body } = await request(payload);
      if (!response.ok) throw new Error(body.message);
      setEntries((current) => [
        ...current,
        { id: crypto.randomUUID(), user: text, reply: body },
      ]);
      setSession((current) =>
        current ? { ...current, revision: body.revision } : current,
      );
      setDraft("");
      setChoice(undefined);
    } catch (error) {
      setRetry({ message: text });
      setEntries((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          user: text,
          reply: {
            kind: "FAILED_CLOSED",
            message:
              error instanceof Error ? error.message : "Mesaj gönderilemedi.",
            conversationId: session.conversationId,
            revision: session.revision,
          },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }
  async function toggleBudget() {
    if (busy || !session) return;
    if (budgetEnabled) {
      await send("Bütçe filtresini kapat");
      setBudgetEnabled(false);
      return;
    }
    const amount = Number(budgetAmount.replace(/\D/gu, ""));
    if (!amount) return;
    await send(`Bütçeyi karar filtresi yap, ${amount} TL`);
    setBudgetEnabled(true);
  }
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };
  return (
    <XpyStageOneFrame adapter={ELECTRONICS_EXPERIENCE} embedded={embedded}>
      <XpyHeader
        title={categoryLabel}
        description="İhtiyaçlarınızı tek tek konuşalım; bilinmeyen bilgileri tahmin etmeden seçenekleri netleştirelim."
        status={
          latest?.budgetEligibility === "BUDGET_ELIGIBILITY_UNKNOWN" ? (
            <p className="mt-2 text-xs text-amber-700">
              Güncel ve doğrulanmış fiyat bulunmadığı için bütçe uygunluğu bilinmiyor.
            </p>
          ) : undefined
        }
      />
      {!entries.some((entry) => entry.user) && (
        <fieldset className="border-b border-stone-200 bg-white/60 px-4 py-4 dark:border-stone-800 dark:bg-stone-950/35 sm:px-6">
          <legend className="text-sm font-semibold">Hangi elektronik ürünü birlikte seçelim?</legend>
          <details className="group mt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-stone-700 dark:bg-stone-900">
              <span>{categoryLabel}</span>
              <span className="text-xs text-emerald-700 group-open:hidden dark:text-emerald-300">Değiştir</span>
              <span className="hidden text-xs text-stone-500 group-open:inline">Listeyi kapat</span>
            </summary>
            <nav aria-label="Elektronik kategorileri" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ELECTRONICS_CATEGORY_REGISTRY.map((category) => (
                <Link
                  key={category.categoryId}
                  href={`/electronics?category=${category.categoryId}#asama-1`}
                  aria-current={category.categoryId === categoryId ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-emerald-600 ${category.categoryId === categoryId ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 dark:bg-emerald-950 dark:text-emerald-100" : "border-stone-200 bg-white text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"}`}
                >
                  {category.publicLabelTr}
                </Link>
              ))}
            </nav>
          </details>
        </fieldset>
      )}
      <XpyBudgetBand
        id="electronics-budget"
        enabled={budgetEnabled}
        disabled={busy}
        onToggle={() => void toggleBudget()}
        description="Yalnız güncel ve doğrulanmış fiyat varsa eleme yapar; bilinmeyen fiyat ürünü elemez."
      >
        {!budgetEnabled && (
          <div className="mt-3">
            <label htmlFor="electronics-budget-amount" className="sr-only">
              Azami bütçe
            </label>
            <input
              id="electronics-budget-amount"
              inputMode="numeric"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              placeholder="Azami bütçe (TL)"
              className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm sm:max-w-xs"
            />
          </div>
        )}
      </XpyBudgetBand>
      <XpyTranscript endRef={endRef}>
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-2">
            {entry.user && <XpyUserBubble>{entry.user}</XpyUserBubble>}
            <div className="max-w-[92%] space-y-3 sm:max-w-[84%]">
              <XpyAssistantBubble>{entry.reply.message}</XpyAssistantBubble>
              {entry.reply.choices &&
                entry.reply.kind === "ASK" &&
                entry === entries.at(-1) && (
                  <XpyChoiceGroup
                    options={entry.reply.choices}
                    selected={choice ? [choice] : []}
                    multiple={false}
                    disabled={busy}
                    onToggle={(option) => setChoice(option.value)}
                    onSubmit={() => choice && void send("", choice)}
                  />
                )}{" "}
              {entry.reply.candidateSummaries && <XpyDecisionCard card={projectElectronicsSet(categoryId, entry.reply)}/>}
              {entry.reply.card && <XpyDecisionCard card={ELECTRONICS_STAGE_ONE_PRESENTATION.project(entry.reply.card)} />}
            </div>
          </div>
        ))}
        {busy && <XpyLoading />}
      </XpyTranscript>
      <XpyComposer
        id="electronics-message"
        value={retry?.message ?? draft}
        disabled={busy || !session}
        retry={Boolean(retry)}
        placeholder="Sorunuzu veya ihtiyacınızı yazın…"
        onChange={setDraft}
        onKeyDown={keyDown}
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void send(retry?.message ?? draft);
        }}
      />
    </XpyStageOneFrame>
  );
}
