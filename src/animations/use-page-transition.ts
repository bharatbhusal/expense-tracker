"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";

export function usePageTransition(routeKey: string) {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!ref.current) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      // ponytail: page-level from-tween only — no [data-animate] stagger branch
      // (nothing stamps data-animate; CSS keeps it visible by default).
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 16, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: "power3.out",
        },
      );
    },
    { dependencies: [routeKey] },
  );

  return ref;
}
