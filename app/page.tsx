"use client";

import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useState } from "react";
export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(`/analysis?query=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (query.trim()) router.push(`/analysis?query=${encodeURIComponent(query.trim())}`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">

        <div className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-600">
          Expiya Cars
        </div>

        <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl">
          Sizin için doğru arabayı
          <br />
          birlikte bulalım
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-neutral-600">
          İhtiyaçlarınızı anlatın; seçenekleri bir arkadaş gibi konuşup sonunda
          net ve gerekçeli bir karara ulaşalım.
        </p>

        <form onSubmit={submit} className="flex w-full flex-col items-center">
        <label htmlFor="initial-car-message" className="sr-only">İlk mesajınız</label>
        <textarea
  id="initial-car-message"
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder="Hadi başlayalım… Aklınızdaki aracı veya ihtiyacınızı anlatın."
  className="mt-10 h-40 w-full max-w-3xl rounded-2xl border border-neutral-300 p-6 text-lg outline-none focus:border-black"
/>

        <button
  type="submit"
  disabled={!query.trim()}
  className="mt-8 rounded-xl bg-black px-8 py-4 font-semibold text-white transition hover:bg-neutral-800"
>
  Aracımı Bul
</button>
        </form>

      </section>
    </main>
  );
}
