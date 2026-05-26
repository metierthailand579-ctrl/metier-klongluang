"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, RotateCcw, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatBahtCompact } from "@/lib/utils";
import type { ProjectRecord } from "@/types/db";
import {
  ALL_MAIN_GROUPS,
  GROUP_COLOR,
  METIER_GROUPS,
  MUNICIPAL_GROUPS,
  OTHER_SUB_LABEL,
  UNCLASSIFIED,
  allSubsForMain,
  isMetierGroup,
  mapProjectToGroup,
  type GroupOverride,
  type OverrideMap,
} from "@/lib/data/metier-taxonomy";

const PAGE_SIZE = 60;
type FilterState = "all" | "unmapped" | "tagged" | "metier-only";

export function GroupTagger({
  projects,
  overrides,
  setOverrides,
}: {
  projects: ProjectRecord[];
  overrides: OverrideMap;
  setOverrides: (next: OverrideMap | ((prev: OverrideMap) => OverrideMap)) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterState>("all");
  const [activeMain, setActiveMain] = useState<string | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const [recentlyTagged, setRecentlyTagged] = useState<Set<string>>(new Set());

  // Pre-compute current mapping per project (auto + override).
  const tagged = useMemo(() => {
    return projects.map((p) => {
      const m = mapProjectToGroup(p, overrides);
      const hasOverride = Boolean(overrides[p.master_project_id]);
      return { project: p, main: m.main, sub: m.sub, hasOverride };
    });
  }, [projects, overrides]);

  // Live counts + budget totals per main group (from current mapping).
  const stats = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    const budgets: Record<string, number> = { ALL: 0 };
    for (const m of ALL_MAIN_GROUPS) {
      counts[m] = 0;
      budgets[m] = 0;
    }
    for (const t of tagged) {
      const b = Number(t.project.total_budget) || 0;
      counts[t.main] = (counts[t.main] ?? 0) + 1;
      budgets[t.main] = (budgets[t.main] ?? 0) + b;
      counts.ALL += 1;
      budgets.ALL += b;
    }
    const metierBudget = METIER_GROUPS.reduce((s, m) => s + (budgets[m] ?? 0), 0);
    const metierCount = METIER_GROUPS.reduce((s, m) => s + (counts[m] ?? 0), 0);
    return { counts, budgets, metierBudget, metierCount };
  }, [tagged]);
  const counts = stats.counts;

  // Filter for the visible list
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tagged.filter((t) => {
      if (activeMain !== "ALL" && t.main !== activeMain) return false;
      if (filter === "unmapped" && t.main !== UNCLASSIFIED) return false;
      if (filter === "tagged" && !t.hasOverride) return false;
      if (filter === "metier-only" && !isMetierGroup(t.main)) return false;
      if (needle) {
        const hay =
          `${t.project.project_name_th ?? ""} ${t.project.responsible_department ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [tagged, q, filter, activeMain]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  const pageSlice = visible.slice(pageStart, pageStart + PAGE_SIZE);

  function setOne(id: string, next: GroupOverride | null) {
    setOverrides((prev) => {
      const copy = { ...prev };
      if (next == null) delete copy[id];
      else copy[id] = next;
      return copy;
    });
    if (next) {
      setRecentlyTagged((s) => new Set(s).add(id));
      window.setTimeout(() => {
        setRecentlyTagged((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, 900);
    }
  }

  function clearAllOverrides() {
    if (!confirm(`ลบ overrides ทั้งหมด (${Object.keys(overrides).length} โครงการ)?`)) return;
    setOverrides({});
  }

  const overrideCount = Object.keys(overrides).length;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-metier-orange" />
              <CardTitle>จัดกลุ่มเองได้ตรงนี้</CardTitle>
              <Badge variant="muted">{projects.length.toLocaleString("th-TH")} โครงการ</Badge>
              {overrideCount > 0 && (
                <Badge className="bg-metier-orange text-white border-metier-orange">
                  ใส่เองแล้ว {overrideCount.toLocaleString("th-TH")}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">
              คลิก dropdown ในแต่ละ row เพื่อกำหนด Main Group + Sub-service เอง — บันทึก
              อัตโนมัติ (เก็บใน browser นี้) Treemap + ตารางด้านล่างจะอัปเดตทันที
            </CardDescription>
          </div>
          {overrideCount > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAllOverrides}>
              <RotateCcw className="h-3.5 w-3.5" /> reset ทั้งหมด
            </Button>
          )}
        </div>

        {/* Metier hit-rate stat header — wow factor */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {METIER_GROUPS.map((m) => {
            const c = counts[m] ?? 0;
            const b = stats.budgets[m] ?? 0;
            const color = GROUP_COLOR[m];
            return (
              <motion.div
                key={m}
                layout
                className="relative overflow-hidden rounded-lg border p-3"
                style={{ borderColor: color }}
              >
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{ background: color }}
                />
                <div className="relative">
                  <div
                    className="text-[10px] font-semibold uppercase tracking-wide"
                    style={{ color }}
                  >
                    {m}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <div className="text-[24px] font-bold tabular-nums leading-none" style={{ color }}>
                      {formatBahtCompact(b)}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-[color:var(--color-muted-fg)]">
                    {c.toLocaleString("th-TH")} โครงการ
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="mb-4 flex items-center gap-3 rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40 px-3 py-2 text-[12px]">
          <span className="text-[color:var(--color-muted-fg)]">รวม Metier (4 กลุ่ม):</span>
          <span className="text-[16px] font-bold tabular-nums text-metier-orange">
            {formatBahtCompact(stats.metierBudget)}
          </span>
          <span className="text-[color:var(--color-muted)]">·</span>
          <span className="tabular-nums">{stats.metierCount} โครงการ</span>
          <span className="ml-auto text-[color:var(--color-muted)]">
            จากทั้งหมด{" "}
            <span className="font-semibold text-fg tabular-nums">
              {formatBahtCompact(stats.budgets.ALL ?? 0)}
            </span>
          </span>
        </div>

        {/* Main-group chips with live counts + budget (also act as filter) */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Chip
            label={`ทั้งหมด · ${counts.ALL.toLocaleString("th-TH")}`}
            active={activeMain === "ALL"}
            onClick={() => { setActiveMain("ALL"); setPage(0); }}
          />
          <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Metier
          </span>
          {METIER_GROUPS.map((m) => (
            <Chip
              key={m}
              label={m}
              count={counts[m] ?? 0}
              budget={stats.budgets[m] ?? 0}
              active={activeMain === m}
              color={GROUP_COLOR[m]}
              onClick={() => { setActiveMain(m); setPage(0); }}
            />
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--color-muted)]">
            Municipal
          </span>
          {MUNICIPAL_GROUPS.map((m) => (
            <Chip
              key={m}
              label={m}
              count={counts[m] ?? 0}
              budget={stats.budgets[m] ?? 0}
              active={activeMain === m}
              color={GROUP_COLOR[m]}
              onClick={() => { setActiveMain(m); setPage(0); }}
            />
          ))}
          {(counts[UNCLASSIFIED] ?? 0) > 0 && (
            <Chip
              label="ยังไม่จัด"
              count={counts[UNCLASSIFIED]}
              budget={stats.budgets[UNCLASSIFIED] ?? 0}
              active={activeMain === UNCLASSIFIED}
              muted
              onClick={() => { setActiveMain(UNCLASSIFIED); setPage(0); }}
            />
          )}
        </div>

        {/* Filter row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {([
              ["all", "ทั้งหมด"],
              ["unmapped", "ยังไม่จัด"],
              ["tagged", "ที่ใส่เอง"],
              ["metier-only", "เฉพาะ Metier"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setFilter(k); setPage(0); }}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] transition-colors",
                  filter === k
                    ? "border-fg bg-fg text-white"
                    : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto w-[280px]">
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
              placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน..."
            />
          </div>
        </div>

        {/* Visible-set summary */}
        <div className="mb-2 text-[12px] text-[color:var(--color-muted)]">
          แสดง {visible.length === 0 ? 0 : (pageStart + 1).toLocaleString("th-TH")}–
          {Math.min(pageStart + PAGE_SIZE, visible.length).toLocaleString("th-TH")}
          {" "}จากทั้งหมด {visible.length.toLocaleString("th-TH")} โครงการ
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
          <table className="w-full text-[13px]">
            <thead className="bg-[color:var(--color-subtle)] text-left text-[color:var(--color-muted-fg)]">
              <tr>
                <th className="w-[34px] px-2 py-2"></th>
                <th className="px-2 py-2 font-medium">โครงการ / หน่วยงาน</th>
                <th className="w-[160px] px-3 py-2 text-right font-medium">งบประมาณ</th>
                <th className="w-[230px] px-2 py-2 font-medium">Main Group</th>
                <th className="w-[260px] px-2 py-2 font-medium">Sub-service</th>
                <th className="w-[40px] px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {pageSlice.map((t) => {
                  const isOverride = t.hasOverride;
                  const wasJustTagged = recentlyTagged.has(t.project.master_project_id);
                  const mainColor = GROUP_COLOR[t.main] ?? "#94a3b8";
                  const subOptions = allSubsForMain(t.main, projects);
                  return (
                    <motion.tr
                      key={t.project.master_project_id}
                      layout
                      initial={wasJustTagged ? { backgroundColor: "rgba(255,80,8,0.18)" } : false}
                      animate={{ backgroundColor: "rgba(255,80,8,0)" }}
                      transition={{ duration: 0.9 }}
                      className="border-t border-[color:var(--color-border)] align-top"
                    >
                      <td className="px-2 py-2">
                        {isOverride ? (
                          <CheckCircle2 className="h-4 w-4 text-metier-orange" />
                        ) : (
                          <Circle className="h-4 w-4 text-[color:var(--color-muted)]" />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="line-clamp-2 font-medium leading-snug">
                          {t.project.project_name_th}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">
                          {t.project.responsible_department ?? "—"}
                          {t.project.first_planned_year ? ` · เริ่ม ${t.project.first_planned_year}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div
                          className="text-[18px] font-bold tabular-nums leading-tight"
                          style={{ color: GROUP_COLOR[t.main] ?? "#0f172a" }}
                        >
                          {formatBahtCompact(Number(t.project.total_budget) || 0)}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[color:var(--color-muted)]">
                          {Number(t.project.total_budget)?.toLocaleString("th-TH") ?? "0"} บาท
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <Select
                          value={t.main}
                          onValueChange={(v) => {
                            const main = v;
                            // If switching to a new main, keep sub if it's a valid
                            // option in the new main; otherwise default to "Other".
                            const subsOfNew = allSubsForMain(main, projects);
                            const sub = subsOfNew.includes(t.sub) ? t.sub : OTHER_SUB_LABEL;
                            setOne(t.project.master_project_id, { main, sub });
                          }}
                        >
                          <SelectTrigger
                            className="h-8"
                            style={{
                              borderColor: mainColor,
                              color: mainColor,
                              fontWeight: 600,
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                              Metier
                            </div>
                            {METIER_GROUPS.map((m) => (
                              <SelectItem key={m} value={m}>
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ background: GROUP_COLOR[m] }}
                                  />
                                  {m}
                                </span>
                              </SelectItem>
                            ))}
                            <div className="mt-1 border-t border-[color:var(--color-border)] px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
                              Municipal
                            </div>
                            {MUNICIPAL_GROUPS.map((m) => (
                              <SelectItem key={m} value={m}>
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ background: GROUP_COLOR[m] }}
                                  />
                                  {m}
                                </span>
                              </SelectItem>
                            ))}
                            <SelectItem value={UNCLASSIFIED}>
                              <span className="text-[color:var(--color-muted-fg)]">
                                ยังไม่จัดหมวด
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-2">
                        {t.main !== UNCLASSIFIED ? (
                          <Select
                            value={subOptions.includes(t.sub) ? t.sub : OTHER_SUB_LABEL}
                            onValueChange={(v) => {
                              setOne(t.project.master_project_id, { main: t.main, sub: v });
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {subOptions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-[color:var(--color-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {isOverride && (
                          <button
                            onClick={() => setOne(t.project.master_project_id, null)}
                            title="คืนเป็นค่า auto"
                            className="rounded p-1 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-[color:var(--color-muted)]">
                    ไม่มีโครงการตรงเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-[13px]">
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← ก่อนหน้า
            </Button>
            <span className="px-2 text-[color:var(--color-muted-fg)]">
              หน้า {currentPage + 1} / {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              ถัดไป →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Chip({
  label,
  count,
  budget,
  active,
  color,
  muted,
  onClick,
}: {
  label: string;
  count?: number;
  budget?: number;
  active: boolean;
  color?: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-all",
        active
          ? "text-white"
          : muted
            ? "border-dashed border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-fg"
            : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
      )}
      style={
        active
          ? { background: color ?? "#0f172a", borderColor: color ?? "#0f172a" }
          : color
            ? { borderColor: color, color }
            : undefined
      }
    >
      <span>{label}</span>
      {count != null && (
        <span className="tabular-nums opacity-80">· {count.toLocaleString("th-TH")}</span>
      )}
      {budget != null && budget > 0 && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
            active ? "bg-white/20" : "bg-[color:var(--color-subtle)]",
          )}
        >
          {formatBahtCompact(budget)}
        </span>
      )}
    </button>
  );
}
