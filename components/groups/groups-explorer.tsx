"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import type { ProjectRecord } from "@/types/db";

type Metric = "budget" | "count" | "avg" | "max";
type Dim =
  | "work_category_layer1"
  | "work_category_layer2"
  | "metier_service_area_layer1"
  | "metier_service_area_layer2"
  | "responsible_department"
  | "source_pdf_file"
  | "first_planned_year"
  | "project_status_type"
  | "document_type"
  | "NONE";

const DIM_LABEL: Record<Exclude<Dim, "NONE">, string> = {
  work_category_layer1: "ยุทธศาสตร์ (Layer 1)",
  work_category_layer2: "ประเภทงาน (Layer 2)",
  metier_service_area_layer1: "Metier service area",
  metier_service_area_layer2: "Metier sub-area",
  responsible_department: "หน่วยงาน",
  source_pdf_file: "ที่มา PDF",
  first_planned_year: "ปีเริ่ม",
  project_status_type: "สถานะ (เดิม/เปลี่ยน/เพิ่ม)",
  document_type: "ประเภทเอกสาร",
};

const METRIC_LABEL: Record<Metric, string> = {
  budget: "งบประมาณรวม (บาท)",
  count: "จำนวนโครงการ",
  avg: "งบเฉลี่ย/โครงการ (บาท)",
  max: "งบสูงสุด/โครงการ (บาท)",
};

const PALETTE = [
  "#ff5008", "#1f2937", "#475569", "#0f766e", "#7c3aed",
  "#c2410c", "#0369a1", "#65a30d", "#b91c1c", "#92400e",
  "#4338ca", "#0e7490", "#a16207", "#dc2626", "#16a34a",
];

function getValue(p: ProjectRecord, dim: Exclude<Dim, "NONE">): string {
  const v = p[dim as keyof ProjectRecord];
  if (v == null || v === "") return "(ไม่ระบุ)";
  return String(v);
}

function computeMetric(values: number[], metric: Metric): number {
  if (!values.length) return 0;
  switch (metric) {
    case "budget":
      return values.reduce((s, v) => s + v, 0);
    case "count":
      return values.length;
    case "avg":
      return values.reduce((s, v) => s + v, 0) / values.length;
    case "max":
      return Math.max(...values);
  }
}

function formatMetricValue(v: number, metric: Metric): string {
  if (metric === "count") return v.toLocaleString("th-TH");
  return formatBahtCompact(v);
}

export function GroupsExplorer({ projects }: { projects: ProjectRecord[] }) {
  const [primary, setPrimary] = useState<Exclude<Dim, "NONE">>("work_category_layer1");
  const [secondary, setSecondary] = useState<Dim>("work_category_layer2");
  const [metric, setMetric] = useState<Metric>("budget");
  const [metierOnly, setMetierOnly] = useState(false);
  const [q, setQ] = useState("");
  const [activePrimary, setActivePrimary] = useState<string | null>(null);

  // pre-filter
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (metierOnly && p.metier_service_area_layer1 === "NOT_APPLICABLE") return false;
      if (needle) {
        const hay = `${p.project_name_th ?? ""} ${p.responsible_department ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [projects, metierOnly, q]);

  // build buckets
  const buckets = useMemo(() => {
    type Inner = { name: string; values: number[]; budget: number };
    type Outer = { name: string; inner: Map<string, Inner>; values: number[]; budget: number };
    const outer = new Map<string, Outer>();
    for (const p of filtered) {
      const k1 = getValue(p, primary);
      const k2 = secondary === "NONE" ? "(รวม)" : getValue(p, secondary);
      const b = Number(p.total_budget) || 0;
      const out = outer.get(k1) ?? { name: k1, inner: new Map<string, Inner>(), values: [], budget: 0 };
      out.values.push(b);
      out.budget += b;
      const inn = out.inner.get(k2) ?? { name: k2, values: [], budget: 0 };
      inn.values.push(b);
      inn.budget += b;
      out.inner.set(k2, inn);
      outer.set(k1, out);
    }
    return Array.from(outer.values())
      .map((o) => {
        const innerArr = Array.from(o.inner.values())
          .map((inn) => ({
            name: inn.name,
            count: inn.values.length,
            metric: computeMetric(inn.values, metric),
            budget: inn.budget,
          }))
          .sort((a, b) => b.metric - a.metric);
        return {
          name: o.name,
          count: o.values.length,
          metric: computeMetric(o.values, metric),
          budget: o.budget,
          children: innerArr,
        };
      })
      .sort((a, b) => b.metric - a.metric);
  }, [filtered, primary, secondary, metric]);

  const grandTotal = useMemo(
    () => buckets.reduce((s, b) => s + b.metric, 0),
    [buckets],
  );

  const treemapData = useMemo(() => {
    if (activePrimary) {
      const node = buckets.find((b) => b.name === activePrimary);
      if (!node) return [];
      return node.children.map((c) => ({
        name: c.name,
        size: c.metric > 0 ? c.metric : 0.0001,
        count: c.count,
        budget: c.budget,
      }));
    }
    return buckets.map((b, i) => ({
      name: b.name,
      size: b.metric > 0 ? b.metric : 0.0001,
      count: b.count,
      budget: b.budget,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [buckets, activePrimary]);

  const reset = () => {
    setQ("");
    setMetierOnly(false);
    setPrimary("work_category_layer1");
    setSecondary("work_category_layer2");
    setMetric("budget");
    setActivePrimary(null);
  };

  return (
    <div className="space-y-6">
      {/* Builder */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-metier-orange" />
            <CardTitle>ตั้งค่าจัดกลุ่ม</CardTitle>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={reset}>
              <X className="h-3.5 w-3.5" /> ค่าเริ่มต้น
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="จัดกลุ่มหลักด้วย">
              <Select value={primary} onValueChange={(v) => { setPrimary(v as Exclude<Dim, "NONE">); setActivePrimary(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DIM_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="จัดกลุ่มย่อยด้วย">
              <Select value={secondary} onValueChange={(v) => { setSecondary(v as Dim); setActivePrimary(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— ไม่มี (Layer 1 อย่างเดียว) —</SelectItem>
                  {Object.entries(DIM_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="วัดด้วย">
              <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setMetierOnly(!metierOnly)}
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] transition-colors",
                metierOnly
                  ? "border-metier-orange bg-metier-orange text-white"
                  : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
              )}
            >
              เฉพาะ Metier-relevant
            </button>
            <div className="ml-auto w-[260px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="กรอง ชื่อ/หน่วยงาน..."
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-[13px]">
            <SummaryStat label="โครงการในเซต" value={filtered.length.toLocaleString("th-TH")} />
            <SummaryStat label="กลุ่มหลัก" value={buckets.length.toLocaleString("th-TH")} />
            <SummaryStat
              label={metric === "count" ? "รวม (จำนวน)" : metric === "budget" ? "รวม (บาท)" : METRIC_LABEL[metric]}
              value={formatMetricValue(grandTotal, metric)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Treemap */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <CardTitle>
                {activePrimary
                  ? `${DIM_LABEL[primary]} = ${activePrimary} → ${secondary === "NONE" ? "(รวม)" : DIM_LABEL[secondary]}`
                  : `Treemap · ${DIM_LABEL[primary]}`}
              </CardTitle>
              <CardDescription>
                ขนาดของกล่อง = {METRIC_LABEL[metric]} · คลิกกล่องเพื่อ drill-down เข้า{" "}
                {secondary === "NONE" ? "(ปิด Sub-group ไว้)" : DIM_LABEL[secondary]}
              </CardDescription>
            </div>
            {activePrimary && (
              <Button size="sm" variant="ghost" onClick={() => setActivePrimary(null)}>
                ← กลับ Layer 1
              </Button>
            )}
          </div>

          <div className="h-[520px] w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={(activePrimary || "all") + primary + secondary + metric + String(metierOnly) + q}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                {treemapData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[color:var(--color-muted)]">
                    ไม่มีข้อมูลในเซตนี้
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      isAnimationActive
                      animationDuration={400}
                      content={(props) => <CustomTile {...props} />}
                      onClick={(e) => {
                        if (secondary === "NONE") return;
                        if (!activePrimary) setActivePrimary((e as { name?: string } | undefined)?.name ?? null);
                      }}
                    >
                      <Tooltip content={<TileTooltip metric={metric} />} />
                    </Treemap>
                  </ResponsiveContainer>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Bucket table */}
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-baseline justify-between">
            <CardTitle>ตารางกลุ่ม</CardTitle>
            <CardDescription>เรียงตาม {METRIC_LABEL[metric]} (มาก → น้อย)</CardDescription>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead className="bg-[color:var(--color-subtle)] text-left">
                <tr>
                  <th className="w-[40px] px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">#</th>
                  <th className="px-3 py-2 font-medium text-[color:var(--color-muted-fg)]">{DIM_LABEL[primary]}</th>
                  <th className="w-[110px] px-3 py-2 text-right font-medium text-[color:var(--color-muted-fg)]">จำนวน</th>
                  <th className="w-[140px] px-3 py-2 text-right font-medium text-[color:var(--color-muted-fg)]">งบรวม (บาท)</th>
                  <th className="w-[150px] px-3 py-2 text-right font-medium text-[color:var(--color-muted-fg)]">
                    {METRIC_LABEL[metric]}
                  </th>
                  <th className="w-[80px] px-3 py-2 text-right font-medium text-[color:var(--color-muted-fg)]">%</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b, i) => {
                  const pct = grandTotal ? (b.metric / grandTotal) * 100 : 0;
                  const active = activePrimary === b.name;
                  return (
                    <>
                      <tr
                        key={b.name}
                        className={cn(
                          "border-t border-[color:var(--color-border)] cursor-pointer transition-colors hover:bg-[color:var(--color-subtle)]/60",
                          active && "bg-[color:var(--color-metier-orange)]/[0.06]",
                        )}
                        onClick={() => {
                          if (secondary === "NONE") return;
                          setActivePrimary(active ? null : b.name);
                        }}
                      >
                        <td className="px-3 py-2 align-top tabular-nums text-[color:var(--color-muted)]">{i + 1}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                            <span className="font-medium">{b.name}</span>
                            {b.children.length > 1 && secondary !== "NONE" && (
                              <Badge variant="muted" className="ml-1">{b.children.length} sub</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums">{b.count.toLocaleString("th-TH")}</td>
                        <td className="px-3 py-2 align-top text-right tabular-nums">{formatBaht(b.budget)}</td>
                        <td className="px-3 py-2 align-top text-right tabular-nums font-bold">
                          {formatMetricValue(b.metric, metric)}
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums text-[color:var(--color-muted-fg)]">
                          {pct.toFixed(1)}%
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }}
                            />
                          </div>
                        </td>
                      </tr>
                      {active && secondary !== "NONE" && (
                        <tr>
                          <td colSpan={6} className="bg-[color:var(--color-subtle)]/40 px-3 py-3">
                            <div className="space-y-1">
                              {b.children.map((c) => (
                                <div
                                  key={c.name}
                                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md bg-white px-3 py-1.5 text-[13px]"
                                >
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-3 w-3 text-[color:var(--color-muted)]" />
                                    <span>{c.name}</span>
                                  </div>
                                  <span className="text-[color:var(--color-muted)] tabular-nums">
                                    {c.count.toLocaleString("th-TH")} โครงการ · {formatBahtCompact(c.budget)}
                                  </span>
                                  <span className="font-bold tabular-nums">
                                    {formatMetricValue(c.metric, metric)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {buckets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[12px] text-[color:var(--color-muted)]">{label}</div>
      {children}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[color:var(--color-subtle)]/60 px-3 py-2">
      <div className="text-[11px] text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-0.5 text-[16px] font-bold tabular-nums">{value}</div>
    </div>
  );
}

type TileProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  count?: number;
  budget?: number;
  color?: string;
  depth?: number;
  index?: number;
};

function CustomTile(props: TileProps) {
  const { x = 0, y = 0, width = 0, height = 0, name = "", color, index = 0 } = props;
  const fill = color || PALETTE[index % PALETTE.length];
  const showLabel = width > 60 && height > 28;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill, fillOpacity: 0.9, stroke: "#fff", strokeWidth: 2 }}
      />
      {showLabel && (
        <text
          x={x + 8}
          y={y + 18}
          fill="#fff"
          fontSize={12}
          fontWeight={600}
          style={{ pointerEvents: "none" }}
        >
          {truncate(name, Math.floor(width / 7))}
        </text>
      )}
    </g>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(1, n - 1)) + "…";
}

type TooltipPayload = {
  active?: boolean;
  payload?: Array<{ payload: { name: string; size: number; count?: number; budget?: number } }>;
};

function TileTooltip({ active, payload, metric }: TooltipPayload & { metric: Metric }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-white p-3 text-[13px] shadow-md">
      <div className="font-medium">{item.name}</div>
      <div className="mt-1 space-y-0.5 text-[12px] text-[color:var(--color-muted-fg)]">
        <div>
          {METRIC_LABEL[metric]}: <span className="font-bold tabular-nums">{formatMetricValue(item.size, metric)}</span>
        </div>
        <div>จำนวน: <span className="tabular-nums">{(item.count ?? 0).toLocaleString("th-TH")}</span> โครงการ</div>
        <div>งบรวม: <span className="tabular-nums">{formatBahtCompact(item.budget ?? 0)}</span></div>
      </div>
    </div>
  );
}
