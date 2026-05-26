"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  FileText,
  ScanLine,
  Database,
  Tags,
  GitMerge,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  icon: LucideIcon;
  title: string;
  sub: string;
  highlight?: boolean;
};

export function PipelineFlow({
  totalRecords,
  metierCount,
}: {
  totalRecords: number;
  metierCount: number;
}) {
  const reduce = useReducedMotion();
  const steps: Step[] = [
    { icon: FileText, title: "PDF ต้นฉบับ", sub: "6 ไฟล์ · 764 หน้า" },
    { icon: ScanLine, title: "OCR + Vision", sub: "อ่านด้วย Claude vision + Thai OCR" },
    { icon: Database, title: "ดึงข้อมูล", sub: `${totalRecords.toLocaleString("th-TH")} โครงการ` },
    { icon: Tags, title: "จัดกลุ่ม", sub: "11 main groups (Metier + Municipal)" },
    { icon: GitMerge, title: "เช็คซ้ำ + รวม", sub: "ตัดซ้ำข้ามไฟล์ · normalize หน่วยงาน" },
    {
      icon: Sparkles,
      title: "คัดเลือก + ร่าง SOW",
      sub: `${metierCount} ตัวที่ Metier ทำได้`,
      highlight: true,
    },
  ];

  // Stagger durations chosen so the flow dot lands on each card just after it appears.
  const cardDelay = (i: number) => (reduce ? 0 : i * 0.18);
  const lineDelay = (i: number) => (reduce ? 0 : i * 0.18 + 0.12);

  return (
    <div className="relative">
      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-12 lg:grid-cols-6 lg:gap-y-0">
        {steps.map((s, i) => (
          <PipelineNode key={s.title} step={s} index={i} delay={cardDelay(i)} />
        ))}
      </div>

      {/* Flow line + animated dots — only on lg+ where cards are in one row */}
      <div className="pointer-events-none absolute inset-x-0 top-[28px] hidden lg:block">
        <div className="relative mx-auto" style={{ maxWidth: "100%" }}>
          {/* 5 gaps between 6 cards */}
          {Array.from({ length: 5 }).map((_, i) => (
            <FlowSegment key={i} index={i} delay={lineDelay(i)} reduce={!!reduce} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineNode({ step, index, delay }: { step: Step; index: number; delay: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div
        className={cn(
          "group relative flex flex-col items-center rounded-xl border bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
          step.highlight
            ? "border-metier-orange/40 shadow-[0_0_0_4px_rgba(255,80,8,0.06)]"
            : "border-[color:var(--color-border)]",
        )}
      >
        {/* Icon disc */}
        <div
          className={cn(
            "mb-2 flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            step.highlight
              ? "bg-metier-orange text-white"
              : "bg-[color:var(--color-subtle)] text-[color:var(--color-muted-fg)] group-hover:text-fg",
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </div>
        {/* Step number badge */}
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
            step.highlight
              ? "bg-metier-orange text-white"
              : "bg-fg text-white",
          )}
        >
          {index + 1}
        </span>
        <div className="text-[14px] font-bold leading-tight">{step.title}</div>
        {step.sub && (
          <div className="mt-1 text-[11px] leading-snug text-[color:var(--color-muted)]">
            {step.sub}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FlowSegment({
  index,
  delay,
  reduce,
}: {
  index: number;
  delay: number;
  reduce: boolean;
}) {
  // Each of 5 gaps gets 1/6 of the width and sits between cards.
  // We position via percentage: gap n centers at (n+1)/6 * 100% of the row.
  const leftPct = ((index + 1) / 6) * 100;
  return (
    <div
      className="absolute top-0 -translate-x-1/2"
      style={{ left: `${leftPct}%`, width: "min(160px, 14vw)", height: "1px" }}
    >
      {/* dashed line that draws in */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45, delay, ease: "easeOut" }}
        style={{ originX: 0 }}
        className="absolute inset-0 border-t border-dashed border-[color:var(--color-border)]"
      />
      {/* flow dot — slides left → right repeatedly */}
      {!reduce && (
        <motion.span
          initial={{ x: "0%", opacity: 0 }}
          whileInView={{ x: "100%", opacity: [0, 1, 1, 0] }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{
            duration: 1.4,
            delay: delay + 0.45,
            repeat: Infinity,
            repeatDelay: 1.6,
            ease: "linear",
            times: [0, 0.1, 0.9, 1],
          }}
          className="absolute -top-[3px] left-0 block h-1.5 w-1.5 rounded-full bg-metier-orange shadow-[0_0_8px_rgba(255,80,8,0.6)]"
        />
      )}
    </div>
  );
}
