"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StepStatus = "done" | "in_progress" | "pending";

export type Step = {
  id: string;
  title: string;
  summary: string;
  status: StepStatus;
  bullets?: string[];
  meta?: string;
};

export function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className="relative grid grid-cols-[auto_1fr] gap-5 pl-1"
    >
      {/* Marker dot */}
      <div className="relative">
        <span
          className={cn(
            "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white font-mono text-[12px] font-bold",
            step.status === "done" && "border-metier-orange text-metier-orange",
            step.status === "in_progress" && "border-amber-500 text-amber-500",
            step.status === "pending" && "border-[color:var(--color-border)] text-[color:var(--color-muted)]",
          )}
        >
          {step.status === "done" ? (
            <Check className="h-4 w-4" />
          ) : step.status === "in_progress" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span>{step.id}</span>
          )}
        </span>
      </div>

      {/* Body */}
      <div className="pb-12">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-[color:var(--color-muted)]">{step.id}</span>
          <h3 className="text-[20px] font-bold leading-tight">{step.title}</h3>
          {step.status === "done" && (
            <Badge variant="success" className="ml-1">เสร็จ</Badge>
          )}
          {step.status === "in_progress" && (
            <Badge variant="warning" className="ml-1">กำลังทำ</Badge>
          )}
          {step.status === "pending" && (
            <Badge variant="muted" className="ml-1">รอ</Badge>
          )}
          {step.meta && (
            <span className="ml-1 text-[12px] text-[color:var(--color-muted)]">· {step.meta}</span>
          )}
        </div>
        <p className="text-[15px] font-light leading-relaxed text-[color:var(--color-muted-fg)]">
          {step.summary}
        </p>
        {step.bullets && step.bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-[14px]">
            {step.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-metier-orange" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
