"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="tr">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-white px-6 text-neutral-950">
          <div className="max-w-lg text-center">
            <h1 className="text-3xl font-bold">Beklenmeyen bir hata oluştu</h1>
            <p className="mt-4 text-neutral-600 dark:text-neutral-300">Lütfen sayfayı yenileyin veya biraz sonra yeniden deneyin.</p>
          </div>
        </main>
      </body>
    </html>
  );
}
