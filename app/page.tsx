export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-neutral-50 text-neutral-900">
      <section className="mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center lg:py-32">
        <span className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600">
          Coming Soon
        </span>

        <h1 className="mt-8 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Make smarter
          <br />
          buying decisions
          <br />
          with AI.
        </h1>

        <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-600">
          Expiya analyzes real user experiences, expert knowledge and trusted
          data to help you choose the right product with confidence.
        </p>

        <button className="mt-10 rounded-full bg-black px-8 py-4 font-semibold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-neutral-800">
  Join the Waitlist
</button>

        <p className="mt-6 text-sm text-neutral-500">
          Starting with used cars. Expanding to every purchase.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        <article className="rounded-3xl border border-neutral-200 p-8">
          <h2 className="text-xl font-semibold">Real Experiences</h2>

          <p className="mt-4 text-neutral-600">
            Learn from thousands of authentic user experiences before making a
            purchase.
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 p-8">
          <h2 className="text-xl font-semibold">AI Analysis</h2>

          <p className="mt-4 text-neutral-600">
            Compare products using AI that understands what truly matters.
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 p-8">
          <h2 className="text-xl font-semibold">Better Decisions</h2>

          <p className="mt-4 text-neutral-600">
            Spend less time researching and buy with confidence.
          </p>
        </article>
      </section>

      <footer className="border-t border-neutral-200 py-10 text-center text-sm text-neutral-500">
        © 2026 Expiya. All rights reserved.
      </footer>
    </main>
  );
}