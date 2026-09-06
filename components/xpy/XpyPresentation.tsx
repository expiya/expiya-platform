"use client";

import type {
  FormEventHandler,
  KeyboardEventHandler,
  ReactNode,
  Ref,
  UIEventHandler,
} from "react";
import type { XpyChoiceOption } from "@/features/xpy/contracts";
import type { XpyExperienceAdapter } from "@/features/xpy/experience";
import { XpyStageNavigation } from "./XpyStageTemplates";

export function XpyStageOneFrame({
  children,
  onInteraction,
  adapter,
  embedded = false,
}: {
  readonly children: ReactNode;
  readonly onInteraction?: () => void;
  readonly adapter: XpyExperienceAdapter;
  readonly embedded?: boolean;
}) {
  const visualPack = adapter.visualPack;
  const attributes = {
    "data-xpy-experience": visualPack.experienceVersion,
    "data-xpy-visual-pack": visualPack.visualPackId,
    "data-xpy-scene": visualPack.sceneConcept,
    "data-xpy-stage": "STAGE_1_DECISION",
  } as const;
  if (embedded)
    return (
      <section
        onClickCapture={onInteraction}
        {...attributes}
        className="xpy-light flex h-[min(48rem,82dvh)] min-h-[36rem] min-w-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f8f8f6] text-stone-950 shadow-[0_18px_55px_rgba(28,25,23,.09)]"
      >
        {children}
      </section>
    );
  return (
    <main
      onClickCapture={onInteraction}
      {...attributes}
      className="xpy-light min-h-screen bg-[#f7f7f5] text-stone-950"
    >
      <XpyStageNavigation adapter={adapter} current="STAGE_1_DECISION" />
      <div className="px-3 py-4 sm:px-5 sm:py-8">
        <section className="mx-auto flex h-[calc(100dvh-6rem)] min-h-[32rem] max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f8f8f6] shadow-[0_18px_55px_rgba(28,25,23,.09)] sm:h-[82vh] sm:min-h-0">
          {children}
        </section>
      </div>
    </main>
  );
}

export function XpyHeader({
  title,
  description,
  status,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly status?: ReactNode;
  readonly action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85 sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm"
            aria-hidden="true"
          >
            E
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              Aşama 1 · XPY karar görüşmesi
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-xl text-sm text-stone-500 dark:text-stone-400">
          {description}
        </p>
        {status}
      </div>
      {action}
    </header>
  );
}

export function XpyBudgetBand({
  id,
  description,
  enabled,
  disabled,
  children,
  status,
  onToggle,
}: {
  readonly id: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly disabled?: boolean;
  readonly children?: ReactNode;
  readonly status?: ReactNode;
  readonly onToggle: () => void;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-b border-stone-200 bg-white/60 px-4 py-3 dark:border-stone-800 dark:bg-stone-950/35 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id={id}
            className="text-sm font-semibold text-stone-800 dark:text-stone-200"
          >
            Bütçeyi karar filtresi yap
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Bütçeyi karar filtresi olarak kullan"
          disabled={disabled}
          onClick={onToggle}
          className={`relative h-11 w-16 overflow-hidden rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40 ${enabled ? "border-emerald-500 bg-emerald-600" : "border-neutral-600 bg-neutral-800"}`}
        >
          <span
            aria-hidden="true"
            className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${enabled ? "translate-x-5" : "translate-x-0"}`}
          />
        </button>
      </div>
      {children}
      {status}
    </section>
  );
}

export function XpyTranscript({
  children,
  empty,
  endRef,
  onScroll,
}: {
  readonly children: ReactNode;
  readonly empty?: ReactNode;
  readonly endRef?: Ref<HTMLDivElement>;
  readonly onScroll?: UIEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      onScroll={onScroll}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top,#f5f1e8_0,transparent_42%)] px-3 py-4 dark:bg-[radial-gradient(circle_at_top,#292524_0,transparent_45%)] sm:px-6"
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {empty}
      {children}
      <div ref={endRef} />
    </div>
  );
}

export function XpyUserBubble({ children }: { readonly children: ReactNode }) {
  return (
    <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-emerald-100 px-3.5 py-2.5 text-[15px] text-emerald-950 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-800 dark:text-white dark:ring-emerald-700 sm:max-w-[78%]">
      {children}
    </div>
  );
}
export function XpyAssistantBubble({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] text-stone-800 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700">
      {children}
    </div>
  );
}
export function XpyMessageBubble({
  role,
  wide,
  children,
}: {
  readonly role: "user" | "assistant";
  readonly wide?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div
      className={`${wide ? "w-full" : "max-w-[88%] sm:max-w-[82%]"} rounded-2xl px-4 py-3 leading-6 shadow-sm ring-1 ${role === "user" ? "ml-auto rounded-br-md bg-emerald-100 text-emerald-950 ring-emerald-200 dark:bg-emerald-800 dark:text-white dark:ring-emerald-700" : "rounded-bl-md bg-white text-stone-800 ring-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700"}`}
    >
      {children}
    </div>
  );
}

export function XpyLoading() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700"
      role="status"
      aria-label="Yanıt hazırlanıyor"
    >
      {[0, 1, 2].map((item) => (
        <span
          key={item}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 motion-reduce:animate-none"
          style={{ animationDelay: `${item * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function XpyChoiceGroup({
  options,
  selected,
  multiple,
  disabled,
  onToggle,
  onSubmit,
}: {
  readonly options: readonly XpyChoiceOption[];
  readonly selected: readonly string[];
  readonly multiple: boolean;
  readonly disabled?: boolean;
  readonly onToggle: (option: XpyChoiceOption) => void;
  readonly onSubmit: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-stone-200 bg-white/90 p-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-900"
      role="group"
      aria-label="Yanıt seçenekleri"
    >
      <div className="grid gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onToggle(option)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 dark:bg-emerald-950 dark:text-emerald-100" : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"}`}
            >
              <span className="block font-semibold">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs leading-5 text-stone-500 dark:text-stone-400">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled || !selected.length}
        onClick={onSubmit}
        className="mt-2.5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {multiple && selected.length > 1
          ? `${selected.length} seçimi gönder`
          : "Seçimi gönder"}
      </button>
    </div>
  );
}

export function XpyComposer({
  id,
  value,
  disabled,
  retry,
  placeholder = "Mesajını yaz…",
  before,
  inputRef,
  onChange,
  onKeyDown,
  onSubmit,
}: {
  readonly id: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly retry?: boolean;
  readonly placeholder?: string;
  readonly before?: ReactNode;
  readonly inputRef?: Ref<HTMLTextAreaElement>;
  readonly onChange: (value: string) => void;
  readonly onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  readonly onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-stone-200 bg-white/95 p-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:p-4"
    >
      {before}
      <label htmlFor={id} className="sr-only">
        Mesajın
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          id={id}
          rows={1}
          value={value}
          maxLength={4000}
          disabled={disabled || retry}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-[15px] outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          aria-label={retry ? "Aynı mesajı yeniden dene" : "Mesajı gönder"}
          disabled={disabled || (!value.trim() && !retry)}
          className="flex min-h-12 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40"
        >
          {retry ? "Yeniden dene" : "Gönder"}
          <span className="ml-2" aria-hidden="true">
            ↑
          </span>
        </button>
      </div>
      <p className="mt-2 px-1 text-xs text-stone-500 dark:text-stone-400">
        Enter ile gönder · Yeni satır için Shift + Enter
      </p>
    </form>
  );
}
