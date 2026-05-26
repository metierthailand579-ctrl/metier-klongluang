"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { SummaryList, type SummaryRow } from "./summary-list";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import type { ProcurementRecord } from "@/types/db";
import {
  METHOD_COLORS,
  getCleanName,
  getDepartment,
  getProcurementMainGroup,
  getProcurementMethod,
  type ProcurementMethod,
} from "@/lib/data/history-derived";
import { GROUP_COLOR } from "@/lib/data/metier-taxonomy";

type SortKey = "name" | "agency" | "price" | "year";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;
const ALL = "__all__";

type Enriched = ProcurementRecord & {
  _dept: string;
  _method: ProcurementMethod;
  _mainGroup: string;
  _cleanName: string;
};

export function HistoryExplorer({
  records,
  years,
}: {
  records: ProcurementRecord[];
  years: number[];
}) {
  // Enrich every record once with the derived fields.
  const enriched = useMemo<Enriched[]>(
    () =>
      records.map((r) => ({
        ...r,
        _dept: getDepartment(r),
        _method: getProcurementMethod(r),
        _mainGroup: getProcurementMainGroup(r),
        _cleanName: getCleanName(r),
      })),
    [records],
  );

  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>(ALL);
  const [workType, setWorkType] = useState<string | null>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched.filter((r) => {
      if (year !== ALL && String(r.year ?? "") !== year) return false;
      if (workType && r._mainGroup !== workType) return false;
      if (dept && r._dept !== dept) return false;
      if (method && r._method !== method) return false;
      if (needle) {
        const hay = `${r.project_name ?? ""} ${r._dept} ${r.project_code ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [enriched, q, year, workType, dept, method]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * (a._cleanName || "").localeCompare(b._cleanName || "", "th");
        case "agency":
          return dir * a._dept.localeCompare(b._dept, "th");
        case "year":
          return dir * ((a.year || 0) - (b.year || 0));
        case "price":
        default:
          return dir * ((a.price || 0) - (b.price || 0));
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    let total = 0;
    const byMain = new Map<string, { count: number; value: number }>();
    const byDept = new Map<string, { count: number; value: number }>();
    const byMethod = new Map<string, { count: number; value: number }>();
    const byYear = new Map<number, { count: number; value: number }>();
    for (const r of filtered) {
      const v = Number(r.price) || 0;
      total += v;
      bump(byMain, r._mainGroup, v);
      // Skip the "(ไม่ระบุหน่วยงาน)" bucket per spec — it overwhelms the chart
      // and isn't useful for decision-making.
      if (r._dept !== "(ไม่ระบุหน่วยงาน)") bump(byDept, r._dept, v);
      bump(byMethod, r._method, v);
      if (r.year != null) bump(byYear, r.year, v);
    }
    const toRows = <K extends string | number>(
      m: Map<K, { count: number; value: number }>,
      color?: (k: K) => string | undefined,
    ): SummaryRow[] =>
      Array.from(m.entries())
        .map(([k, s]) => ({
          key: String(k),
          label: String(k),
          count: s.count,
          value: s.value,
          color: color?.(k),
        }))
        .sort((a, b) => b.value - a.value);
    return {
      total,
      count: filtered.length,
      workTypeRows: toRows(byMain, (k) => GROUP_COLOR[k as string]),
      deptRows: toRows(byDept),
      methodRows: toRows(byMethod, (k) => METHOD_COLORS[k as ProcurementMethod]),
      byYear,
    };
  }, [filtered]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages - 1);
  const pageData = sorted.slice(pageSafe * PAGE_SIZE, (pageSafe + 1) * PAGE_SIZE);

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
    setYear(ALL);
    setWorkType(null);
    setDept(null);
    setMethod(null);
    setPage(0);
  };

  const filtersActive =
    q !== "" || year !== ALL || workType !== null || dept !== null || method !== null;

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
          label="รายการที่แสดง"
          value={stats.count.toLocaleString("th-TH")}
          unit={`/ ${records.length.toLocaleString("th-TH")}`}
        />
        <KpiCard
          label="ยอดรวม"
          value={formatBahtCompact(stats.total)}
          unit="บาท"
          hint={formatBaht(stats.total) + " บาท"}
        />
        <KpiCard
          label="หน่วยงานที่พบ"
          value={stats.deptRows.length.toLocaleString("th-TH")}
          unit="หน่วย"
        />
        <KpiCard
          label="ปี"
          value={Array.from(stats.byYear.keys()).sort().join(" · ") || "—"}
          hint={
            Array.from(stats.byYear.entries())
              .sort(([a], [b]) => a - b)
              .map(([y, s]) => `${y}: ${s.count.toLocaleString("th-TH")}`)
              .join(" · ") || ""
          }
        />
      </motion.div>

      {/* Three-up summary — work type / department / procurement method */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryList
          title="ตามประเภทงาน"
          description="คลิกเพื่อ filter — derived จากชื่อโครงการ (ซื้อ / จ้าง / เช่า)"
          rows={stats.workTypeRows}
          active={workType}
          onPick={(k) => {
            setWorkType(k);
            setPage(0);
          }}
        />
        <SummaryList
          title="ตามหน่วยงาน"
          description="คลิกเพื่อ filter — derived จากวงเล็บในชื่อโครงการ"
          rows={stats.deptRows}
          active={dept}
          onPick={(k) => {
            setDept(k);
            setPage(0);
          }}
          maxRows={10}
        />
        <SummaryList
          title="ตามประเภทการจัดจ้าง"
          description="คลิกเพื่อ filter — เฉพาะเจาะจง / e-bidding / คัดเลือก"
          rows={stats.methodRows}
          active={method}
          onPick={(k) => {
            setMethod(k);
            setPage(0);
          }}
        />
      </div>

      {/* Toolbar — quick search + year + reset (the three breakdowns above act as filters) */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--color-border)] bg-white p-4">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน / เลขโครงการ..."
            className="pl-8"
          />
        </div>
        <div className="w-[140px]">
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="ปี" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกปี</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>พ.ศ. {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(workType || dept || method) && (
          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            {workType && <ActiveFilterChip label="งาน" value={workType} onClear={() => setWorkType(null)} />}
            {dept && <ActiveFilterChip label="หน่วย" value={dept} onClear={() => setDept(null)} />}
            {method && <ActiveFilterChip label="วิธี" value={method} onClear={() => setMethod(null)} />}
          </div>
        )}
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
                <th className="w-[140px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">
                  เลขโครงการ
                </th>
                <SortableTh label="ชื่อโครงการ" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                <SortableTh label="หน่วยงาน" k="agency" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[170px]" />
                <th className="w-[120px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">ประเภทงาน</th>
                <th className="w-[110px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">วิธี</th>
                <SortableTh label="ปี" k="year" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[70px] text-right" align="right" />
                <SortableTh label="ราคา (บาท)" k="price" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[140px] text-right" align="right" />
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr
                  key={r.project_code}
                  className={cn(
                    "border-t border-[color:var(--color-border)] transition-colors hover:bg-[color:var(--color-subtle)]/60",
                    i % 2 === 1 && "bg-[color:var(--color-subtle)]/30",
                  )}
                >
                  <td className="px-3 py-2 align-top font-mono text-[12px] text-[color:var(--color-muted)]">
                    {r.project_code}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="leading-snug">{r._cleanName}</div>
                  </td>
                  <td className="px-3 py-2 align-top text-[13px]">{r._dept}</td>
                  <td className="px-3 py-2 align-top">
                    <Badge
                      variant="outline"
                      className="whitespace-normal"
                      style={{
                        borderColor: GROUP_COLOR[r._mainGroup] ?? "#94a3b8",
                        color: GROUP_COLOR[r._mainGroup] ?? "#94a3b8",
                      }}
                    >
                      {r._mainGroup}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge
                      variant="outline"
                      className="whitespace-normal"
                      style={{
                        borderColor: METHOD_COLORS[r._method],
                        color: METHOD_COLORS[r._method],
                      }}
                    >
                      {r._method}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums">{r.year || "—"}</td>
                  <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                    {formatBaht(r.price)}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
                    ไม่พบรายการตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

function bump<K>(m: Map<K, { count: number; value: number }>, k: K, v: number) {
  const s = m.get(k) ?? { count: 0, value: 0 };
  s.count += 1;
  s.value += v;
  m.set(k, s);
}

function ActiveFilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-metier-orange/40 bg-[color:var(--color-metier-orange)]/[0.08] px-2 py-0.5 text-metier-orange">
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onClear}
        className="ml-0.5 rounded-full p-0.5 hover:bg-metier-orange/20"
        aria-label="clear"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
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
