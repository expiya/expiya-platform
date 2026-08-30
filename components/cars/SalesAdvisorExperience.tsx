"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { UnlockedReportVehicles } from "@/components/cars/UnlockedReportVehicles";
import { productEvents, recordProductEvent, recordProductEventOnce, type Phase3AnalyticsIntent } from "@/lib/analytics/productEvents";
import type { AdvisorReply } from "@/features/sales-advisor/advisor";
import { humanizePreferenceText } from "@/features/decision/v3/preferencePresentation";
import type {
  Phase2HandoffPayload,
  VariantContentArtifact,
} from "@/features/sales-advisor/types";
import {
  SALES_ADVISOR_DISCLOSURE,
  SALES_ADVISOR_DISCLOSURE_VERSION,
} from "@/lib/legal/salesAdvisorDisclosure";

type Experience = {
  readonly handoff: Phase2HandoffPayload;
  readonly artifact: VariantContentArtifact;
};
type ChatMessage = {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly action?: AdvisorReply["action"];
};
type Phase3Intent =
  | "REQUEST_QUOTE"
  | "REQUEST_TEST_DRIVE"
  | "REQUEST_DEALER_CONTACT";

const navigation = [
  ["overview", "Genel bakış"],
  ["fit", "Sana uygunluğu"],
  ["media", "Galeri & video"],
  ["equipment", "Donanım"],
  ["advisor", "Satış danışmanı"],
] as const;
const actions: readonly {
  intent: Phase3Intent;
  title: string;
  text: string;
  icon: string;
}[] = [
  {
    intent: "REQUEST_TEST_DRIVE",
    title: "Test sürüşü talebi adımına geç",
    text: "Yalnız güvenli geçiş hazırlanır; randevu oluşmaz.",
    icon: "direksiyon",
  },
  {
    intent: "REQUEST_DEALER_CONTACT",
    title: "Bayi iletişimi adımına geç",
    text: "Yalnız güvenli geçiş hazırlanır; bayiye veri gönderilmez.",
    icon: "konum",
  },
  {
    intent: "REQUEST_QUOTE",
    title: "Fiyat teklifi adımına geç",
    text: "Yalnız güvenli geçiş hazırlanır; teklif veya sipariş oluşmaz.",
    icon: "teklif",
  },
];

const humanizeNeedSummary = humanizePreferenceText;
const needIcons: Readonly<Record<string, string>> = {
  primaryUsage: "↗", safetyConfidence: "⌾", equipmentFeature: "✓", candidateComfortPriority: "≈", candidateLuggagePriority: "▣", candidatePowerPriority: "⚡", candidateCompactPriority: "↔", fuelDelegated: "◇", bodyNotImportant: "◫", bodyStyle: "◫",
};
function dailyDecisionNote(key: string, approvedConcepts: ReadonlySet<string>): string | undefined {
  if (key === "luggage" && approvedConcepts.has("candidateLuggagePriority")) return "Bu değer, kalan araçlar arasındaki kararını doğrudan ayıran ölçütlerden biriydi.";
  if (key === "power" && approvedConcepts.has("candidatePowerPriority")) return "Motor gücü tercihin nedeniyle bu değer karar sıralamasında doğrudan kullanıldı.";
  if (key === "length" && approvedConcepts.has("candidateCompactPriority")) return "Şehir içi manevra tercihin için karşılaştırılan doğrulanmış ölçüdür.";
  if (["bodyStyle", "seats", "luggage"].includes(key) && approvedConcepts.has("candidatePracticalityPriority")) return "Günlük pratiklik tercihinle ilişkilendirilen doğrulanmış araç verilerinden biridir.";
  if (["bodyStyle", "transmission", "seats"].includes(key) && approvedConcepts.has("candidateComfortPriority")) return "Uzun yol konforu tercihini açıklarken kullanılan araç yapısı göstergelerinden biridir.";
  return undefined;
}
function Icon({ name }: { readonly name: string }) {
  if (name === "konum")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-none stroke-current"
        strokeWidth="1.8"
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  if (name === "teklif")
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6 fill-none stroke-current"
        strokeWidth="1.8"
      >
        <path d="M4 3h12l4 4v14H4Z" />
        <path d="M16 3v5h4M8 13h8M8 17h5" />
      </svg>
    );
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M3.5 10h5M15.5 10h5M12 15v6" />
    </svg>
  );
}

function StatusPill({
  children,
  tone = "dark",
}: {
  readonly children: React.ReactNode;
  readonly tone?: "dark" | "light";
}) {
  return (
    <span
      className={
        tone === "dark"
          ? "inline-flex rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 text-xs text-stone-800 backdrop-blur"
          : "inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
      }
    >
      {children}
    </span>
  );
}

function FactIcon({ factKey }: { readonly factKey: string }) {
  const category = ["power", "torque", "engineDisplacement"].includes(factKey) ? "power"
    : ["range", "dcCharge", "batteryCapacity", "usableBattery", "electricConsumption"].includes(factKey) ? "battery"
      : ["consumption", "fuelType", "officialCombinedRange"].includes(factKey) ? "fuel"
        : ["luggage", "cargoVolume", "payload", "brakedTowing", "dynamicRoofLoad", "modularRoofBars"].includes(factKey) ? "cargo"
          : ["length", "width", "height", "wheelbase", "emptyMass", "runningOrderMass", "maximumPermissibleMass"].includes(factKey) ? "measure"
            : ["transmission", "drivenWheels"].includes(factKey) ? "drive" : "vehicle";
  return (
    <span className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-emerald-300" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {category === "power" ? <><path d="m13 2-7 12h6l-1 8 7-12h-6z" /></>
          : category === "battery" ? <><rect x="3" y="6" width="17" height="12" rx="2" /><path d="M20 10h2v4h-2M7 10v4M11 9v6M15 10v4" /></>
            : category === "fuel" ? <><path d="M6 21V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17M4 21h14M8 6h6v5H8zM16 7h2l2 3v7a2 2 0 0 0 2 2" /></>
              : category === "cargo" ? <><path d="m4 8 8-4 8 4-8 4zM4 8v9l8 4 8-4V8M12 12v9" /></>
                : category === "measure" ? <><path d="M4 19 19 4l2 2L6 21zM11 10l3 3M14 7l3 3M8 13l3 3" /></>
                  : category === "drive" ? <><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><path d="M11 12h2M8 9V6h8v3M8 15v3h8v-3" /></>
                    : <><path d="M3 14h18l-2-5a3 3 0 0 0-3-2H8a3 3 0 0 0-3 2zM5 14v4M19 14v4" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>}
      </svg>
    </span>
  );
}

export function ClassPositionGauge({ position, tone = "PERFORMANCE" }: { readonly position: "LOW" | "MID" | "HIGH"; readonly tone?: "PERFORMANCE" | "NEUTRAL" }) {
  const gradientId = useId().replaceAll(":", "");
  const needle = position === "LOW" ? { x: 39, y: 47, label: tone === "NEUTRAL" ? "Alt" : "Düşük" } : position === "HIGH" ? { x: 137, y: 47, label: tone === "NEUTRAL" ? "Üst" : "Yüksek" } : { x: 88, y: 19, label: "Orta" };
  const colors = tone === "NEUTRAL" ? ["#64748b", "#3b82f6", "#4f46e5"] as const : ["#dc2626", "#f59e0b", "#16a34a"] as const;
  const scaleLabels = tone === "NEUTRAL" ? ["Alt", "Orta", "Üst"] as const : ["Düşük", "Orta", "Yüksek"] as const;
  return (
    <div className="mt-4 rounded-2xl bg-black/20 px-3 pb-3 pt-2" role="img" aria-label={`Sınıf içi göreli ${tone === "NEUTRAL" ? "konum" : "seviye"}: ${needle.label}`}>
      <svg viewBox="0 0 176 112" className="mx-auto h-auto w-full max-w-52" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="50%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
        </defs>
        <path d="M16 88 A72 72 0 0 1 160 88" fill="none" stroke={`url(#${gradientId})`} strokeWidth="18" strokeLinecap="round" />
        <line x1="88" y1="88" x2={needle.x} y2={needle.y} stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
        <circle cx="88" cy="88" r="7" fill="#f8fafc" />
        <text x="13" y="108" fill={tone === "NEUTRAL" ? "#cbd5e1" : "#fca5a5"} fontSize="10">{scaleLabels[0]}</text>
        <text x="75" y="108" fill={tone === "NEUTRAL" ? "#93c5fd" : "#fdba74"} fontSize="10">{scaleLabels[1]}</text>
        <text x="139" y="108" fill={tone === "NEUTRAL" ? "#a5b4fc" : "#86efac"} fontSize="10">{scaleLabels[2]}</text>
      </svg>
      <p className="mt-2 text-center text-xs font-semibold text-stone-100">Sınıf içi göreli {tone === "NEUTRAL" ? "konum" : "seviye"} · {needle.label}</p>
      <p className="mt-1 text-center text-[10px] leading-4 text-stone-400">{tone === "NEUTRAL" ? "Bu gösterim yalnız büyüklük konumudur; iyi veya kötü puanı değildir." : "Tek başına genel kalite veya satın alma puanı değildir."}</p>
    </div>
  );
}

function AdvisorPanel({
  messages,
  draft,
  sending,
  onDraft,
  onSubmit,
}: {
  readonly messages: readonly ChatMessage[];
  readonly draft: string;
  readonly sending: boolean;
  readonly onDraft: (value: string) => void;
  readonly onSubmit: (event: React.FormEvent) => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length) end.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);
  return (
    <section
      id="advisor"
      aria-labelledby="advisor-title"
      className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_24px_70px_-35px_rgba(28,25,23,.35)]"
    >
      <div className="border-b border-stone-100 bg-stone-950 px-5 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-lg font-bold text-stone-950">
            E
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-stone-950 bg-emerald-300" />
          </span>
          <div>
            <h2 id="advisor-title" className="font-semibold">
              Expiya Satış Danışmanı
            </h2>
            <p className="text-xs text-stone-400">
              Yapay zekâ destekli · bağlayıcı teklif değildir
            </p>
          </div>
        </div>
      </div>
      <div
        className="max-h-[22rem] min-h-52 space-y-3 overflow-y-auto bg-[#f7f5f0] p-4"
        aria-live="polite"
      >
        <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-6 shadow-sm">
          Merhaba, seçtiğin bu exact varyantla ilgili teknik özellik, donanım,
          fiyat veya günlük kullanım sorularını mevcut kanıtlarla
          yanıtlayabilirim. Doğrulanmamış bilgiyi kesinleştirmem.
        </div>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-2xl p-4 text-sm leading-6 ${message.role === "user" ? "ml-auto rounded-tr-sm bg-stone-900 text-white" : "rounded-tl-sm bg-white shadow-sm"}`}
          >
            <p>{message.text}</p>
            {message.action ? (
              <Link
                href={message.action.href}
                className="mt-3 inline-flex font-semibold underline underline-offset-4"
              >
                {message.action.label}
              </Link>
            ) : null}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={onSubmit} className="border-t border-stone-100 p-3">
        <div className="flex gap-2">
          <label htmlFor="advisor-question" className="sr-only">
            Satış danışmanına sorun
          </label>
          <input
            id="advisor-question"
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            disabled={sending}
            placeholder="Bu araçla ilgili bir şey sor…"
            className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-3 text-sm outline-none ring-emerald-600 focus:ring-2"
          />
          <button
            disabled={sending || !draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
            aria-label="Soruyu gönder"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5 fill-none stroke-current"
              strokeWidth="2"
            >
              <path d="m5 12 14-7-4 14-3-6-7-1Z" />
              <path d="m12 13 7-8" />
            </svg>
          </button>
        </div>
        <p className="mt-2 px-2 text-[10px] leading-4 text-stone-500">
          Aynı araç oturumunda işlenir; kişisel veya hassas veri yazmayın.{" "}
          <Link
            href="/satis-danismani-bilgilendirmesi"
            target="_blank"
            className="font-semibold underline underline-offset-2"
          >
            Bilgilendirme · {SALES_ADVISOR_DISCLOSURE_VERSION}
          </Link>
        </p>
      </form>
    </section>
  );
}

export function SalesAdvisorExperience({
  token,
  exactVariantId,
}: {
  readonly token: string;
  readonly exactVariantId: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<Experience>();
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [phase3Pending, setPhase3Pending] = useState<Phase3Intent>();
  const [activeMedia, setActiveMedia] = useState(0);
  useEffect(() => {
    void fetch("/api/cars/sales-advisor/experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as Experience & {
          error?: string;
        };
        if (
          !response.ok ||
          payload.handoff?.selectedExactVariantId !== exactVariantId
        )
          throw new Error(payload.error ?? "Bağlantı doğrulanamadı");
        setData(payload);
        recordProductEventOnce("sales-advisor-started", productEvents.salesAdvisorStarted());
      })
      .catch((reason: Error) => setError(reason.message));
  }, [exactVariantId, token]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending) return;
    const messageId = crypto.randomUUID();
    setDraft("");
    setSending(true);
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", text: question },
    ]);
    try {
      const response = await fetch("/api/cars/sales-advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, messageId, question }),
      });
      const payload = (await response.json()) as AdvisorReply & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Yanıt hazırlanamadı");
      setMessages((current) => [
        ...current,
        ...payload.messages.map((text, index) => ({
          id: `${messageId}-${index}`,
          role: "assistant" as const,
          text,
          ...(index === payload.messages.length - 1 && payload.action
            ? { action: payload.action }
            : {}),
        })),
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${messageId}-error`,
          role: "assistant",
          text: "Bu soruyu güvenli kanıt sınırı içinde yanıtlayamadım. Lütfen yeniden dene.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }
  async function preparePhase3(intent: Phase3Intent, label: string) {
    if (phase3Pending) return;
    const analyticsIntent: Record<Phase3Intent, Phase3AnalyticsIntent> = {
      REQUEST_QUOTE: "quote",
      REQUEST_TEST_DRIVE: "test_drive",
      REQUEST_DEALER_CONTACT: "dealer_contact",
    };
    recordProductEvent(productEvents.phase3CtaClicked(analyticsIntent[intent]));
    setPhase3Pending(intent);
    try {
      const response = await fetch("/api/cars/sales-advisor/phase3-handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, intent }),
      });
      const payload = (await response.json()) as {
        status?: string;
        token?: string;
      };
      if (!response.ok || payload.status !== "HANDOFF_READY" || !payload.token)
        throw new Error("HANDOFF_REJECTED");
      const returnTo = `/cars/variant/${encodeURIComponent(exactVariantId)}?handoff=${encodeURIComponent(token)}`;
      router.push(
        `/cars/sales-request/${intent}?handoff=${encodeURIComponent(payload.token)}&returnTo=${encodeURIComponent(returnTo)}`,
      );
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `${label} için geçiş doğrulanamadı; herhangi bir işlem yapılmadı.`,
        },
      ]);
      document
        .getElementById("advisor")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPhase3Pending(undefined);
    }
  }
  if (error)
    return (
      <main className="expiya-adaptive-surface min-h-screen bg-white p-6 text-stone-950">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-300 bg-rose-50 p-8">
          <h1 className="text-2xl font-semibold">
            Güvenli geçiş doğrulanamadı
          </h1>
          <p className="mt-3 text-rose-800">
            Bağlantı eski, değiştirilmiş veya bu görüşmeye ait değil.
          </p>
          <Link
            href="/?resume=conversation#sohbet"
            className="mt-6 inline-flex rounded-full bg-emerald-700 px-5 py-3 font-semibold text-white"
          >
            Karar motoru sohbetine dön
          </Link>
        </div>
      </main>
    );
  if (!data)
    return (
      <main
        className="expiya-adaptive-surface min-h-screen bg-white p-8 text-stone-700"
        aria-busy="true"
      >
        Varyant kataloğu doğrulanıyor…
      </main>
    );
  const { artifact, handoff } = data;
  const hero = artifact.media[activeMedia] ?? artifact.media[0];
  const highlightFacts = artifact.facts.slice(0, 4);
  const approvedConcepts = new Set(handoff.approvedNeeds.map((need) => need.concept));
  return (
    <main className="expiya-adaptive-surface min-h-screen bg-white text-stone-950">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 text-stone-950 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight">
            EXPIYA <span className="font-light text-emerald-700">CARS</span>
          </Link>
          <nav
            aria-label="Varyant sayfası"
            className="hidden gap-6 text-xs text-stone-600 lg:flex"
          >
            {navigation.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="transition hover:text-stone-950"
              >
                {label}
              </a>
            ))}
          </nav>
          <Link
            href="/?resume=conversation#sohbet"
            className="rounded-full border border-stone-300 px-4 py-2 text-xs font-medium hover:border-stone-500 hover:bg-stone-50"
          >
            Karar motoru sohbetine dön
          </Link>
        </div>
      </header>
      <section
        id="overview"
        className="relative isolate overflow-hidden bg-white text-stone-950"
      >
        <div className="absolute inset-0">
          {hero ? (
            <Image
              src={hero.url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center opacity-100"
            />
          ) : (
            <div className="h-full bg-[radial-gradient(circle_at_70%_30%,#d1fae5,transparent_40%),linear-gradient(130deg,#ffffff,#f5f5f4)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/55 via-transparent to-white/5" />
        </div>
        <div className="relative mx-auto grid min-h-[78vh] max-w-7xl items-end px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12 lg:py-16">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <StatusPill>Exact varyant</StatusPill>
              <StatusPill>{artifact.identity.modelYear} model</StatusPill>
              <StatusPill>
                {hero?.label ?? "Görsel kanıtı bekleniyor"}
              </StatusPill>
            </div>
            <p className="mt-7 text-xs font-semibold uppercase tracking-[.3em] text-emerald-700">
              Senin seçimin
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
              {artifact.identity.brand} {artifact.identity.model}
              <span className="mt-2 block text-2xl font-light text-stone-600 sm:text-3xl">
                {artifact.identity.trim}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
              Teknik veriden günlük kullanıma, donanımdan fiyat durumuna kadar
              seçtiğin varyantın kanıt kapsamıyla sınırlı kataloğu. Bu anlatım
              bağlayıcı satış teklifi değildir.
            </p>
            <button type="button" disabled={Boolean(phase3Pending)} onClick={() => void preparePhase3("REQUEST_TEST_DRIVE", "Test sürüşü talebi adımına geç")} className="mt-7 inline-flex items-center gap-3 rounded-full bg-emerald-700 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-600 disabled:opacity-60">
              <Icon name="direksiyon" /> Test sürüşü adımını incele <span aria-hidden="true">→</span>
            </button>
          </div>
          <dl className="mt-10 grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-3xl border border-stone-200 bg-stone-200/80 shadow-lg backdrop-blur lg:mt-0">
            {highlightFacts.length ? (
              highlightFacts.map((item) => (
                <div key={item.key} className="min-w-0 bg-white/90 p-5">
                  <dt className="text-xs text-stone-500">{item.label}</dt>
                  <dd className="mt-2 break-words text-lg font-semibold">
                    {item.value}
                  </dd>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-white/90 p-6 text-sm text-stone-600">
                Doğrulanmış teknik özet hazırlanıyor.
              </div>
            )}
          </dl>
        </div>
      </section>
      <section
        aria-label="Güncel fiyat durumu"
        className="border-y border-stone-200 bg-stone-50 text-stone-950"
      >
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 sm:px-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-stone-500">
              Güncel fiyat durumu
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {artifact.price.display}
            </p>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-stone-600">
            {artifact.price.note}
          </p>
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${artifact.price.status === "VERIFIED" ? "bg-emerald-400 text-stone-950" : "bg-amber-300 text-stone-950"}`}
          >
            {artifact.price.status === "VERIFIED"
              ? "Doğrulanmış"
              : "Doğrulanıyor"}
          </span>
        </div>
      </section>
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:hidden">
          {navigation.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 rounded-full bg-stone-100 px-4 py-2 text-xs font-medium"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8">
        <div className="flex min-w-0 flex-col gap-16">
          <section id="fit" aria-labelledby="fit-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">
                  Karar bağlamın
                </p>
                <h2
                  id="fit-title"
                  className="mt-2 text-3xl font-semibold sm:text-4xl"
                >
                  Neden sana uygun?
                </h2>
              </div>
              <StatusPill tone="light">Aşama 1’den onaylı</StatusPill>
            </div>
            {handoff.approvedNeeds.length ? (
              <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {handoff.approvedNeeds.map((need, index) => (
                  <article
                    key={`${need.concept}-${need.summary}`}
                    className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-6 shadow-sm"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-xl font-semibold text-white" aria-hidden="true">
                      {needIcons[need.concept] ?? String(index + 1).padStart(2, "0")}
                    </span>
                    <p className="relative mt-5 text-lg font-semibold">
                      {humanizeNeedSummary(need.summary)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-stone-600">
                Onaylanmış kişisel kullanım bağlamı bulunmuyor. Bu sayfadaki
                kullanım anlatımları genel örnektir.
              </p>
            )}
            {handoff.approvedNeeds.length ? (
              <p className="mt-4 rounded-2xl border border-stone-200 bg-white px-5 py-4 text-sm leading-6 text-stone-600">
                Bu ihtiyaçların tamamı yalnız aşağıdaki doğrulanmış araç
                gerçekleriyle eşleştirilir; ek yaşam biçimi veya kullanım amacı
                varsayılmaz.
              </p>
            ) : null}
          </section>
          <section aria-labelledby="daily-title">
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">
              Gerçek hayatta
            </p>
            <h2
              id="daily-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
            >
              Teknik verinin günlük karşılığı
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {artifact.facts
                .filter((item) => item.dailyMeaning)
                .map((item) => (
                  <article
                    key={item.key}
                    className="relative rounded-3xl bg-stone-900 p-6 text-white"
                  >
                    <FactIcon factKey={item.key} />
                    <p className="pr-14 text-xs text-emerald-300">
                      {item.label} · Doğrulanmış
                    </p>
                    <p className="mt-3 pr-14 text-3xl font-semibold">{item.value}</p>
                    <p className="mt-4 text-sm leading-6 text-stone-300">
                      {item.dailyMeaning}
                    </p>
                    {item.classComparison?.dataCount ? <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-950/60 px-4 py-3 text-sm leading-6 text-stone-100"><p><span className="font-semibold text-emerald-300">Araç sınıfındaki yeri:</span> {item.classComparison.text}</p><p className="mt-2 text-xs text-stone-400">Karşılaştırma kapsamı: {item.classComparison.basis} · {item.classComparison.dataCount} doğrulanmış veri</p>{item.classComparison.gaugePosition ? <ClassPositionGauge position={item.classComparison.gaugePosition} tone={item.classComparison.gaugeTone} /> : null}</div> : null}
                    {item.dailyExample ? <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-stone-100"><span className="font-semibold text-emerald-300">Günlük etkisi:</span> {item.dailyExample}</p> : null}
                    {dailyDecisionNote(item.key, approvedConcepts) ? <p className="mt-4 rounded-2xl border border-emerald-700/40 bg-emerald-950/70 px-4 py-3 text-xs font-medium leading-5 text-emerald-200">Karardaki önemi: {dailyDecisionNote(item.key, approvedConcepts)}</p> : null}
                  </article>
                ))}
            </div>
          </section>
          <section id="equipment" aria-labelledby="equipment-title">
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">
              Kabin, güvenlik ve konfor
            </p>
            <h2
              id="equipment-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
            >
              Donanım
            </h2>
            {artifact.equipment.length ? (
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {artifact.equipment.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        ✓
                      </span>
                      <span className="capitalize">{item.value}</span>
                      <span className="ml-auto text-[10px] font-medium text-emerald-700">
                        EXACT
                      </span>
                    </div>
                    {item.dailyMeaning ? (
                      <p className="mt-3 pl-11 text-xs leading-5 text-stone-500">
                        <span className="font-semibold text-stone-700">Türkçe anlamı ve günlük kullanım:</span> {item.dailyMeaning}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-950">
                Exact varyant için yayınlanabilir donanım kaydı henüz
                bulunmuyor. Araçta varmış gibi gösterilmiyor; satış öncesinde
                güncel donanım listesinin doğrulanması gerekir.
              </p>
            )}
          </section>
          <section aria-labelledby="colors-title">
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">
              Dış görünüm
            </p>
            <h2
              id="colors-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
            >
              Renk seçenekleri
            </h2>
            {artifact.colors.length ? (
              <div className="mt-7 rounded-3xl border border-stone-200 bg-white p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {artifact.colors.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <span
                        className="h-12 w-12 shrink-0 rounded-full border border-black/15 shadow-inner"
                        style={{
                          backgroundColor: item.visual?.swatchHex ?? "#e7e5e4",
                        }}
                        aria-hidden="true"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {item.value}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-stone-500">
                          Üretici renk adı
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-xs leading-5 text-stone-500">
                  Renk çipleri ekran temsilidir; boya tonu ışık, ekran ve üretim
                  partisine göre farklı görünebilir.
                </p>
                {artifact.colors[0]?.scopeNote ? (
                  <p className="mt-2 text-xs leading-5 text-amber-800">
                    {artifact.colors[0].scopeNote}
                  </p>
                ) : null}
                {artifact.colors[0]?.source ? (
                  <a
                    href={artifact.colors[0].source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-emerald-700 underline underline-offset-2"
                  >
                    {artifact.colors[0].source.label}
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 text-sm leading-6 text-stone-600">
                Türkiye pazarı, model yılı ve exact varyant kapsamı birlikte
                doğrulanmış renk kaydı henüz yok. Renk seçimi satış adımında
                teyit edilecek.
              </p>
            )}
          </section>
          <section id="media" aria-labelledby="media-title">
            <p className="text-xs font-semibold uppercase tracking-[.24em] text-emerald-700">
              Yakından incele
            </p>
            <h2
              id="media-title"
              className="mt-2 text-3xl font-semibold sm:text-4xl"
            >
              Galeri & video
            </h2>
            {artifact.media.length ? (
              <div className="mt-7 overflow-hidden rounded-3xl bg-stone-950 p-2 sm:p-3">
                <div className="space-y-3">
                  <figure className="min-w-0 overflow-hidden rounded-2xl bg-stone-900">
                    <div className="relative aspect-[4/3] sm:aspect-video">
                      {hero ? (
                        <Image
                          key={hero.url}
                          src={hero.url}
                          alt={hero.alt}
                          fill
                          sizes="(max-width: 1024px) 100vw, 850px"
                          className="object-cover transition-opacity duration-300"
                        />
                      ) : null}
                    </div>
                    <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-stone-300">
                      <span>{hero?.label}</span>
                      <span className="text-stone-500">
                        {activeMedia + 1} / {artifact.media.length}
                      </span>
                    </figcaption>
                  </figure>
                  {artifact.media.length > 1 ? (
                    <div
                      className="flex gap-2 overflow-x-auto pb-1"
                      role="tablist"
                      aria-label="Araç görselleri"
                    >
                      {artifact.media.map((media, index) => (
                        <button
                          key={`${media.url}-${index}`}
                          type="button"
                          role="tab"
                          aria-label={`${index + 1}. görseli büyük göster`}
                          aria-selected={activeMedia === index}
                          onClick={() => setActiveMedia(index)}
                          className={`group relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 sm:h-24 sm:w-36 ${activeMedia === index ? "border-emerald-400" : "border-transparent opacity-70 hover:opacity-100 focus:opacity-100"}`}
                        >
                          <Image
                            src={media.url}
                            alt=""
                            fill
                            sizes="144px"
                            className="object-cover transition group-hover:scale-105"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">
                            {index + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-stone-900 px-4 py-3 text-xs leading-5 text-stone-400">
                      Bu model için yayın hakkı doğrulanmış tek görsel
                      bulunuyor. Yeni doğrulanmış görseller eklendikçe galeri
                      genişletilecek.
                    </p>
                  )}
                </div>
                {hero?.attribution ? (
                  <p className="px-3 pb-2 pt-3 text-[11px] text-stone-500">
                    {hero.attribution}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-6 rounded-3xl bg-stone-900 p-6 text-stone-300">
                Yayınlanabilir exact veya temsilî görsel bulunmuyor.
              </p>
            )}
            {artifact.video ? (
              <div className="mt-7 overflow-hidden rounded-3xl bg-black">
                <div className="aspect-video">
                  <iframe
                    src={artifact.video.embedUrl}
                    title={artifact.video.title}
                    className="h-full w-full"
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between gap-4 p-5 text-white">
                  <div>
                    <p className="font-semibold">{artifact.video.title}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      Resmî veya lisanslı{" "}
                      {artifact.video.provider === "YOUTUBE"
                        ? "YouTube"
                        : "Vimeo"}{" "}
                      videosu · Doğrulanmış
                    </p>
                  </div>
                  <StatusPill>Video</StatusPill>
                </div>
              </div>
            ) : (
              <div className="mt-7 flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center">
                <div>
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-2xl">
                    ▶
                  </span>
                  <h3 className="mt-4 font-semibold">
                    Tanıtım videosu hazırlanıyor
                  </h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">
                    Bu exact varyanta bağlı resmî veya lisanslı YouTube/Vimeo
                    kaydı doğrulandığında video burada, sayfadan ayrılmadan
                    oynatılacak.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      <section
        aria-label="Satış yönlendirmeleri ve danışman"
        className="border-t border-stone-200 bg-white"
      >
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-stone-950 p-6 text-white shadow-xl shadow-emerald-950/10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-300">
                  Sonraki adım
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  Bir talep adımını incelemek ister misin?
                </h2>
              </div>
              <p className="text-xs text-stone-300">
                Başvuru, rezervasyon, teklif veya bayi aktarımı oluşmaz.
              </p>
            </div>
            <div className="mt-4 grid gap-2">
              {actions.map((action) => (
                <button
                  key={action.intent}
                  type="button"
                  disabled={Boolean(phase3Pending)}
                  onClick={() =>
                    void preparePhase3(action.intent, action.title)
                  }
                  className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 ${action.intent === "REQUEST_TEST_DRIVE" ? "border-emerald-300 bg-emerald-300 text-emerald-950" : "border-white/15 bg-white/10 text-white hover:border-emerald-300"}`}
                >
                  <span className={`rounded-xl p-2 ${action.intent === "REQUEST_TEST_DRIVE" ? "bg-emerald-950 text-emerald-200" : "bg-white/10 text-emerald-300"}`}>
                    <Icon name={action.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{action.title}</span>
                    <span className={`mt-0.5 block text-xs leading-5 ${action.intent === "REQUEST_TEST_DRIVE" ? "text-emerald-900" : "text-stone-300"}`}>
                      {action.text}
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-lg transition group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-300">
              {SALES_ADVISOR_DISCLOSURE.phase3Scope}
            </p>
          </div>
          <AdvisorPanel
            messages={messages}
            draft={draft}
            sending={sending}
            onDraft={setDraft}
            onSubmit={submit}
          />
        </div>
        <UnlockedReportVehicles currentExactVariantId={exactVariantId} />
      </section>
    </main>
  );
}
