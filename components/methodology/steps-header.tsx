"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { Step } from "./step-card";
import { cn } from "@/lib/utils";

export function StepsHeader({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.status === "done").length;
  const total = steps.length;
  const pct = total ? (done / total) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-bold leading-tight">
            13 ขั้นตอน
            <span className="ml-2 font-mono text-[18px] font-light text-[color:var(--color-muted-fg)]">
              S1 → S11
            </span>
          </h2>
          <p className="mt-1 max-w-2xl text-[14px] font-light text-[color:var(--color-muted-fg)]">
            แต่ละขั้นจะรอ approval จากผู้ใช้ก่อนเริ่มขั้นถัดไป — ทำให้ไม่หลงไปทำสิ่งที่ไม่ต้องการ
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-metier-orange/30 bg-[color:var(--color-metier-orange)]/[0.06] px-3 py-1.5">
          <CheckCircle2 className="h-4 w-4 text-metier-orange" />
          <span className="text-[13px] tabular-nums">
            <strong className="text-metier-orange">{done}</strong>
            <span className="mx-0.5 text-[color:var(--color-muted)]">/</span>
            {total} ขั้น
          </span>
        </div>
      </div>

      {/* Progress strip — 13 dots, click jumps via anchor (cosmetic for now) */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "group relative flex items-center",
            )}
          >
            <span
              className={cn(
                "block h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-150",
                s.status === "done" && "bg-metier-orange",
                s.status === "in_progress" && "bg-amber-500 animate-pulse",
                s.status === "pending" && "bg-[color:var(--color-border)]",
              )}
              title={`${s.id} · ${s.title}`}
            />
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "ml-1.5 h-px w-3",
                  s.status === "done" ? "bg-metier-orange/60" : "bg-[color:var(--color-border)]",
                )}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Slim progress bar underneath */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
        <motion.div
          className="h-full rounded-full bg-metier-orange"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
