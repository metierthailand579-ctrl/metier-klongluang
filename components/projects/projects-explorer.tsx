"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import type { ProjectRecord } from "@/types/db";

type SortKey =
  | "name"
  | "dept"
  | "budget"
  | "id"
  | "b2566"
  | "b2567"
  | "b2568"
  | "b2569"
  | "b2570";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;
const ALL = "__all__";

const YEARS = [2566, 2567, 2568, 2569, 2570] as const;

const METIER_TIER_BADGE: Record<string, "default" | "muted" | "outline"> = {
  "CREATIVE PRODUCTION": "default",
  "SOFTWARE DEVELOPMENT": "default",
  "MEDIA MANAGEMENT": "default",
  MARKETING: "default",
  NOT_APPLICABLE: "muted",
};

export function ProjectsExplorer({
  initialProjects,
  strategies,
  departments,
  metierAreas,
}: {
  initialProjects: ProjectRecord[];
  strategies: string[];
  departments: string[];
  metierAreas: string[];
}) {
  const [q, setQ] = useState("");
  const [strategy, setStrategy] = useState<string>(ALL);
  const [dept, setDept] = useState<string>(ALL);
  const [metier, setMetier] = useState<string>(ALL);
  const [activeYear, setActiveYear] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("budget");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialProjects.filter((p) => {
      if (strategy !== ALL && p.work_category_layer1 !== strategy) return false;
      if (dept !== ALL && p.responsible_department !== dept) return false;
      if (metier !== ALL) {
        if (metier === "METIER_ANY") {
          if (p.metier_service_area_layer1 === "NOT_APPLICABLE") return false;
        } else if (p.metier_service_area_layer1 !== metier) return false;
      }
      if (activeYear !== ALL) {
        const v = Number(p[`budget_${activeYear}` as keyof ProjectRecord] as number) || 0;
        if (v <= 0) return false;
      }
      if (needle) {
        const hay = `${p.project_name_th ?? ""} ${p.responsible_department ?? ""} ${p.work_category_layer2 ?? ""} ${p.location ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [initialProjects, q, strategy, dept, metier, activeYear]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * (a.project_name_th || "").localeCompare(b.project_name_th || "", "th");
        case "dept":
          return dir * (a.responsible_department || "").localeCompare(b.responsible_department || "", "th");
        case "budget":
          return dir * ((a.total_budget || 0) - (b.total_budget || 0));
        case "b2566":
        case "b2567":
        case "b2568":
        case "b2569":
        case "b2570": {
          const yr = sortKey.slice(1);
          const av = Number(a[`budget_${yr}` as keyof ProjectRecord] as number) || 0;
          const bv = Number(b[`budget_${yr}` as keyof ProjectRecord] as number) || 0;
          return dir * (av - bv);
        }
        case "id":
        default:
          return dir * a.master_project_id.localeCompare(b.master_project_id);
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages - 1);
  const pageData = sorted.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

  const stats = useMemo(() => {
    let total = 0,
      metierCount = 0,
      metierBudget = 0;
    const perYear: Record<number, number> = { 2566: 0, 2567: 0, 2568: 0, 2569: 0, 2570: 0 };
    for (const p of filtered) {
      const b = Number(p.total_budget) || 0;
      total += b;
      for (const y of YEARS) {
        perYear[y] += Number(p[`budget_${y}` as keyof ProjectRecord] as number) || 0;
      }
      if (p.metier_service_area_layer1 && p.metier_service_area_layer1 !== "NOT_APPLICABLE") {
        metierCount += 1;
        metierBudget += b;
      }
    }
    return { total, metierCount, metierBudget, perYear };
  }, [filtered]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
    setPage(0);
  };

  const reset = () => {
    setQ("");
    setStrategy(ALL);
    setDept(ALL);
    setMetier(ALL);
    setActiveYear(ALL);
    setPage(0);
  };

  const filtersActive =
    q !== "" || strategy !== ALL || dept !== ALL || metier !== ALL || activeYear !== ALL;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <KpiCard
          label="โครงการที่แสดง"
          value={filtered.length.toLocaleString("th-TH")}
          unit={`/ ${initialProjects.length.toLocaleString("th-TH")}`}
          hint="หลังกรอง"
        />
        <KpiCard
          label="งบประมาณรวม"
          value={formatBahtCompact(stats.total)}
          unit="บาท"
          hint={formatBaht(stats.total) + " บาท"}
        />
        <KpiCard
          label="Metier-relevant"
          value={stats.metierCount.toLocaleString("th-TH")}
          unit="โครงการ"
          accent
          hint={
            filtered.length
              ? `${((stats.metierCount / filtered.length) * 100).toFixed(1)}% ของที่แสดง`
              : "—"
          }
        />
        <KpiCard
          label="งบ Metier"
          value={formatBahtCompact(stats.metierBudget)}
          unit="บาท"
          accent
          hint={formatBaht(stats.metierBudget) + " บาท"}
        />
      </motion.div>

      {/* Per-year breakdown bar */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white">
        <div className="grid grid-cols-5 divide-x divide-[color:var(--color-border)]">
          {YEARS.map((y) => {
            const v = stats.perYear[y];
            const pct = stats.total ? (v / stats.total) * 100 : 0;
            const active = activeYear === String(y);
            return (
              <button
                key={y}
                onClick={() => {
                  setActiveYear(active ? ALL : String(y));
                  setPage(0);
                }}
                className={cn(
                  "flex flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-[color:var(--color-subtle)]/60",
                  active && "bg-[color:var(--color-metier-orange)]/[0.06]",
                )}
                title={active ? "ปิดฟิลเตอร์ปีนี้" : `กรองเฉพาะโครงการที่มีงบปี ${y}`}
              >
                <div className="flex w-full items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "text-[12px] uppercase tracking-wide",
                      active ? "text-metier-orange font-bold" : "text-[color:var(--color-muted)]",
                    )}
                  >
                    พ.ศ. {y}
                  </span>
                  <span className="text-[10px] tabular-nums text-[color:var(--color-muted)]">
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div
                  className={cn(
                    "text-[18px] font-bold tabular-nums",
                    active && "text-metier-orange",
                  )}
                >
                  {formatBahtCompact(v)}
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      active ? "bg-metier-orange" : "bg-black/60",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-white p-4">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน / พื้นที่..."
            className="pl-8"
          />
        </div>
        <div className="w-[200px]">
          <Select value={strategy} onValueChange={(v) => { setStrategy(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="ยุทธศาสตร์ทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ยุทธศาสตร์ทั้งหมด</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Select value={dept} onValueChange={(v) => { setDept(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="หน่วยงานทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>หน่วยงานทั้งหมด</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Select value={metier} onValueChange={(v) => { setMetier(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="Metier (ทั้งหมด)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Metier (ทั้งหมด)</SelectItem>
              <SelectItem value="METIER_ANY">เฉพาะ Metier (ทุก area)</SelectItem>
              {metierAreas
                .filter((a) => a !== "NOT_APPLICABLE")
                .map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              <SelectItem value="NOT_APPLICABLE">เฉพาะ NOT_APPLICABLE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filtersActive && (
          <Button size="sm" variant="ghost" onClick={reset}>
            <X className="h-3.5 w-3.5" /> ล้างฟิลเตอร์
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px]">
            <thead className="bg-[color:var(--color-subtle)] text-left">
              <tr>
                <SortableTh label="รหัส" k="id" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[130px]" />
                <SortableTh label="ชื่อโครงการ" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                <SortableTh label="หน่วยงาน" k="dept" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[160px]" />
                <th className="w-[140px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">Metier</th>
                {YEARS.map((y) => (
                  <SortableTh
                    key={y}
                    label={String(y)}
                    k={`b${y}` as SortKey}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className={cn(
                      "w-[88px] text-right",
                      activeYear === String(y) && "bg-[color:var(--color-metier-orange)]/[0.06]",
                    )}
                    align="right"
                  />
                ))}
                <SortableTh
                  label="รวม"
                  k="budget"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  className="w-[110px] text-right border-l border-[color:var(--color-border)]"
                  align="right"
                />
              </tr>
            </thead>
            <tbody>
              {pageData.map((p, i) => (
                <tr
                  key={p.master_project_id}
                  className={cn(
                    "border-t border-[color:var(--color-border)] transition-colors hover:bg-[color:var(--color-subtle)]/60",
                    i % 2 === 1 && "bg-[color:var(--color-subtle)]/30",
                  )}
                >
                  <td className="px-3 py-2 align-top font-mono text-[12px] text-[color:var(--color-muted)]">
                    {p.master_project_id}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="font-medium leading-snug">{p.project_name_th}</div>
                    {p.work_category_layer2 && (
                      <div className="mt-0.5 text-[12px] text-[color:var(--color-muted)]">
                        {p.work_category_layer1} · {p.work_category_layer2}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-[13px]">{p.responsible_department || "—"}</td>
                  <td className="px-3 py-2 align-top">
                    {p.metier_service_area_layer1 ? (
                      <Badge
                        variant={METIER_TIER_BADGE[p.metier_service_area_layer1] || "muted"}
                        className="whitespace-normal"
                      >
                        {p.metier_service_area_layer1 === "NOT_APPLICABLE"
                          ? "—"
                          : p.metier_service_area_layer1}
                      </Badge>
                    ) : (
                      <span className="text-[color:var(--color-muted)]">—</span>
                    )}
                  </td>
                  {YEARS.map((y) => {
                    const v = Number(p[`budget_${y}` as keyof ProjectRecord] as number) || 0;
                    const active = activeYear === String(y);
                    return (
                      <td
                        key={y}
                        className={cn(
                          "px-3 py-2 align-top text-right tabular-nums",
                          v > 0 ? "text-fg" : "text-[color:var(--color-muted)]",
                          active && v > 0 && "font-bold text-metier-orange",
                        )}
                      >
                        {v > 0 ? formatBahtCompact(v) : "—"}
                      </td>
                    );
                  })}
                  <td className="border-l border-[color:var(--color-border)] px-3 py-2 align-top text-right tabular-nums font-bold">
                    {formatBaht(p.total_budget)}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
                    ไม่พบโครงการตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sorted.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] px-4 py-3 text-[13px] text-[color:var(--color-muted-fg)]">
            <span>
              แสดง {pageSafe * PAGE_SIZE + 1}–{Math.min(sorted.length, (pageSafe + 1) * PAGE_SIZE)} จาก{" "}
              {sorted.length.toLocaleString("th-TH")}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>
                ก่อนหน้า
              </Button>
              <span className="px-2 tabular-nums">
                {pageSafe + 1} / {pages}
              </span>
              <Button size="sm" variant="outline" disabled={pageSafe >= pages - 1} onClick={() => setPage(pageSafe + 1)}>
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <th className={cn("px-3 py-2 font-medium text-[color:var(--color-muted-fg)]", className)}>
      <button
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-fg",
          align === "right" && "flex-row-reverse w-full justify-start",
          active && "text-fg",
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
