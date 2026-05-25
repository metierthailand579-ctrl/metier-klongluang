"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Search, Sparkles, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import type { ProjectRecord } from "@/types/db";

const STORAGE_KEY = "khlongluang.selectedProjects.v1";

const METIER_COLOR: Record<string, string> = {
  "CREATIVE PRODUCTION": "#ff5008",
  "SOFTWARE DEVELOPMENT": "#1f2937",
  "MEDIA MANAGEMENT": "#475569",
  MARKETING: "#7c3aed",
  NOT_APPLICABLE: "#d4d4d4",
};

export function FilterExplorer({
  projects,
  departments,
  strategies,
  metierAreas,
}: {
  projects: ProjectRecord[];
  departments: string[];
  strategies: string[];
  metierAreas: string[];
}) {
  const [selected, setSelected, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, []);

  const [q, setQ] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [metierOnly, setMetierOnly] = useState(true);
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");

  // toggles for chip groups
  const toggleSet = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = Number(budgetMin) || 0;
    const max = Number(budgetMax) || Infinity;
    const selectedSet = new Set(selected);

    return projects.filter((p) => {
      if (showSelectedOnly && !selectedSet.has(p.master_project_id)) return false;
      if (metierOnly && p.metier_service_area_layer1 === "NOT_APPLICABLE") return false;
      if (selectedStrategies.size && !selectedStrategies.has(p.work_category_layer1 || "")) return false;
      if (selectedDepts.size && !selectedDepts.has(p.responsible_department || "")) return false;
      if (selectedAreas.size && !selectedAreas.has(p.metier_service_area_layer1 || "")) return false;

      const b = Number(p.total_budget) || 0;
      if (b < min || b > max) return false;

      if (needle) {
        const hay = `${p.project_name_th ?? ""} ${p.responsible_department ?? ""} ${p.work_category_layer2 ?? ""} ${p.location ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [projects, q, showSelectedOnly, metierOnly, selectedStrategies, selectedDepts, selectedAreas, budgetMin, budgetMax, selected]);

  // summary of currently SELECTED (not just filtered)
  const summary = useMemo(() => {
    const set = new Set(selected);
    const items = projects.filter((p) => set.has(p.master_project_id));
    const total = items.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const mix = new Map<string, { count: number; budget: number }>();
    const depts = new Map<string, number>();
    for (const p of items) {
      const a = p.metier_service_area_layer1 || "NOT_APPLICABLE";
      const slot = mix.get(a) ?? { count: 0, budget: 0 };
      slot.count += 1;
      slot.budget += Number(p.total_budget) || 0;
      mix.set(a, slot);
      const d = p.responsible_department || "(ไม่ระบุ)";
      depts.set(d, (depts.get(d) ?? 0) + 1);
    }
    const mixArr = Array.from(mix.entries())
      .map(([name, s]) => ({ name, count: s.count, budget: s.budget }))
      .sort((a, b) => b.count - a.count);
    const topDepts = Array.from(depts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    return { items, total, mixArr, topDepts };
  }, [projects, selected]);

  const isSelected = (id: string) => selected.includes(id);
  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const selectAllFiltered = () => {
    const set = new Set(selected);
    for (const p of filtered) set.add(p.master_project_id);
    setSelected(Array.from(set));
  };
  const clearAllFiltered = () => {
    const set = new Set(selected);
    for (const p of filtered) set.delete(p.master_project_id);
    setSelected(Array.from(set));
  };
  const resetFilters = () => {
    setQ("");
    setShowSelectedOnly(false);
    setMetierOnly(true);
    setSelectedStrategies(new Set());
    setSelectedDepts(new Set());
    setSelectedAreas(new Set());
    setBudgetMin("");
    setBudgetMax("");
  };

  const filtersActive =
    q !== "" ||
    !metierOnly ||
    showSelectedOnly ||
    selectedStrategies.size > 0 ||
    selectedDepts.size > 0 ||
    selectedAreas.size > 0 ||
    budgetMin !== "" ||
    budgetMax !== "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Left: filters + list */}
      <div className="space-y-4">
        {/* Filter bar */}
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน / พื้นที่..."
                  className="pl-8"
                />
              </div>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5" /> ล้าง
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToggleChip active={metierOnly} onToggle={() => setMetierOnly(!metierOnly)} icon={<Sparkles className="h-3 w-3" />}>
                เฉพาะ Metier-relevant
              </ToggleChip>
              <ToggleChip active={showSelectedOnly} onToggle={() => setShowSelectedOnly(!showSelectedOnly)}>
                แสดงเฉพาะที่เลือกไว้
              </ToggleChip>
            </div>

            <ChipGroup
              label="Metier service area"
              options={metierAreas.filter((a) => a !== "NOT_APPLICABLE")}
              selected={selectedAreas}
              onToggle={(v) => toggleSet(selectedAreas, v, setSelectedAreas)}
            />
            <ChipGroup
              label="ยุทธศาสตร์"
              options={strategies}
              selected={selectedStrategies}
              onToggle={(v) => toggleSet(selectedStrategies, v, setSelectedStrategies)}
            />
            <ChipGroup
              label="หน่วยงาน (top 10)"
              options={departments.slice(0, 10)}
              selected={selectedDepts}
              onToggle={(v) => toggleSet(selectedDepts, v, setSelectedDepts)}
            />

            <div className="flex flex-wrap items-end gap-3 border-t border-[color:var(--color-border)] pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-[color:var(--color-muted)]">งบขั้นต่ำ (บาท)</span>
                <Input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="0"
                  className="w-[140px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-[color:var(--color-muted)]">งบสูงสุด (บาท)</span>
                <Input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="ไม่จำกัด"
                  className="w-[140px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk actions + list header */}
        <div className="flex items-center justify-between gap-3 px-1 text-[14px]">
          <div className="text-[color:var(--color-muted-fg)]">
            แสดง <span className="font-bold text-fg">{filtered.length.toLocaleString("th-TH")}</span> โครงการ
            จากทั้งหมด {projects.length.toLocaleString("th-TH")}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={selectAllFiltered}>
              <Check className="h-3.5 w-3.5" /> เลือกทั้งหมดที่กรอง
            </Button>
            <Button size="sm" variant="ghost" onClick={clearAllFiltered}>
              ล้างที่กรอง
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.slice(0, 200).map((p) => (
            <ProjectRow
              key={p.master_project_id}
              p={p}
              selected={isSelected(p.master_project_id)}
              onToggle={() => toggle(p.master_project_id)}
            />
          ))}
          {filtered.length > 200 && (
            <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-center text-[13px] text-[color:var(--color-muted)]">
              แสดง 200 รายการแรก จาก {filtered.length.toLocaleString("th-TH")} —
              กรองเพิ่มเพื่อแคบลง
            </div>
          )}
          {filtered.length === 0 && (
            <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-8 text-center text-[14px] text-[color:var(--color-muted)]">
              ไม่พบโครงการตามเงื่อนไข — ลองล้างฟิลเตอร์
            </div>
          )}
        </div>
      </div>

      {/* Right: sticky live summary */}
      <aside className="lg:sticky lg:top-[88px] lg:self-start">
        <Card className="border-metier-orange/30 bg-[color:var(--color-metier-orange)]/[0.03]">
          <CardContent className="pt-5">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-metier-orange" />
              <CardTitle>สรุปสด</CardTitle>
            </div>
            <CardDescription className="mb-4">
              อัปเดตทันทีทุกครั้งที่ติ๊ก/ยกเลิกโครงการ
            </CardDescription>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-3">
                <div className="text-[11px] uppercase text-[color:var(--color-muted)]">เลือกแล้ว</div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={summary.items.length}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[24px] font-bold text-metier-orange tabular-nums"
                  >
                    {hydrated ? summary.items.length.toLocaleString("th-TH") : "—"}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[11px] text-[color:var(--color-muted)]">โครงการ</div>
              </div>
              <div className="rounded-lg bg-white p-3">
                <div className="text-[11px] uppercase text-[color:var(--color-muted)]">มูลค่ารวม</div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={summary.total}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[20px] font-bold tabular-nums"
                  >
                    {hydrated ? formatBahtCompact(summary.total) : "—"}
                  </motion.div>
                </AnimatePresence>
                <div className="text-[11px] text-[color:var(--color-muted)]">
                  {hydrated ? formatBaht(summary.total) + " บาท" : ""}
                </div>
              </div>
            </div>

            {/* Service area mix */}
            {summary.items.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  Service area mix
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-[100px] w-[100px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={summary.mixArr}
                          dataKey="count"
                          innerRadius={28}
                          outerRadius={46}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {summary.mixArr.map((m) => (
                            <Cell key={m.name} fill={METIER_COLOR[m.name] || "#94a3b8"} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {summary.mixArr.map((m) => (
                      <div
                        key={m.name}
                        className="flex items-center justify-between gap-2 text-[12px]"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: METIER_COLOR[m.name] || "#94a3b8" }}
                          />
                          <span className="truncate">
                            {m.name === "NOT_APPLICABLE" ? "ไม่ตรง Metier" : m.name}
                          </span>
                        </div>
                        <span className="shrink-0 tabular-nums font-medium">{m.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top departments */}
            {summary.topDepts.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  หน่วยงาน (top 5)
                </div>
                <div className="space-y-1">
                  {summary.topDepts.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 tabular-nums font-medium">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hydrated && summary.items.length > 0 && (
              <div className="flex gap-2 border-t border-[color:var(--color-border)] pt-3">
                <Button asChild className="flex-1" size="sm">
                  <a href="/selected">
                    ดูที่เลือก <ChevronRight className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm("ล้างการเลือกทั้งหมด?")) setSelected([]);
                  }}
                >
                  ล้าง
                </Button>
              </div>
            )}

            {hydrated && summary.items.length === 0 && (
              <div className="rounded-md border border-dashed border-[color:var(--color-border)] bg-white p-4 text-center text-[12px] text-[color:var(--color-muted)]">
                ยังไม่มีโครงการที่เลือก — ติ๊ก ☑️ ที่โครงการในรายการเพื่อเริ่ม
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function ProjectRow({
  p,
  selected,
  onToggle,
}: {
  p: ProjectRecord;
  selected: boolean;
  onToggle: () => void;
}) {
  const isMetier =
    p.metier_service_area_layer1 && p.metier_service_area_layer1 !== "NOT_APPLICABLE";
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors",
        selected
          ? "border-metier-orange ring-1 ring-metier-orange/30"
          : "border-[color:var(--color-border)] hover:border-metier-orange/40",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="leading-snug font-medium">{p.project_name_th}</div>
            <div className="mt-0.5 truncate text-[12px] text-[color:var(--color-muted)]">
              {p.responsible_department || "—"} ·{" "}
              {p.work_category_layer1} · {p.work_category_layer2 || "—"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[14px] font-bold tabular-nums">
              {formatBaht(p.total_budget)}
            </div>
            <div className="text-[11px] text-[color:var(--color-muted)]">
              {p.first_planned_year || "—"}
            </div>
          </div>
        </div>
        {isMetier && (
          <Badge variant="default" className="mt-2">
            {p.metier_service_area_layer1}
            {p.metier_service_area_layer2 && p.metier_service_area_layer2 !== "ไม่ตรงสาย Metier" ? ` · ${p.metier_service_area_layer2}` : ""}
          </Badge>
        )}
      </div>
    </label>
  );
}

function ToggleChip({
  active,
  onToggle,
  icon,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors",
        active
          ? "border-metier-orange bg-metier-orange text-white"
          : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg hover:bg-[color:var(--color-subtle)]",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  if (!options.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[color:var(--color-muted)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.has(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                active
                  ? "border-metier-orange bg-metier-orange/10 text-fg"
                  : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
