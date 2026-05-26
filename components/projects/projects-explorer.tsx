"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, FileText, Search, X } from "lucide-react";
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
import { pdfFull, pdfShort } from "@/lib/data/pdf-labels";
import type { ProjectRecord } from "@/types/db";

type SortKey =
  | "name"
  | "dept"
  | "budget"
  | "id"
  | "b2568"
  | "b2569"
  | "b2570";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;
const ALL = "__all__";

// Years 2566 and 2567 were removed per spec — the plan period left in scope
// for the analysis is 2568/2569/2570.
const YEARS = [2568, 2569, 2570] as const;

export function ProjectsExplorer({
  initialProjects,
  strategies,
  departments,
}: {
  initialProjects: ProjectRecord[];
  strategies: string[];
  departments: string[];
}) {
  const [q, setQ] = useState("");
  const [strategy, setStrategy] = useState<string>(ALL);
  const [dept, setDept] = useState<string>(ALL);
  const [pdfSrc, setPdfSrc] = useState<string>(ALL);
  const [activeYear, setActiveYear] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("budget");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [agencyExpanded, setAgencyExpanded] = useState(false);

  const pdfSources = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialProjects) {
      if (p.source_pdf_file) set.add(p.source_pdf_file);
    }
    return Array.from(set).sort();
  }, [initialProjects]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initialProjects.filter((p) => {
      if (strategy !== ALL && p.work_category_layer1 !== strategy) return false;
      if (dept !== ALL && p.responsible_department !== dept) return false;
      if (pdfSrc !== ALL && p.source_pdf_file !== pdfSrc) return false;
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
  }, [initialProjects, q, strategy, dept, pdfSrc, activeYear]);

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
    let total = 0;
    const perYear: Record<number, number> = { 2568: 0, 2569: 0, 2570: 0 };
    const pdfSet = new Set<string>();
    const deptSet = new Set<string>();
    for (const p of filtered) {
      total += Number(p.total_budget) || 0;
      for (const y of YEARS) {
        perYear[y] += Number(p[`budget_${y}` as keyof ProjectRecord] as number) || 0;
      }
      if (p.source_pdf_file) pdfSet.add(p.source_pdf_file);
      if (p.responsible_department) deptSet.add(p.responsible_department);
    }
    return { total, perYear, pdfCount: pdfSet.size, deptCount: deptSet.size };
  }, [filtered]);

  // Per-agency × year breakdown (only 2568/2569/2570)
  const byAgency = useMemo(() => {
    type Row = { name: string; y2568: number; y2569: number; y2570: number; total: number };
    const map = new Map<string, Row>();
    for (const p of filtered) {
      const name = p.responsible_department || "(ไม่ระบุหน่วยงาน)";
      const row = map.get(name) ?? { name, y2568: 0, y2569: 0, y2570: 0, total: 0 };
      row.y2568 += Number(p.budget_2568) || 0;
      row.y2569 += Number(p.budget_2569) || 0;
      row.y2570 += Number(p.budget_2570) || 0;
      row.total = row.y2568 + row.y2569 + row.y2570;
      map.set(name, row);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const agencyMaxTotal = byAgency.reduce((m, r) => Math.max(m, r.total), 0);
  const agencyVisible = agencyExpanded ? byAgency : byAgency.slice(0, 10);

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
    setPdfSrc(ALL);
    setActiveYear(ALL);
    setPage(0);
  };

  const filtersActive =
    q !== "" || strategy !== ALL || dept !== ALL || pdfSrc !== ALL || activeYear !== ALL;

  return (
    <div className="space-y-6">
      {/* KPI strip — focused on scope (not on Metier budget) */}
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
          label="ที่มา (PDF)"
          value={stats.pdfCount.toLocaleString("th-TH")}
          unit="ไฟล์"
          hint={`จากทั้งหมด ${pdfSources.length} ไฟล์ต้นทาง`}
        />
        <KpiCard
          label="หน่วยงาน"
          value={stats.deptCount.toLocaleString("th-TH")}
          unit="หน่วย"
          hint={`จากทั้งหมด ${departments.length} หน่วย`}
        />
      </motion.div>

      {/* Per-year breakdown bar (2568/2569/2570 only) */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white">
        <div className="grid grid-cols-3 divide-x divide-[color:var(--color-border)]">
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
                    "text-[20px] font-bold tabular-nums",
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

      {/* Per-agency × year breakdown (replaces the old "Metier budget" KPIs) */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white">
        <div className="flex items-baseline justify-between gap-3 px-4 py-3 border-b border-[color:var(--color-border)]">
          <div>
            <h3 className="text-[16px] font-bold">งบประมาณตามหน่วยงาน × ปี</h3>
            <p className="text-[12px] text-[color:var(--color-muted-fg)]">
              เรียงจากงบรวม (2568+2569+2570) มาก → น้อย ·{" "}
              {agencyExpanded
                ? `แสดงทั้งหมด ${byAgency.length} หน่วย`
                : `แสดง 10 อันดับแรก จากทั้งหมด ${byAgency.length} หน่วย`}
            </p>
          </div>
          {byAgency.length > 10 && (
            <Button size="sm" variant="ghost" onClick={() => setAgencyExpanded((x) => !x)}>
              {agencyExpanded ? "ย่อ" : "ดูทั้งหมด"}
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-[color:var(--color-subtle)]/60 text-left text-[color:var(--color-muted-fg)]">
              <tr>
                <th className="w-[32px] px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">หน่วยงาน</th>
                <th className="w-[110px] px-3 py-2 text-right font-medium">2568</th>
                <th className="w-[110px] px-3 py-2 text-right font-medium">2569</th>
                <th className="w-[110px] px-3 py-2 text-right font-medium">2570</th>
                <th className="w-[140px] border-l border-[color:var(--color-border)] px-3 py-2 text-right font-medium">
                  รวม
                </th>
                <th className="w-[160px] px-3 py-2 font-medium">สัดส่วน</th>
              </tr>
            </thead>
            <tbody>
              {agencyVisible.map((r, i) => {
                const pct = agencyMaxTotal ? (r.total / agencyMaxTotal) * 100 : 0;
                return (
                  <tr
                    key={r.name}
                    className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-subtle)]/40"
                  >
                    <td className="px-3 py-2 align-top tabular-nums text-[color:var(--color-muted)]">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 align-top font-medium">{r.name}</td>
                    <YearCell value={r.y2568} active={activeYear === "2568"} />
                    <YearCell value={r.y2569} active={activeYear === "2569"} />
                    <YearCell value={r.y2570} active={activeYear === "2570"} />
                    <td className="border-l border-[color:var(--color-border)] px-3 py-2 align-top text-right tabular-nums font-bold">
                      {formatBahtCompact(r.total)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                        <div
                          className="h-full rounded-full bg-metier-orange/80"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {agencyVisible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[color:var(--color-muted)]">
                    ไม่มีข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
        <div className="w-[220px]">
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
        <div className="w-[160px]">
          <Select value={pdfSrc} onValueChange={(v) => { setPdfSrc(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="ที่มา PDF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ที่มา PDF ทั้งหมด</SelectItem>
              {pdfSources.map((s) => (
                <SelectItem key={s} value={s}>{pdfShort(s)}</SelectItem>
              ))}
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
                <SortableTh label="ชื่อโครงการ + ที่มา" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                <SortableTh label="หน่วยงาน" k="dept" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[170px]" />
                {YEARS.map((y) => (
                  <SortableTh
                    key={y}
                    label={String(y)}
                    k={`b${y}` as SortKey}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    className={cn(
                      "w-[100px] text-right",
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
                  className="w-[120px] text-right border-l border-[color:var(--color-border)]"
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
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--color-muted)]">
                      {p.source_pdf_file && (
                        <Badge
                          variant="outline"
                          className="gap-1 px-1.5 py-0 text-[10.5px]"
                          title={`${pdfFull(p.source_pdf_file)}${p.source_page ? ` · หน้า ${p.source_page}` : ""}`}
                        >
                          <FileText className="h-2.5 w-2.5" />
                          {pdfShort(p.source_pdf_file)}
                          {p.source_page ? ` · น.${p.source_page}` : ""}
                        </Badge>
                      )}
                      {p.work_category_layer2 && (
                        <span>
                          {p.work_category_layer1} · {p.work_category_layer2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top text-[13px]">{p.responsible_department || "—"}</td>
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
                  <td colSpan={6 + YEARS.length} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
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

function YearCell({ value, active }: { value: number; active: boolean }) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-top text-right tabular-nums",
        value > 0 ? "text-fg" : "text-[color:var(--color-muted)]",
        active && value > 0 && "font-bold text-metier-orange",
      )}
    >
      {value > 0 ? formatBahtCompact(value) : "—"}
    </td>
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
