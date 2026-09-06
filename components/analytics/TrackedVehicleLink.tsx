"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { productEvents, recordProductEvent, type AnalyticsSurface } from "@/lib/analytics/productEvents";

export function TrackedVehicleLink({ href, ariaLabel, className, surface, position, children }: {
  readonly href: string;
  readonly ariaLabel: string;
  readonly className: string;
  readonly surface: AnalyticsSurface;
  readonly position: number;
  readonly children: ReactNode;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    const element = linkRef.current;
    if (!element || viewedRef.current || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        timer = setTimeout(() => {
          if (viewedRef.current) return;
          viewedRef.current = true;
          recordProductEvent(productEvents.carCardViewed(surface, position));
          observer.disconnect();
        }, 1_000);
      } else if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => { if (timer) clearTimeout(timer); observer.disconnect(); };
  }, [position, surface]);

  return <Link ref={linkRef} href={href} aria-label={ariaLabel} className={className} onClick={() => recordProductEvent(productEvents.carCardOpened(surface, position))}>{children}</Link>;
}
