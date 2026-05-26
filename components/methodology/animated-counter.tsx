"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInView, useMotionValue, useTransform, animate } from "framer-motion";

// `format` can't be a function prop because Server Components can't serialise
// functions to Client Components. Use a string token instead — the client
// resolves it to a formatter at render time.
export type CounterFormat = "int" | "fixed1" | "fixed2";

export function AnimatedCounter({
  to,
  format = "int",
  duration = 1.4,
  className,
}: {
  to: number;
  format?: CounterFormat;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0 });
  const fmt = useMemo(() => resolveFormat(format), [format]);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, fmt);
  // SSR + first paint: show the target value immediately so users never
  // see "0" before the animation starts.
  const [text, setText] = useState(() => fmt(to));

  useEffect(() => {
    if (!inView) return;
    motionValue.set(0);
    const controls = animate(motionValue, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = rounded.on("change", setText);
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, to, duration, motionValue, rounded]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

function resolveFormat(f: CounterFormat): (v: number) => string {
  switch (f) {
    case "fixed1":
      return (v) => v.toFixed(1);
    case "fixed2":
      return (v) => v.toFixed(2);
    case "int":
    default:
      return (v) => Math.round(v).toLocaleString("th-TH");
  }
}
