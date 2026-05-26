"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ChevronRight, Flag, Search, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/kpi-card";
import { YearBudgetStrip } from "@/components/year-budget-strip";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useSyncedState } from "@/lib/shared-state";
import type { ProjectRecord } from "@/types/db";
import {
  GROUP_COLOR,
  METIER_GROUPS,
  MUNICIPAL_GROUPS,
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

// Map a quarter (e.g. "2569-Q2") to the year-specific budget column name.
function quarterBudgetKey(q: QuarterKey): "budget_2568" | "budget_2569" | "budget_2570" {
  return q.startsWith("2570") ? "budget_2570" : "budget_2569";
}

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

  const allItems = useMemo(() => {
    const set = new Set(selectedIds);
    return projects.filter((p) => set.has(p.master_project_id));
  }, [projects, selectedIds]);

  // Filter UI state — every chart/bucket downstream reads `items` so flipping
  // a chip immediately updates the load chart, quarter columns, and KPIs.
  const [q, setQ] = useState("");
  const [selectedMains, setSelectedMains] = useState<Set<string>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<Priority>>(new Set());
  const [selectedYears, setSelectedYears] = useState<Set<2569 | 2570>>(new Set());
  const [confirmedOnly, setConfirmedOnly] = useState<"all" | "confirmed" | "pending">(
    "all",
  );
  const [hideUnscheduled, setHideUnscheduled] = useState(false);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allItems.filter((p) => {
      const meta = metaMap[p.master_project_id];
      const cf = confirmMap[p.master_project_id];
      if (selectedMains.size && !selectedMains.has(getMainGroup(p, overrides))) {
        return false;
      }
      if (selectedPriorities.size && !selectedPriorities.has(meta?.priority ?? ("" as Priority))) {
        return false;
      }
      if (selectedYears.size) {
        // Year filter: project's start_q must land in one of the selected years
        const yr =
          meta?.start_q?.startsWith("2570") ? 2570
            : meta?.start_q?.startsWith("2569") ? 2569
            : null;
        if (yr == null || !selectedYears.has(yr as 2569 | 2570)) return false;
      }
      if (confirmedOnly === "confirmed" && !cf?.confirmed) return false;
      if (confirmedOnly === "pending" && cf?.confirmed) return false;
      if (hideUnscheduled && !meta?.start_q) return false;
      if (needle) {
        const hay =
          `${p.project_name_th ?? ""} ${p.responsible_department ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    allItems,
    metaMap,
    confirmMap,
    overrides,
    q,
    selectedMains,
    selectedPriorities,
    selectedYears,
    confirmedOnly,
    hideUnscheduled,
  ]);

  const filtersActive =
    q !== "" ||
    selectedMains.size > 0 ||
    selectedPriorities.size > 0 ||
    selectedYears.size > 0 ||
    confirmedOnly !== "all" ||
    hideUnscheduled;

  const toggleSet = <T,>(set: Set<T>, value: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const resetFilters = () => {
    setQ("");
    setSelectedMains(new Set());
    setSelectedPriorities(new Set());
    setSelectedYears(new Set());
    setConfirmedOnly("all");
    setHideUnscheduled(false);
  };

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

    // Per-quarter totals — use that year's budget allocation so the bar
    // chart reflects what work actually lands in that calendar slice.
    const totals = new Map<QuarterKey, { count: number; budget: number }>();
    for (const q of QUARTERS) {
      const list = byQ.get(q)!;
      const yearKey = quarterBudgetKey(q);
      totals.set(q, {
        count: list.length,
        budget: list.reduce(
          (s, p) => s + (Number(p[yearKey as keyof ProjectRecord]) || 0),
          0,
        ),
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

  if (allItems.length === 0) {
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

      <YearBudgetStrip projects={items} title="งบประมาณตามปี (หลังกรอง)" />

      {/* Filter toolbar */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน..."
                className="pl-8"
              />
            </div>
            <div className="text-[12px] text-[color:var(--color-muted-fg)]">
              แสดง{" "}
              <span className="font-bold text-fg tabular-nums">
                {items.length.toLocaleString("th-TH")}
              </span>{" "}
              / {allItems.length.toLocaleString("th-TH")} โครงการ
            </div>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> ล้าง
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-[color:var(--color-muted-fg)]">ปี:</span>
            {([2569, 2570] as const).map((y) => (
              <TFilterChip
                key={y}
                active={selectedYears.has(y)}
                onClick={() => toggleSet(selectedYears, y, setSelectedYears)}
              >
                {y}
              </TFilterChip>
            ))}

            <span className="ml-3 text-[color:var(--color-muted-fg)]">สถานะ:</span>
            {(
              [
                ["all", "ทั้งหมด"],
                ["confirmed", "ยืนยันแล้ว"],
                ["pending", "ยังไม่ยืนยัน"],
              ] as const
            ).map(([k, label]) => (
              <TFilterChip
                key={k}
                active={confirmedOnly === k}
                onClick={() => setConfirmedOnly(k)}
              >
                {label}
              </TFilterChip>
            ))}

            <span className="ml-3 text-[color:var(--color-muted-fg)]">Priority:</span>
            {(
              [
                ["urgent", "🔥 Urgent"],
                ["high", "↑ High"],
                ["medium", "— Medium"],
                ["low", "↓ Low"],
              ] as const
            ).map(([k, label]) => (
              <TFilterChip
                key={k}
                color={priorityColor(k as Priority)}
                active={selectedPriorities.has(k as Priority)}
                onClick={() =>
                  toggleSet(selectedPriorities, k as Priority, setSelectedPriorities)
                }
              >
                {label}
              </TFilterChip>
            ))}

            <span className="ml-3 text-[color:var(--color-muted-fg)]">
              <TFilterChip
                active={hideUnscheduled}
                onClick={() => setHideUnscheduled((x) => !x)}
              >
                ซ่อน "ยังไม่ตั้งไตรมาส"
              </TFilterChip>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="text-[color:var(--color-muted-fg)]">Main Group:</span>
            {[...METIER_GROUPS, ...MUNICIPAL_GROUPS].map((g) => (
              <TFilterChip
                key={g}
                color={GROUP_COLOR[g]}
                active={selectedMains.has(g)}
                onClick={() => toggleSet(selectedMains, g, setSelectedMains)}
              >
                {g}
              </TFilterChip>
            ))}
          </div>
        </CardContent>
      </Card>

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

function TFilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] transition-all",
        active && !color && "border-fg bg-fg text-white",
        !active &&
          "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
      )}
      style={
        active && color
          ? { background: color, borderColor: color, color: "white" }
          : !active && color
            ? { borderColor: color, color }
            : undefined
      }
    >
      {children}
    </button>
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
  const isUnscheduled = quarter === "UNSCHEDULED";
  // For scheduled quarters: sum the year-specific budget column so the
  // header reflects budget that lands in this calendar slice (not the
  // full multi-year project total).
  const yearKey =
    isUnscheduled ? null : quarterBudgetKey(quarter as QuarterKey);
  const totalBudget = projects.reduce(
    (s, p) =>
      s +
      (yearKey
        ? Number(p[yearKey as keyof ProjectRecord]) || 0
        : Number(p.total_budget) || 0),
    0,
  );

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
              yearKey={yearKey}
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
  yearKey,
  meta,
  confirm,
  overrides,
}: {
  project: ProjectRecord;
  yearKey: "budget_2568" | "budget_2569" | "budget_2570" | null;
  meta?: ProjectMeta;
  confirm?: ConfirmRecord;
  overrides: OverrideMap;
}) {
  const main = getMainGroup(project, overrides);
  const groupColor = GROUP_COLOR[main] ?? "#94a3b8";
  const pColor = meta?.priority ? priorityColor(meta.priority) : null;
  // When the project sits in a scheduled quarter, show the budget for THAT
  // year (e.g. only what hits 2569 budget if it's in 2569-Q3). Fall back
  // to total when the quarter is "UNSCHEDULED" or that year is 0.
  const total = Number(project.total_budget) || 0;
  const yearBudget = yearKey ? Number(project[yearKey as keyof ProjectRecord]) || 0 : 0;
  const showYear = yearKey != null;
  const primaryBudget = showYear && yearBudget > 0 ? yearBudget : total;
  const yearLabel = yearKey === "budget_2570" ? "2570" : yearKey === "budget_2569" ? "2569" : "2568";
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
          <div
            className="text-[13px] font-bold tabular-nums"
            style={{ color: groupColor }}
            title={
              showYear
                ? `งบปี ${yearLabel}: ${formatBahtCompact(yearBudget)} / รวมโครงการ: ${formatBahtCompact(total)}`
                : `งบรวม: ${formatBahtCompact(total)}`
            }
          >
            {formatBahtCompact(primaryBudget)}
          </div>
          {showYear && (
            <div className="text-[9px] text-[color:var(--color-muted)] leading-tight">
              งบ {yearLabel}
              {yearBudget === 0 && total > 0 && (
                <span className="ml-0.5 opacity-70">· รวม</span>
              )}
            </div>
          )}
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
