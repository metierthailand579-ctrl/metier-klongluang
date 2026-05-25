"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import type { ProcurementRecord } from "@/types/db";

type SortKey = "name" | "agency" | "price" | "year";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 50;
const ALL = "__all__";

export function HistoryExplorer({
  records,
  categories,
  years,
}: {
  records: ProcurementRecord[];
  categories: string[];
  years: number[];
}) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records.filter((r) => {
      if (year !== ALL && String(r.year ?? "") !== year) return false;
      if (category !== ALL && r.category !== category) return false;
      if (needle) {
        const hay = `${r.project_name ?? ""} ${r.agency ?? ""} ${r.project_code ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [records, q, year, category]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * (a.project_name || "").localeCompare(b.project_name || "", "th");
        case "agency":
          return dir * (a.agency || "").localeCompare(b.agency || "", "th");
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
    const byCat = new Map<string, { count: number; value: number }>();
    const byYear = new Map<number, { count: number; value: number }>();
    for (const r of filtered) {
      const v = Number(r.price) || 0;
      total += v;
      const cat = r.category || "(ไม่ระบุประเภท)";
      const slotC = byCat.get(cat) ?? { count: 0, value: 0 };
      slotC.count += 1;
      slotC.value += v;
      byCat.set(cat, slotC);
      if (r.year != null) {
        const slotY = byYear.get(r.year) ?? { count: 0, value: 0 };
        slotY.count += 1;
        slotY.value += v;
        byYear.set(r.year, slotY);
      }
    }
    const catData = Array.from(byCat.entries())
      .map(([name, s]) => ({ name, count: s.count, value: s.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    return { total, count: filtered.length, catData, byYear };
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
    setCategory(ALL);
    setPage(0);
  };

  const filtersActive = q !== "" || year !== ALL || category !== ALL;

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
          label="ประเภทที่พบ"
          value={stats.catData.length.toLocaleString("th-TH")}
          unit="ประเภท"
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

      {/* Chart per category */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <CardTitle>Top 10 ประเภท · ตามยอดเงิน</CardTitle>
            <CardDescription>(อัปเดตตามฟิลเตอร์)</CardDescription>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <BarChart
                data={stats.catData}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatBahtCompact(v as number)}
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ fill: "#0a0a0a", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as { name: string; value: number; count: number };
                    return (
                      <div className="rounded-md border border-[color:var(--color-border)] bg-white p-3 text-[13px] shadow-md">
                        <div className="font-medium">{p.name}</div>
                        <div className="mt-1 text-[color:var(--color-muted-fg)]">
                          {formatBaht(p.value)} บาท · {p.count.toLocaleString("th-TH")} รายการ
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {stats.catData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#ff5008" : "#1f2937"} fillOpacity={i === 0 ? 1 : 0.85 - i * 0.04} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
        <div className="w-[260px]">
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภท" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>ทุกประเภท</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
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
                <th className="w-[140px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">
                  เลขโครงการ
                </th>
                <SortableTh label="ชื่อโครงการ" k="name" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
                <SortableTh label="หน่วยงาน" k="agency" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[160px]" />
                <th className="w-[140px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">ประเภท</th>
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
                    <div className="leading-snug">{r.project_name}</div>
                  </td>
                  <td className="px-3 py-2 align-top text-[13px]">{r.agency || "—"}</td>
                  <td className="px-3 py-2 align-top">
                    <Badge variant="muted" className="whitespace-normal">
                      {r.category || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums">
                    {r.year || "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums font-medium">
                    {formatBaht(r.price)}
                  </td>
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
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
