"use client";

import { useEffect, useRef, useState } from "react";

type PdfJs = typeof import("pdfjs-dist");

function PdfPage({ pdf, pageNumber }: { pdf: Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void pdf.getPage(pageNumber).then(async (page) => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const availableWidth = Math.min(860, canvas.parentElement?.clientWidth ?? 860);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: availableWidth / base.width });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * pixelRatio); canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      await page.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] }).promise;
    });
    return () => { cancelled = true; };
  }, [pageNumber, pdf]);
  return <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><canvas ref={canvasRef} className="mx-auto block max-w-full" aria-label={`Raporun ${pageNumber}. sayfası`} /></article>;
}

export default function PdfViewer() {
  const [pdf, setPdf] = useState<Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void import("pdfjs-dist").then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const document = await pdfjs.getDocument({ url: "/api/cars/paid-comparison/report/pdf" }).promise;
      if (active) setPdf(document);
    }).catch(() => active && setError("PDF uygulama içinde görüntülenemedi. İndirme seçeneğini kullanabilirsin."));
    return () => { active = false; };
  }, []);
  if (error) return <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>;
  if (!pdf) return <div className="flex min-h-72 items-center justify-center rounded-2xl border border-stone-200 bg-white text-sm text-stone-600">PDF sayfaları hazırlanıyor…</div>;
  return <section className="space-y-5" aria-label="PDF rapor sayfaları">{Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={index + 1} pdf={pdf} pageNumber={index + 1} />)}</section>;
}
