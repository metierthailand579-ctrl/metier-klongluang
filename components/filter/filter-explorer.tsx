"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, FileText, Search, Sparkles, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { pdfShort } from "@/lib/data/pdf-labels";
import { TEAM_PICKS, TEAM_PICK_IDS } from "@/lib/data/team-picks";
import { useLocalStorage } from "@/lib/storage";
import type { ProjectRecord } from "@/types/db";
import {
  ALL_MAIN_GROUPS,
  GROUP_COLOR,
  METIER_GROUPS,
  MUNICIPAL_GROUPS,
  UNCLASSIFIED,
  getMainGroup,
  getSubService,
  isMetierGroup,
  type OverrideMap,
} from "@/lib/data/metier-taxonomy";

const STORAGE_KEY = "khlongluang.selectedProjects.v1";
const GROUP_OVERRIDES_KEY = "klongluang.groupOverrides.v1";
const YEARS = [2568, 2569, 2570] as const;

const BUDGET_PRESETS: Array<{ label: string; min: number; max: number }> = [
  { label: "< 1 แสน", min: 0, max: 100_000 },
  { label: "1 แสน–1 ล้าน", min: 100_000, max: 1_000_000 },
  { label: "1–10 ล้าน", min: 1_000_000, max: 10_000_000 },
  { label: "> 10 ล้าน", min: 10_000_000, max: Infinity },
];

export function FilterExplorer({
  projects,
  departments,
}: {
  projects: ProjectRecord[];
  departments: string[];
  strategies: string[];
  metierAreas: string[];
}) {
  const [selected, setSelected, hydrated] = useLocalStorage<string[]>(STORAGE_KEY, []);
  const [overrides] = useLocalStorage<OverrideMap>(GROUP_OVERRIDES_KEY, {});

  const [q, setQ] = useState("");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [showTeamOnly, setShowTeamOnly] = useState(false);
  const [metierOnly, setMetierOnly] = useState(true);
  const [selectedMains, setSelectedMains] = useState<Set<string>>(new Set());
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [selectedPdfs, setSelectedPdfs] = useState<Set<string>>(new Set());
  const [selectedStatusTypes, setSelectedStatusTypes] = useState<Set<string>>(new Set());
  const [activeBudgetPreset, setActiveBudgetPreset] = useState<number | null>(null);
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");

  const toggleSet = <T,>(
    set: Set<T>,
    value: T,
    setter: (s: Set<T>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  // Distinct values derived from the dataset.
  const pdfSources = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) if (p.source_pdf_file) set.add(p.source_pdf_file);
    return Array.from(set).sort();
  }, [projects]);
  const statusTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) if (p.project_status_type) set.add(p.project_status_type);
    return Array.from(set).sort();
  }, [projects]);

  const effectiveBudgetRange = useMemo(() => {
    if (activeBudgetPreset != null) {
      const preset = BUDGET_PRESETS[activeBudgetPreset];
      return { min: preset.min, max: preset.max };
    }
    return {
      min: Number(budgetMin) || 0,
      max: Number(budgetMax) || Infinity,
    };
  }, [activeBudgetPreset, budgetMin, budgetMax]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const selectedSet = new Set(selected);
    return projects.filter((p) => {
      if (showSelectedOnly && !selectedSet.has(p.master_project_id)) return false;
      if (showTeamOnly && !TEAM_PICK_IDS.has(p.master_project_id)) return false;
      const main = getMainGroup(p, overrides);
      if (metierOnly && !isMetierGroup(main)) return false;
      if (selectedMains.size && !selectedMains.has(main)) return false;
      if (selectedDepts.size && !selectedDepts.has(p.responsible_department || ""))
        return false;
      if (selectedPdfs.size && !selectedPdfs.has(p.source_pdf_file || "")) return false;
      if (selectedStatusTypes.size && !selectedStatusTypes.has(p.project_status_type || ""))
        return false;

      if (selectedYears.size) {
        let hasYear = false;
        for (const y of selectedYears) {
          if ((Number(p[`budget_${y}` as keyof ProjectRecord] as number) || 0) > 0) {
            hasYear = true;
            break;
          }
        }
        if (!hasYear) return false;
      }

      const b = Number(p.total_budget) || 0;
      if (b < effectiveBudgetRange.min || b > effectiveBudgetRange.max) return false;

      if (needle) {
        const hay = `${p.project_name_th ?? ""} ${p.responsible_department ?? ""} ${p.work_category_layer2 ?? ""} ${p.location ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    projects,
    overrides,
    q,
    showSelectedOnly,
    showTeamOnly,
    metierOnly,
    selectedMains,
    selectedDepts,
    selectedYears,
    selectedPdfs,
    selectedStatusTypes,
    effectiveBudgetRange,
    selected,
  ]);

  // Summary of currently SELECTED (not just filtered)
  const summary = useMemo(() => {
    const set = new Set(selected);
    const items = projects.filter((p) => set.has(p.master_project_id));
    const total = items.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const avg = items.length ? total / items.length : 0;

    const mix = new Map<string, { count: number; budget: number }>();
    const depts = new Map<string, { count: number; budget: number }>();
    const pdfMix = new Map<string, number>();
    const yearMix: Record<number, number> = { 2568: 0, 2569: 0, 2570: 0 };
    let metierCount = 0;
    let metierBudget = 0;
    for (const p of items) {
      const b = Number(p.total_budget) || 0;
      const main = getMainGroup(p, overrides);
      bump(mix, main, b);
      if (isMetierGroup(main)) {
        metierCount += 1;
        metierBudget += b;
      }
      const dept = p.responsible_department || "(ไม่ระบุ)";
      bump(depts, dept, b);
      if (p.source_pdf_file) {
        pdfMix.set(p.source_pdf_file, (pdfMix.get(p.source_pdf_file) ?? 0) + 1);
      }
      for (const y of YEARS) {
        yearMix[y] += Number(p[`budget_${y}` as keyof ProjectRecord] as number) || 0;
      }
    }
    const mixArr = Array.from(mix.entries())
      .map(([name, s]) => ({ name, count: s.count, budget: s.budget }))
      .sort((a, b) => b.budget - a.budget);
    const topDepts = Array.from(depts.entries())
      .map(([name, s]) => ({ name, count: s.count, budget: s.budget }))
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 10);
    const pdfArr = Array.from(pdfMix.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return {
      items,
      total,
      avg,
      mixArr,
      topDepts,
      pdfArr,
      yearMix,
      metierCount,
      metierBudget,
    };
  }, [projects, selected, overrides]);

  const isSelected = (id: string) => selected.includes(id);
  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
    setShowTeamOnly(false);
    setMetierOnly(true);
    setSelectedMains(new Set());
    setSelectedDepts(new Set());
    setSelectedYears(new Set());
    setSelectedPdfs(new Set());
    setSelectedStatusTypes(new Set());
    setActiveBudgetPreset(null);
    setBudgetMin("");
    setBudgetMax("");
  };

  const filtersActive =
    q !== "" ||
    !metierOnly ||
    showSelectedOnly ||
    showTeamOnly ||
    selectedMains.size > 0 ||
    selectedDepts.size > 0 ||
    selectedYears.size > 0 ||
    selectedPdfs.size > 0 ||
    selectedStatusTypes.size > 0 ||
    activeBudgetPreset != null ||
    budgetMin !== "" ||
    budgetMax !== "";

  const selectedSet = new Set(selected);
  const filteredSelectedCount = filtered.reduce(
    (n, p) => (selectedSet.has(p.master_project_id) ? n + 1 : n),
    0,
  );

  // How many team-picks are not yet selected?
  const teamPickStats = useMemo(() => {
    let total = TEAM_PICK_IDS.size;
    let alreadyPicked = 0;
    for (const id of TEAM_PICK_IDS) {
      if (selectedSet.has(id)) alreadyPicked += 1;
    }
    return { total, alreadyPicked, remaining: total - alreadyPicked };
  }, [selectedSet]);

  const applyTeamPicks = () => {
    setSelected((prev) => Array.from(new Set([...prev, ...TEAM_PICKS.map((t) => t.id)])));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      {/* Left: filters + list */}
      <div className="space-y-4">
        {/* Filter card */}
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
              <ToggleChip
                active={metierOnly}
                onToggle={() => setMetierOnly(!metierOnly)}
                icon={<Sparkles className="h-3 w-3" />}
              >
                เฉพาะ Metier (4 กลุ่ม)
              </ToggleChip>
              <ToggleChip
                active={showSelectedOnly}
                onToggle={() => setShowSelectedOnly(!showSelectedOnly)}
              >
                แสดงเฉพาะที่เลือกไว้
              </ToggleChip>
              <ToggleChip
                active={showTeamOnly}
                onToggle={() => setShowTeamOnly(!showTeamOnly)}
                icon={<Users className="h-3 w-3" />}
              >
                ทีมแนะนำ ({TEAM_PICK_IDS.size})
              </ToggleChip>
            </div>

            {/* Team-picks apply bar — shows only when there are still un-picked items */}
            {teamPickStats.remaining > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-metier-orange/30 bg-[color:var(--color-metier-orange)]/[0.04] px-3 py-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-metier-orange" />
                  <span>
                    <strong className="text-metier-orange">
                      {teamPickStats.remaining}
                    </strong>{" "}
                    โครงการที่ทีม Metier แนะนำ ยังไม่ถูกติ๊ก
                    <span className="ml-1 text-[color:var(--color-muted)]">
                      (ติ๊กแล้ว {teamPickStats.alreadyPicked} / {teamPickStats.total})
                    </span>
                  </span>
                </div>
                <Button size="sm" onClick={applyTeamPicks}>
                  <Check className="h-3.5 w-3.5" />
                  ติ๊กทั้งหมด
                </Button>
              </div>
            )}
            {teamPickStats.remaining === 0 && teamPickStats.total > 0 && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
                <Check className="mr-1 inline h-3.5 w-3.5" />
                ติ๊กตามทีมแนะนำครบ {teamPickStats.total} โครงการแล้ว
              </div>
            )}

            {/* Main Group chips — split by Metier / Municipal */}
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[12px] text-[color:var(--color-muted)]">Main Group · Metier</span>
                {selectedMains.size > 0 && (
                  <button
                    onClick={() => setSelectedMains(new Set())}
                    className="text-[11px] text-[color:var(--color-muted-fg)] hover:text-fg"
                  >
                    ล้าง ({selectedMains.size})
                  </button>
                )}
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {METIER_GROUPS.map((m) => (
                  <ColorChip
                    key={m}
                    label={m}
                    color={GROUP_COLOR[m]}
                    active={selectedMains.has(m)}
                    onToggle={() => toggleSet(selectedMains, m, setSelectedMains)}
                  />
                ))}
              </div>
              <div className="mb-1.5 text-[12px] text-[color:var(--color-muted)]">
                Main Group · Municipal
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MUNICIPAL_GROUPS.map((m) => (
                  <ColorChip
                    key={m}
                    label={m}
                    color={GROUP_COLOR[m]}
                    active={selectedMains.has(m)}
                    onToggle={() => toggleSet(selectedMains, m, setSelectedMains)}
                  />
                ))}
              </div>
            </div>

            {/* Year toggle (has-budget-in-year-X) */}
            <div>
              <div className="mb-1.5 text-[12px] text-[color:var(--color-muted)]">
                มีงบในปี (เลือกได้หลายปี — เป็น OR)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {YEARS.map((y) => (
                  <ToggleChip
                    key={y}
                    active={selectedYears.has(y)}
                    onToggle={() => toggleSet(selectedYears, y, setSelectedYears)}
                  >
                    พ.ศ. {y}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <ChipGroup
              label="หน่วยงาน (top 12)"
              options={departments.slice(0, 12)}
              selected={selectedDepts}
              onToggle={(v) => toggleSet(selectedDepts, v, setSelectedDepts)}
            />

            <ChipGroup
              label="ที่มา PDF"
              options={pdfSources}
              selected={selectedPdfs}
              onToggle={(v) => toggleSet(selectedPdfs, v, setSelectedPdfs)}
              labelFor={pdfShort}
            />

            {statusTypes.length > 0 && (
              <ChipGroup
                label="สถานะโครงการ (เดิม / เปลี่ยน / เพิ่ม)"
                options={statusTypes}
                selected={selectedStatusTypes}
                onToggle={(v) => toggleSet(selectedStatusTypes, v, setSelectedStatusTypes)}
              />
            )}

            {/* Budget range */}
            <div className="border-t border-[color:var(--color-border)] pt-3">
              <div className="mb-1.5 text-[12px] text-[color:var(--color-muted)]">ช่วงงบ (บาท)</div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {BUDGET_PRESETS.map((p, i) => (
                  <ToggleChip
                    key={p.label}
                    active={activeBudgetPreset === i}
                    onToggle={() => {
                      setActiveBudgetPreset(activeBudgetPreset === i ? null : i);
                      setBudgetMin("");
                      setBudgetMax("");
                    }}
                  >
                    {p.label}
                  </ToggleChip>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[color:var(--color-muted)]">ขั้นต่ำ</span>
                  <Input
                    type="number"
                    value={budgetMin}
                    onChange={(e) => {
                      setBudgetMin(e.target.value);
                      setActiveBudgetPreset(null);
                    }}
                    placeholder="0"
                    className="w-[120px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[color:var(--color-muted)]">สูงสุด</span>
                  <Input
                    type="number"
                    value={budgetMax}
                    onChange={(e) => {
                      setBudgetMax(e.target.value);
                      setActiveBudgetPreset(null);
                    }}
                    placeholder="ไม่จำกัด"
                    className="w-[120px]"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk actions + list header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[14px]">
          <div className="text-[color:var(--color-muted-fg)]">
            แสดง{" "}
            <span className="font-bold text-fg">{filtered.length.toLocaleString("th-TH")}</span>{" "}
            โครงการ จากทั้งหมด {projects.length.toLocaleString("th-TH")}
            {filteredSelectedCount > 0 && (
              <span className="ml-2 text-metier-orange">
                · เลือกในชุดกรอง {filteredSelectedCount.toLocaleString("th-TH")}
              </span>
            )}
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
              overrides={overrides}
              selected={isSelected(p.master_project_id)}
              onToggle={() => toggle(p.master_project_id)}
            />
          ))}
          {filtered.length > 200 && (
            <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-center text-[13px] text-[color:var(--color-muted)]">
              แสดง 200 รายการแรก จาก {filtered.length.toLocaleString("th-TH")} — กรองเพิ่มเพื่อแคบลง
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
          <CardContent className="space-y-4 pt-5">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-metier-orange" />
                <CardTitle>สรุปสด</CardTitle>
              </div>
              <CardDescription>อัปเดตทันทีทุกครั้งที่ติ๊ก/ยกเลิก</CardDescription>
            </div>

            {/* Headline numbers */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="เลือกแล้ว"
                value={hydrated ? summary.items.length.toLocaleString("th-TH") : "—"}
                unit="โครงการ"
                accent
                animateKey={summary.items.length}
              />
              <StatTile
                label="มูลค่ารวม"
                value={hydrated ? formatBahtCompact(summary.total) : "—"}
                unit="บาท"
                accent
                animateKey={summary.total}
              />
              <StatTile
                label="เฉลี่ย/โครงการ"
                value={hydrated && summary.items.length ? formatBahtCompact(summary.avg) : "—"}
                unit="บาท"
                animateKey={summary.avg}
              />
              <StatTile
                label="สาย Metier"
                value={
                  hydrated && summary.items.length
                    ? `${summary.metierCount} (${((summary.metierCount / summary.items.length) * 100).toFixed(0)}%)`
                    : "—"
                }
                unit="โครงการ"
                animateKey={summary.metierCount}
              />
            </div>

            {/* Main Group mix — replaces old pie */}
            {summary.items.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  Main Group mix
                </div>
                <div className="space-y-1">
                  {summary.mixArr.map((m) => {
                    const pct = summary.total ? (m.budget / summary.total) * 100 : 0;
                    const color = GROUP_COLOR[m.name] ?? "#94a3b8";
                    return (
                      <div key={m.name} className="space-y-0.5">
                        <div className="flex items-baseline justify-between gap-2 text-[12px]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: color }}
                            />
                            <span className="truncate">
                              {m.name === UNCLASSIFIED ? "ยังไม่จัดหมวด" : m.name}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">
                            {m.count} · {formatBahtCompact(m.budget)}
                          </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget by year (stacked horizontal bar) */}
            {summary.items.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  งบประมาณตามปี
                </div>
                <div className="space-y-1">
                  {YEARS.map((y) => {
                    const v = summary.yearMix[y];
                    const pct = summary.total ? (v / summary.total) * 100 : 0;
                    return (
                      <div key={y} className="grid grid-cols-[44px_1fr_auto] items-center gap-2 text-[12px]">
                        <span className="text-[color:var(--color-muted)]">พ.ศ. {y}</span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                          <div
                            className="h-full rounded-full bg-metier-orange/80"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="shrink-0 tabular-nums font-medium">
                          {formatBahtCompact(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PDF source mix */}
            {summary.pdfArr.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  ที่มา PDF
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.pdfArr.map((p) => (
                    <Badge key={p.name} variant="outline" className="gap-1 text-[11px]">
                      <FileText className="h-2.5 w-2.5" />
                      {pdfShort(p.name)}
                      <span className="ml-0.5 tabular-nums font-bold">{p.count}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Top 10 departments */}
            {summary.topDepts.length > 0 && (
              <div>
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  หน่วยงาน (top 10 ตามงบ)
                </div>
                <div className="space-y-1">
                  {summary.topDepts.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-baseline justify-between gap-2 text-[12px]"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 tabular-nums text-[color:var(--color-muted-fg)]">
                        {d.count} ·{" "}
                        <span className="font-medium text-fg">
                          {formatBahtCompact(d.budget)}
                        </span>
                      </span>
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

function bump<K>(m: Map<K, { count: number; budget: number }>, k: K, b: number) {
  const s = m.get(k) ?? { count: 0, budget: 0 };
  s.count += 1;
  s.budget += b;
  m.set(k, s);
}

function ProjectRow({
  p,
  overrides,
  selected,
  onToggle,
}: {
  p: ProjectRecord;
  overrides: OverrideMap;
  selected: boolean;
  onToggle: () => void;
}) {
  const main = getMainGroup(p, overrides);
  const sub = getSubService(p, overrides);
  const isMetier = isMetierGroup(main);
  const color = GROUP_COLOR[main] ?? "#94a3b8";
  const isTeamPick = TEAM_PICK_IDS.has(p.master_project_id);
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 transition-colors",
        selected
          ? "border-metier-orange ring-1 ring-metier-orange/30"
          : isTeamPick
            ? "border-metier-orange/50 bg-[color:var(--color-metier-orange)]/[0.02]"
            : "border-[color:var(--color-border)] hover:border-metier-orange/40",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="leading-snug font-medium">{p.project_name_th}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--color-muted)]">
              {p.source_pdf_file && (
                <span className="inline-flex items-center gap-0.5">
                  <FileText className="h-2.5 w-2.5" />
                  {pdfShort(p.source_pdf_file)}
                  {p.source_page ? ` · น.${p.source_page}` : ""}
                </span>
              )}
              <span>· {p.responsible_department || "—"}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[15px] font-bold tabular-nums" style={{ color }}>
              {formatBahtCompact(Number(p.total_budget) || 0)}
            </div>
            <div className="text-[11px] text-[color:var(--color-muted)]">
              {p.first_planned_year || "—"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10.5px]"
            style={isMetier ? { borderColor: color, color, fontWeight: 600 } : undefined}
          >
            {main}
            {sub && sub !== main ? ` · ${sub}` : ""}
          </Badge>
          {isTeamPick && (
            <Badge
              className="gap-0.5 border-metier-orange bg-metier-orange text-[10.5px] text-white"
              title="ทีม Metier แนะนำตามไฟล์ที่ส่งมา"
            >
              <Users className="h-2.5 w-2.5" />
              ทีมแนะนำ
            </Badge>
          )}
        </div>
      </div>
    </label>
  );
}

function StatTile({
  label,
  value,
  unit,
  accent,
  animateKey,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  animateKey: string | number;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="text-[11px] uppercase text-[color:var(--color-muted)]">{label}</div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={animateKey}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "text-[22px] font-bold tabular-nums",
            accent && "text-metier-orange",
          )}
        >
          {value}
        </motion.div>
      </AnimatePresence>
      {unit && <div className="text-[11px] text-[color:var(--color-muted)]">{unit}</div>}
    </div>
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

function ColorChip({
  label,
  color,
  active,
  onToggle,
}: {
  label: string;
  color: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all",
        active && "text-white",
      )}
      style={
        active
          ? { background: color, borderColor: color }
          : { borderColor: color, color }
      }
    >
      {label}
    </button>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
  labelFor,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  labelFor?: (v: string) => string;
}) {
  if (!options.length) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] text-[color:var(--color-muted)]">{label}</span>
        {selected.size > 0 && (
          <button
            onClick={() => {
              for (const v of Array.from(selected)) onToggle(v);
            }}
            className="text-[11px] text-[color:var(--color-muted-fg)] hover:text-fg"
          >
            ล้าง ({selected.size})
          </button>
        )}
      </div>
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
              {labelFor ? labelFor(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
