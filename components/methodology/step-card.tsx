"use client";

import { motion } from "framer-motion";
import {
  Check,
  ClipboardEdit,
  Cpu,
  FileSpreadsheet,
  FolderOpen,
  GitCompare,
  GitMerge,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Package,
  SearchCheck,
  ShieldCheck,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";
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

const STEP_ICON: Record<string, LucideIcon> = {
  S1: FolderOpen,
  S2: SearchCheck,
  S3: FileSpreadsheet,
  S4: LayoutDashboard,
  S5: Cpu,
  S5b: ListChecks,
  S5c: Tags,
  S6: GitMerge,
  S7: Target,
  S8: GitCompare,
  S9: ClipboardEdit,
  S10: Package,
  S11: ShieldCheck,
};

export function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = STEP_ICON[step.id] ?? FolderOpen;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.04, 0.25),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative grid grid-cols-[auto_1fr] gap-5 pl-1"
    >
      {/* Marker — combines step number + topical icon */}
      <div className="relative">
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{
            duration: 0.45,
            delay: Math.min(index * 0.04, 0.25) + 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={cn(
            "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white shadow-sm",
            step.status === "done" && "border-metier-orange text-metier-orange",
            step.status === "in_progress" && "border-amber-500 text-amber-500",
            step.status === "pending" &&
              "border-[color:var(--color-border)] text-[color:var(--color-muted)]",
          )}
        >
          {step.status === "in_progress" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          )}
          {step.status === "done" && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-metier-orange text-white">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </motion.span>
      </div>

      {/* Body */}
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
        className="group pb-12"
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-[color:var(--color-muted-fg)]">
            {step.id}
          </span>
          <h3 className="text-[20px] font-bold leading-tight transition-colors group-hover:text-metier-orange">
            {step.title}
          </h3>
          {step.status === "done" && (
            <Badge variant="success" className="ml-1">
              เสร็จ
            </Badge>
          )}
          {step.status === "in_progress" && (
            <Badge variant="warning" className="ml-1">
              กำลังทำ
            </Badge>
          )}
          {step.status === "pending" && (
            <Badge variant="muted" className="ml-1">
              รอ
            </Badge>
          )}
          {step.meta && (
            <span className="ml-1 text-[12px] text-[color:var(--color-muted)]">
              · {step.meta}
            </span>
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
      </motion.div>
    </motion.div>
  );
}
