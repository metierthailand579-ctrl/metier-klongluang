"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ChevronRight, Flag } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useSyncedState } from "@/lib/shared-state";
import type { ProjectRecord } from "@/types/db";
import {
  GROUP_COLOR,
  getMainGroup,
  type OverrideMap,
} from "@/lib/data/metier-taxonomy";
import {
  priorityColor,
  priorityLabel,
  type ConfirmRecord,
  type Priority,
  type ProjectMeta,
  type StartQuarter,
} from "@/components/selected/selected-explorer";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const META_KEY = "khlongluang.projectMeta.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";
const GROUP_OVERRIDES_KEY = "klongluang.groupOverrides.v1";

type QuarterKey = Exclude<StartQuarter, "">;
const QUARTERS: QuarterKey[] = [
  "2569-Q1",
  "2569-Q2",
  "2569-Q3",
  "2569-Q4",
  "2570-Q1",
  "2570-Q2",
  "2570-Q3",
  "2570-Q4",
];

// Priority weight for sorting cards within a quarter — higher = render first.
const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  "": 0,
};

export function TimelineView({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated] = useSyncedState<string[]>(SELECTED_KEY, []);
  const [metaMap] = useSyncedState<Record<string, ProjectMeta>>(META_KEY, {});
  const [confirmMap] = useSyncedState<Record<string, ConfirmRecord>>(CONFIRM_KEY, {});
  const [overrides] = useSyncedState<OverrideMap>(GROUP_OVERRIDES_KEY, {});

  const items = useMemo(() => {
    const set = new Set(selectedIds);
    return projects.filter((p) => set.has(p.master_project_id));
  }, [projects, selectedIds]);

  // Bucket into quarters; cards without a start_q go in "unscheduled".
  const buckets = useMemo(() => {
    const byQ = new Map<QuarterKey, ProjectRecord[]>();
    for (const q of QUARTERS) byQ.set(q, []);
    const unscheduled: ProjectRecord[] = [];
    for (const p of items) {
      const meta = metaMap[p.master_project_id];
      const q = meta?.start_q as QuarterKey | "" | undefined;
      if (q && QUARTERS.includes(q)) {
        byQ.get(q)!.push(p);
      } else {
        unscheduled.push(p);
      }
    }
    // Sort each bucket by priority desc, then by budget desc
    const sortFn = (a: ProjectRecord, b: ProjectRecord) => {
      const ap = metaMap[a.master_project_id]?.priority ?? "";
      const bp = metaMap[b.master_project_id]?.priority ?? "";
      const dp = PRIORITY_WEIGHT[bp] - PRIORITY_WEIGHT[ap];
      if (dp !== 0) return dp;
      return (Number(b.total_budget) || 0) - (Number(a.total_budget) || 0);
    };
    for (const q of QUARTERS) byQ.get(q)!.sort(sortFn);
    unscheduled.sort(sortFn);

    // Per-quarter totals
    const totals = new Map<QuarterKey, { count: number; budget: number }>();
    for (const q of QUARTERS) {
      const list = byQ.get(q)!;
      totals.set(q, {
        count: list.length,
        budget: list.reduce((s, p) => s + (Number(p.total_budget) || 0), 0),
      });
    }
    return { byQ, unscheduled, totals };
  }, [items, metaMap]);

  const summary = useMemo(() => {
    const total = items.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const scheduled = items.length - buckets.unscheduled.length;
    const urgent = items.filter(
      (p) => metaMap[p.master_project_id]?.priority === "urgent",
    ).length;
    const high = items.filter(
      (p) => metaMap[p.master_project_id]?.priority === "high",
    ).length;
    return { count: items.length, total, scheduled, urgent, high };
  }, [items, metaMap, buckets.unscheduled]);

  const maxQuarterBudget = useMemo(() => {
    let m = 0;
    for (const q of QUARTERS) {
      const v = buckets.totals.get(q)?.budget ?? 0;
      if (v > m) m = v;
    }
    return m;
  }, [buckets.totals]);

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-[color:var(--color-muted)]">
        กำลังโหลด...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-12 text-center">
        <CalendarClock className="mx-auto mb-3 h-10 w-10 text-[color:var(--color-muted)]" />
        <CardTitle>ยังไม่มีโครงการที่เลือก</CardTitle>
        <CardDescription className="mx-auto mt-2 max-w-sm">
          เลือกโครงการในหน้า{" "}
          <a href="/filter" className="font-medium text-metier-orange underline">
            5 · คัดเลือก
          </a>{" "}
          แล้วตั้งไตรมาส + Priority ในหน้า{" "}
          <a href="/selected" className="font-medium text-metier-orange underline">
            6 · TOR + SOW
          </a>
        </CardDescription>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <KpiCard
          label="โครงการที่เลือก"
          value={summary.count.toLocaleString("th-TH")}
          unit="รายการ"
        />
        <KpiCard
          label="ตั้งไตรมาสแล้ว"
          value={summary.scheduled.toLocaleString("th-TH")}
          unit={`/ ${summary.count.toLocaleString("th-TH")}`}
          accent
          hint={
            summary.count
              ? `${((summary.scheduled / summary.count) * 100).toFixed(0)}% scheduled`
              : ""
          }
        />
        <KpiCard
          label="งบประมาณรวม"
          value={formatBahtCompact(summary.total)}
          unit="บาท"
          hint={formatBaht(summary.total) + " บาท"}
        />
        <KpiCard
          label="Priority Urgent + High"
          value={(summary.urgent + summary.high).toLocaleString("th-TH")}
          unit={`(🔥${summary.urgent} ↑${summary.high})`}
        />
      </motion.div>

      {/* Quarter load bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3">
            <CardTitle className="text-[15px]">Load ต่อไตรมาส</CardTitle>
            <CardDescription>
              งบประมาณรวม + จำนวนโครงการ ต่อไตรมาส (สัดส่วน bar = เทียบกับไตรมาสที่มากสุด)
            </CardDescription>
          </div>
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
            {QUARTERS.map((q) => {
              const t = buckets.totals.get(q)!;
              const pct = maxQuarterBudget ? (t.budget / maxQuarterBudget) * 100 : 0;
              return (
                <div key={q} className="flex flex-col gap-1">
                  <div className="text-[11px] font-mono text-[color:var(--color-muted)]">
                    {q.replace("-", " ")}
                  </div>
                  <div className="text-[16px] font-bold tabular-nums">
                    {t.count}
                  </div>
                  <div className="text-[11px] text-[color:var(--color-muted-fg)]">
                    {formatBahtCompact(t.budget)}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                    <motion.div
                      className="h-full rounded-full bg-metier-orange"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Kanban-style columns — 2 rows of 4 quarters each */}
      <div className="space-y-4">
        {[
          { year: 2569, quarters: QUARTERS.slice(0, 4) },
          { year: 2570, quarters: QUARTERS.slice(4) },
        ].map((row) => (
          <div key={row.year}>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-[18px] font-bold">ปี {row.year}</h2>
              <span className="text-[12px] text-[color:var(--color-muted)]">
                ·{" "}
                {row.quarters.reduce(
                  (s, q) => s + (buckets.totals.get(q)?.count ?? 0),
                  0,
                )}{" "}
                โครงการ ·{" "}
                {formatBahtCompact(
                  row.quarters.reduce(
                    (s, q) => s + (buckets.totals.get(q)?.budget ?? 0),
                    0,
                  ),
                )}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {row.quarters.map((q) => (
                <QuarterColumn
                  key={q}
                  quarter={q}
                  projects={buckets.byQ.get(q) ?? []}
                  metaMap={metaMap}
                  confirmMap={confirmMap}
                  overrides={overrides}
                />
              ))}
            </div>
          </div>
        ))}

        {buckets.unscheduled.length > 0 && (
          <div>
            <div className="mb-2 flex items-baseline gap-2">
              <h2 className="text-[18px] font-bold text-[color:var(--color-muted-fg)]">
                ยังไม่ตั้งไตรมาส
              </h2>
              <span className="text-[12px] text-[color:var(--color-muted)]">
                · {buckets.unscheduled.length} โครงการ — ตั้ง start_q ในหน้า{" "}
                <a href="/selected" className="underline">
                  6 · TOR + SOW
                </a>{" "}
                ได้
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <QuarterColumn
                quarter="UNSCHEDULED"
                projects={buckets.unscheduled}
                metaMap={metaMap}
                confirmMap={confirmMap}
                overrides={overrides}
                fullWidth
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuarterColumn({
  quarter,
  projects,
  metaMap,
  confirmMap,
  overrides,
  fullWidth,
}: {
  quarter: QuarterKey | "UNSCHEDULED";
  projects: ProjectRecord[];
  metaMap: Record<string, ProjectMeta>;
  confirmMap: Record<string, ConfirmRecord>;
  overrides: OverrideMap;
  fullWidth?: boolean;
}) {
  const totalBudget = projects.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
  const isUnscheduled = quarter === "UNSCHEDULED";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white",
        isUnscheduled
          ? "border-dashed border-[color:var(--color-border)]"
          : "border-[color:var(--color-border)]",
        fullWidth && "lg:col-span-4 md:col-span-2",
      )}
    >
      <div className="border-b border-[color:var(--color-border)] px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-[13px] font-bold",
              isUnscheduled
                ? "text-[color:var(--color-muted-fg)]"
                : "font-mono",
            )}
          >
            {isUnscheduled ? "ยังไม่ตั้งไตรมาส" : quarter.replace("-", " ")}
          </span>
          <span className="text-[11px] tabular-nums text-[color:var(--color-muted)]">
            {projects.length} · {formatBahtCompact(totalBudget)}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-2">
        {projects.length === 0 ? (
          <div className="rounded-md py-6 text-center text-[11px] text-[color:var(--color-muted)]">
            (ไม่มีโครงการ)
          </div>
        ) : (
          projects.map((p) => (
            <ProjectChip
              key={p.master_project_id}
              project={p}
              meta={metaMap[p.master_project_id]}
              confirm={confirmMap[p.master_project_id]}
              overrides={overrides}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectChip({
  project,
  meta,
  confirm,
  overrides,
}: {
  project: ProjectRecord;
  meta?: ProjectMeta;
  confirm?: ConfirmRecord;
  overrides: OverrideMap;
}) {
  const main = getMainGroup(project, overrides);
  const groupColor = GROUP_COLOR[main] ?? "#94a3b8";
  const pColor = meta?.priority ? priorityColor(meta.priority) : null;
  return (
    <motion.a
      href="/selected"
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group block rounded-md border border-[color:var(--color-border)] bg-white p-2.5 text-[12px] transition-all hover:-translate-y-0.5 hover:shadow-sm"
      style={pColor ? { borderLeft: `3px solid ${pColor}` } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="line-clamp-2 leading-snug font-medium">
            {project.project_name_th}
          </div>
          <div className="mt-1 truncate text-[10.5px] text-[color:var(--color-muted)]">
            {project.responsible_department || "—"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[13px] font-bold tabular-nums" style={{ color: groupColor }}>
            {formatBahtCompact(Number(project.total_budget) || 0)}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {meta?.priority && (
          <Badge
            variant="outline"
            className="px-1 py-0 text-[9px] font-semibold"
            style={{ borderColor: pColor!, color: pColor! }}
          >
            <Flag className="mr-0.5 h-2 w-2" />
            {priorityLabel(meta.priority)}
          </Badge>
        )}
        {confirm?.confirmed && (
          <Badge variant="success" className="px-1 py-0 text-[9px]">
            <CheckCircle2 className="mr-0.5 h-2 w-2" />
            ยืนยัน
          </Badge>
        )}
        <Badge
          variant="outline"
          className="px-1 py-0 text-[9px]"
          style={{ borderColor: groupColor, color: groupColor }}
        >
          {main}
        </Badge>
        <ChevronRight className="ml-auto h-3 w-3 text-[color:var(--color-muted)] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </motion.a>
  );
}
