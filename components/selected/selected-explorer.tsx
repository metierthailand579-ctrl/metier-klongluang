"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownAZ,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardEdit,
  Download,
  FileText,
  Flag,
  Paperclip,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import type { ProjectRecord } from "@/types/db";
import {
  GROUP_COLOR,
  METIER_GROUPS,
  MUNICIPAL_GROUPS,
  getMainGroup,
  getSubService,
  type OverrideMap,
} from "@/lib/data/metier-taxonomy";

const GROUP_OVERRIDES_KEY = "klongluang.groupOverrides.v1";

type SortKey =
  | "priority"
  | "budget_desc"
  | "budget_asc"
  | "start_q"
  | "name"
  | "confirmed";
type StatusFilter = "all" | "confirmed" | "pending";
type ScheduleFilter = "all" | "scheduled" | "unscheduled";

const PRIORITY_RANK: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  "": 0,
};

const SORT_LABELS: Record<SortKey, string> = {
  priority: "Priority (สูง → ต่ำ)",
  budget_desc: "งบ (มาก → น้อย)",
  budget_asc: "งบ (น้อย → มาก)",
  start_q: "Start Q (เร็ว → ช้า)",
  name: "ชื่อ (ก-ฮ)",
  confirmed: "Confirmed มาก่อน",
};

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const TOR_KEY = "khlongluang.torRefs.v1";
const SOW_KEY = "khlongluang.sowItems.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";
const META_KEY = "khlongluang.projectMeta.v1";
const ATTACH_KEY = "khlongluang.torAttachments.v1";

// 2 MB / file — keeps localStorage manageable until Supabase Storage is wired up.
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ConfirmRecord = {
  confirmed: boolean;
  notes: string;
  confirmed_at?: string;
};

export type TorRef = {
  code: string;
  note: string;
};

export type Priority = "urgent" | "high" | "medium" | "low" | "";
export type StartQuarter =
  | ""
  | "2569-Q1"
  | "2569-Q2"
  | "2569-Q3"
  | "2569-Q4"
  | "2570-Q1"
  | "2570-Q2"
  | "2570-Q3"
  | "2570-Q4";

export type ProjectMeta = {
  priority: Priority;
  start_q: StartQuarter;
};

export type TorAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  data_url: string; // base64 — local-only until Supabase Storage hooks up
  uploaded_at: string;
};

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; color: string }> = [
  { value: "urgent", label: "🔥 Urgent", color: "#dc2626" },
  { value: "high", label: "↑ High", color: "#ff5008" },
  { value: "medium", label: "— Medium", color: "#f59e0b" },
  { value: "low", label: "↓ Low", color: "#64748b" },
];

const QUARTER_OPTIONS: StartQuarter[] = [
  "2569-Q1",
  "2569-Q2",
  "2569-Q3",
  "2569-Q4",
  "2570-Q1",
  "2570-Q2",
  "2570-Q3",
  "2570-Q4",
];

export function priorityColor(p: Priority): string {
  return PRIORITY_OPTIONS.find((o) => o.value === p)?.color ?? "#94a3b8";
}
export function priorityLabel(p: Priority): string {
  return PRIORITY_OPTIONS.find((o) => o.value === p)?.label ?? "— ไม่ตั้ง";
}

export function SelectedExplorer({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated] = useLocalStorage<string[]>(SELECTED_KEY, []);
  const [torMap, setTorMap] = useLocalStorage<Record<string, TorRef[]>>(TOR_KEY, {});
  const [sowMap, setSowMap] = useLocalStorage<Record<string, string[]>>(SOW_KEY, {});
  const [confirmMap, setConfirmMap] = useLocalStorage<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );
  const [metaMap, setMetaMap] = useLocalStorage<Record<string, ProjectMeta>>(META_KEY, {});
  const [attachMap, setAttachMap] = useLocalStorage<Record<string, TorAttachment[]>>(
    ATTACH_KEY,
    {},
  );

  const [overrides] = useLocalStorage<OverrideMap>(GROUP_OVERRIDES_KEY, {});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [mainGroupFilter, setMainGroupFilter] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const allItems = useMemo(() => {
    const set = new Set(selectedIds);
    return projects.filter((p) => set.has(p.master_project_id));
  }, [projects, selectedIds]);

  const summary = useMemo(() => {
    const total = allItems.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const confirmedCount = allItems.filter(
      (p) => confirmMap[p.master_project_id]?.confirmed,
    ).length;
    return { count: allItems.length, total, confirmedCount };
  }, [allItems, confirmMap]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = allItems.filter((p) => {
      const m = metaMap[p.master_project_id];
      const c = confirmMap[p.master_project_id];
      if (statusFilter === "confirmed" && !c?.confirmed) return false;
      if (statusFilter === "pending" && c?.confirmed) return false;
      if (scheduleFilter === "scheduled" && !m?.start_q) return false;
      if (scheduleFilter === "unscheduled" && m?.start_q) return false;
      if (priorityFilter.size && !priorityFilter.has(m?.priority ?? ("" as Priority)))
        return false;
      if (mainGroupFilter.size) {
        const main = getMainGroup(p, overrides);
        if (!mainGroupFilter.has(main)) return false;
      }
      if (needle) {
        const hay = `${p.project_name_th ?? ""} ${p.responsible_department ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      const ma = metaMap[a.master_project_id];
      const mb = metaMap[b.master_project_id];
      const ca = confirmMap[a.master_project_id];
      const cb = confirmMap[b.master_project_id];
      const ba = Number(a.total_budget) || 0;
      const bb = Number(b.total_budget) || 0;
      switch (sortKey) {
        case "priority": {
          const d =
            (PRIORITY_RANK[mb?.priority ?? ""] ?? 0) -
            (PRIORITY_RANK[ma?.priority ?? ""] ?? 0);
          return d !== 0 ? d : bb - ba;
        }
        case "budget_desc":
          return bb - ba;
        case "budget_asc":
          return ba - bb;
        case "start_q":
          return (ma?.start_q || "ZZZ").localeCompare(mb?.start_q || "ZZZ");
        case "name":
          return (a.project_name_th || "").localeCompare(b.project_name_th || "", "th");
        case "confirmed":
          return (cb?.confirmed ? 1 : 0) - (ca?.confirmed ? 1 : 0);
        default:
          return 0;
      }
    });
    return sorted;
  }, [
    allItems,
    metaMap,
    confirmMap,
    overrides,
    q,
    statusFilter,
    scheduleFilter,
    priorityFilter,
    mainGroupFilter,
    sortKey,
  ]);

  const filtersActive =
    q !== "" ||
    statusFilter !== "all" ||
    scheduleFilter !== "all" ||
    priorityFilter.size > 0 ||
    mainGroupFilter.size > 0;

  const togglePriority = (p: Priority) => {
    const next = new Set(priorityFilter);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPriorityFilter(next);
  };
  const toggleMainGroup = (g: string) => {
    const next = new Set(mainGroupFilter);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setMainGroupFilter(next);
  };
  const resetFilters = () => {
    setQ("");
    setStatusFilter("all");
    setScheduleFilter("all");
    setPriorityFilter(new Set());
    setMainGroupFilter(new Set());
  };

  const updateTor = (pid: string, fn: (prev: TorRef[]) => TorRef[]) => {
    setTorMap((prev) => ({ ...prev, [pid]: fn(prev[pid] ?? []) }));
  };
  const updateSow = (pid: string, fn: (prev: string[]) => string[]) => {
    setSowMap((prev) => ({ ...prev, [pid]: fn(prev[pid] ?? []) }));
  };
  const setConfirm = (pid: string, fn: (prev: ConfirmRecord) => ConfirmRecord) => {
    setConfirmMap((prev) => ({
      ...prev,
      [pid]: fn(prev[pid] ?? { confirmed: false, notes: "" }),
    }));
  };
  const setMeta = (pid: string, fn: (prev: ProjectMeta) => ProjectMeta) => {
    setMetaMap((prev) => ({
      ...prev,
      [pid]: fn(prev[pid] ?? { priority: "", start_q: "" }),
    }));
  };
  const updateAttach = (
    pid: string,
    fn: (prev: TorAttachment[]) => TorAttachment[],
  ) => {
    setAttachMap((prev) => ({ ...prev, [pid]: fn(prev[pid] ?? []) }));
  };

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-[color:var(--color-muted)]">
        กำลังโหลดที่เลือกไว้...
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-12 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-[color:var(--color-muted)]" />
        <CardTitle>ยังไม่มีโครงการที่เลือก</CardTitle>
        <CardDescription className="mx-auto mt-2 max-w-sm">
          ไปที่{" "}
          <a href="/filter" className="font-medium text-metier-orange underline">
            หน้า 5 · คัดเลือก
          </a>{" "}
          เพื่อกรองและติ๊กโครงการที่ Metier น่าทำก่อน
        </CardDescription>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <motion.div
          className="grid flex-1 gap-3 sm:grid-cols-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <KpiCard label="โครงการที่เลือก" value={summary.count.toLocaleString("th-TH")} unit="รายการ" accent />
          <KpiCard
            label="งบประมาณรวม"
            value={formatBahtCompact(summary.total)}
            unit="บาท"
            hint={formatBaht(summary.total) + " บาท"}
          />
          <KpiCard
            label="ยืนยันแล้ว"
            value={summary.confirmedCount.toLocaleString("th-TH")}
            unit={`/ ${summary.count.toLocaleString("th-TH")}`}
            hint="เทศบาลกด Confirm"
          />
        </motion.div>
        <Button
          variant="outline"
          onClick={() => exportSelectedToCsv(allItems, metaMap, confirmMap, sowMap, torMap, overrides)}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-md border border-dashed border-amber-500/40 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5 -translate-y-px" />
        ไฟล์แนบเก็บใน browser ของคุณเอง (limit 2MB/ไฟล์) — เมื่อต่อ Supabase Storage แล้ว
        จะอัปโหลดจริงและ share ข้ามอุปกรณ์ได้
      </div>

      {/* Sort + Filter toolbar */}
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted)]" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา ชื่อโครงการ / หน่วยงาน..."
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <ArrowDownAZ className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
              <span className="text-[color:var(--color-muted-fg)]">เรียง:</span>
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="h-8 w-[180px] text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {SORT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> ล้างฟิลเตอร์
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-[color:var(--color-muted-fg)]">สถานะ:</span>
            {(
              [
                ["all", "ทั้งหมด"],
                ["confirmed", "ยืนยันแล้ว"],
                ["pending", "ยังไม่ยืนยัน"],
              ] as const
            ).map(([k, label]) => (
              <FilterChip
                key={k}
                active={statusFilter === k}
                onClick={() => setStatusFilter(k)}
              >
                {label}
              </FilterChip>
            ))}

            <span className="ml-3 text-[color:var(--color-muted-fg)]">ไตรมาส:</span>
            {(
              [
                ["all", "ทั้งหมด"],
                ["scheduled", "ตั้งแล้ว"],
                ["unscheduled", "ยังไม่ตั้ง"],
              ] as const
            ).map(([k, label]) => (
              <FilterChip
                key={k}
                active={scheduleFilter === k}
                onClick={() => setScheduleFilter(k)}
              >
                {label}
              </FilterChip>
            ))}

            <span className="ml-3 text-[color:var(--color-muted-fg)]">Priority:</span>
            {PRIORITY_OPTIONS.map((o) => (
              <FilterChip
                key={o.value}
                active={priorityFilter.has(o.value)}
                color={o.color}
                onClick={() => togglePriority(o.value)}
              >
                {o.label}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
            <span className="text-[color:var(--color-muted-fg)]">Main Group:</span>
            {[...METIER_GROUPS, ...MUNICIPAL_GROUPS].map((g) => (
              <FilterChip
                key={g}
                active={mainGroupFilter.has(g)}
                color={GROUP_COLOR[g]}
                onClick={() => toggleMainGroup(g)}
              >
                {g}
              </FilterChip>
            ))}
          </div>

          <div className="border-t border-[color:var(--color-border)] pt-2 text-[12px] text-[color:var(--color-muted-fg)]">
            แสดง{" "}
            <span className="font-bold text-fg">{items.length.toLocaleString("th-TH")}</span>{" "}
            จาก {allItems.length.toLocaleString("th-TH")} โครงการที่เลือก
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-8 text-center text-[13px] text-[color:var(--color-muted)]">
            ไม่มีโครงการตรงเงื่อนไข — ล้างฟิลเตอร์เพื่อดูทั้งหมด
          </div>
        )}
        {items.map((p, i) => (
          <ProjectCard
            key={p.master_project_id}
            project={p}
            tor={torMap[p.master_project_id] ?? []}
            sow={sowMap[p.master_project_id] ?? []}
            confirm={confirmMap[p.master_project_id] ?? { confirmed: false, notes: "" }}
            meta={metaMap[p.master_project_id] ?? { priority: "", start_q: "" }}
            attachments={attachMap[p.master_project_id] ?? []}
            onUpdateTor={(fn) => updateTor(p.master_project_id, fn)}
            onUpdateSow={(fn) => updateSow(p.master_project_id, fn)}
            onSetConfirm={(fn) => setConfirm(p.master_project_id, fn)}
            onSetMeta={(fn) => setMeta(p.master_project_id, fn)}
            onUpdateAttach={(fn) => updateAttach(p.master_project_id, fn)}
            initiallyOpen={i < 2}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  tor,
  sow,
  confirm,
  meta,
  attachments,
  onUpdateTor,
  onUpdateSow,
  onSetConfirm,
  onSetMeta,
  onUpdateAttach,
  initiallyOpen,
}: {
  project: ProjectRecord;
  tor: TorRef[];
  sow: string[];
  confirm: ConfirmRecord;
  meta: ProjectMeta;
  attachments: TorAttachment[];
  onUpdateTor: (fn: (prev: TorRef[]) => TorRef[]) => void;
  onUpdateSow: (fn: (prev: string[]) => string[]) => void;
  onSetConfirm: (fn: (prev: ConfirmRecord) => ConfirmRecord) => void;
  onSetMeta: (fn: (prev: ProjectMeta) => ProjectMeta) => void;
  onUpdateAttach: (fn: (prev: TorAttachment[]) => TorAttachment[]) => void;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const pColor = priorityColor(meta.priority);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        confirm.confirmed && "border-emerald-500/40 bg-emerald-500/[0.02]",
      )}
    >
      {/* Header — always visible, click to expand/collapse */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-5 text-left"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-subtle)]">
          {confirm.confirmed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <FileText className="h-5 w-5 text-[color:var(--color-muted-fg)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[12px] text-[color:var(--color-muted)]">
              {project.master_project_id}
            </span>
            {meta.priority && (
              <Badge
                variant="outline"
                className="text-[10.5px] font-semibold"
                style={{ borderColor: pColor, color: pColor }}
              >
                <Flag className="mr-0.5 h-2.5 w-2.5" />
                {priorityLabel(meta.priority)}
              </Badge>
            )}
            {meta.start_q && (
              <Badge variant="outline" className="text-[10.5px]">
                <CalendarClock className="mr-0.5 h-2.5 w-2.5" />
                เริ่ม {meta.start_q}
              </Badge>
            )}
            {confirm.confirmed && <Badge variant="success">ยืนยันแล้ว</Badge>}
            {tor.length > 0 && <Badge variant="muted">{tor.length} TOR ref</Badge>}
            {attachments.length > 0 && (
              <Badge variant="muted">
                <Paperclip className="mr-0.5 h-2.5 w-2.5" />
                {attachments.length} ไฟล์
              </Badge>
            )}
            {sow.length > 0 && <Badge variant="muted">{sow.length} SOW</Badge>}
          </div>
          <div className="mt-1 font-bold leading-snug">{project.project_name_th}</div>
          <div className="mt-1 truncate text-[13px] text-[color:var(--color-muted-fg)]">
            {project.responsible_department || "—"} · {project.work_category_layer1} · ปี{" "}
            {project.first_planned_year || "—"}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[18px] font-bold tabular-nums">
            {formatBaht(project.total_budget)}
          </div>
          <div className="mt-1 text-[12px] text-[color:var(--color-muted)]">บาท</div>
        </div>
        <div className="shrink-0 self-center">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Meta bar — ALWAYS visible (priority + start Q). The user said the
          confirm/important controls must NOT vanish when collapsed. */}
      <MetaBar meta={meta} onSet={onSetMeta} />

      {/* Expand/collapse only the editorial sections (TOR list + SOW) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-5 border-t border-[color:var(--color-border)] p-5 md:grid-cols-2">
              <TorRefList
                items={tor}
                attachments={attachments}
                onUpdate={onUpdateTor}
                onUpdateAttach={onUpdateAttach}
              />
              <SowList items={sow} onUpdate={onUpdateSow} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm strip — ALWAYS visible, OUTSIDE expand/collapse */}
      <ConfirmStrip confirm={confirm} onSet={onSetConfirm} />
    </Card>
  );
}

function MetaBar({
  meta,
  onSet,
}: {
  meta: ProjectMeta;
  onSet: (fn: (prev: ProjectMeta) => ProjectMeta) => void;
}) {
  const pColor = priorityColor(meta.priority);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40 px-5 py-2.5 text-[12px]">
      <div className="flex items-center gap-2">
        <Flag className="h-3.5 w-3.5 text-[color:var(--color-muted-fg)]" />
        <span className="text-[color:var(--color-muted-fg)]">Priority:</span>
        <Select
          value={meta.priority || "__none__"}
          onValueChange={(v) =>
            onSet((prev) => ({ ...prev, priority: (v === "__none__" ? "" : v) as Priority }))
          }
        >
          <SelectTrigger
            className="h-8 w-[160px] text-[12px]"
            style={
              meta.priority
                ? { borderColor: pColor, color: pColor, fontWeight: 600 }
                : undefined
            }
          >
            <SelectValue placeholder="— ไม่ตั้ง" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— ไม่ตั้ง</SelectItem>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span style={{ color: o.color }}>{o.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-[color:var(--color-muted-fg)]" />
        <span className="text-[color:var(--color-muted-fg)]">เริ่มทำงาน:</span>
        <Select
          value={meta.start_q || "__none__"}
          onValueChange={(v) =>
            onSet((prev) => ({ ...prev, start_q: (v === "__none__" ? "" : v) as StartQuarter }))
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-[12px]">
            <SelectValue placeholder="— ไม่ระบุไตรมาส" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— ไม่ระบุไตรมาส</SelectItem>
            <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              ปี 2569
            </div>
            {QUARTER_OPTIONS.slice(0, 4).map((q) => (
              <SelectItem key={q} value={q}>
                {q.replace("-", " ")}
              </SelectItem>
            ))}
            <div className="border-t border-[color:var(--color-border)] px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-muted)]">
              ปี 2570
            </div>
            {QUARTER_OPTIONS.slice(4).map((q) => (
              <SelectItem key={q} value={q}>
                {q.replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TorRefList({
  items,
  attachments,
  onUpdate,
  onUpdateAttach,
}: {
  items: TorRef[];
  attachments: TorAttachment[];
  onUpdate: (fn: (prev: TorRef[]) => TorRef[]) => void;
  onUpdateAttach: (fn: (prev: TorAttachment[]) => TorAttachment[]) => void;
}) {
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = () => {
    if (!code.trim() && !note.trim()) return;
    onUpdate((prev) => [...prev, { code: code.trim(), note: note.trim() }]);
    setCode("");
    setNote("");
  };
  const remove = (i: number) => onUpdate((prev) => prev.filter((_, idx) => idx !== i));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const next: TorAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" ใหญ่เกิน 2MB — ยังเก็บใน browser ไม่ได้`);
        continue;
      }
      const data_url = await readAsDataURL(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        data_url,
        uploaded_at: new Date().toISOString(),
      });
    }
    if (next.length) onUpdateAttach((prev) => [...prev, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (id: string) =>
    onUpdateAttach((prev) => prev.filter((a) => a.id !== id));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
        <h3 className="font-bold">TOR อ้างอิง</h3>
        <Badge variant="muted" className="ml-auto">
          {items.length} ref · {attachments.length} ไฟล์
        </Badge>
      </div>

      {/* TOR refs (text) */}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-center text-[12px] text-[color:var(--color-muted)]">
          ยังไม่มี TOR อ้างอิง — เพิ่มจากด้านล่าง
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t, i) => (
            <li
              key={i}
              className="group flex items-start gap-2 rounded-md border border-[color:var(--color-border)] bg-white p-2.5 text-[13px]"
            >
              <div className="min-w-0 flex-1">
                {t.code && (
                  <div className="font-mono text-[11px] text-metier-orange">{t.code}</div>
                )}
                {t.note && <div className="mt-0.5 leading-snug">{t.note}</div>}
              </div>
              <button
                onClick={() => remove(i)}
                className="invisible shrink-0 rounded p-0.5 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg group-hover:visible"
                title="ลบ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* File attachments */}
      {attachments.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-medium text-[color:var(--color-muted)]">
            ไฟล์แนบ
          </div>
          <ul className="space-y-1.5">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="group flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-white p-2 text-[12px]"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{a.name}</div>
                  <div className="text-[10px] text-[color:var(--color-muted)]">
                    {formatBytes(a.size)} · {a.type || "ไม่ทราบชนิด"}
                  </div>
                </div>
                <a
                  href={a.data_url}
                  download={a.name}
                  className="rounded p-1 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg"
                  title="ดาวน์โหลด"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="invisible rounded p-1 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg group-hover:visible"
                  title="ลบไฟล์"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Add form */}
      <div className="mt-3 space-y-2 rounded-md border border-dashed border-[color:var(--color-border)] p-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="เลขโครงการ TOR (ถ้ามี) เช่น 68059..."
          className="text-[13px]"
        />
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="หมายเหตุ / ชื่อโครงการ / ลิงก์เอกสาร"
          className="min-h-[52px] text-[13px]"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={add} className="flex-1">
            <Plus className="h-3.5 w-3.5" /> เพิ่ม TOR ref
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="flex-1"
          >
            <Paperclip className="h-3.5 w-3.5" /> แนบไฟล์
          </Button>
        </div>
      </div>
    </div>
  );
}

function SowList({
  items,
  onUpdate,
}: {
  items: string[];
  onUpdate: (fn: (prev: string[]) => string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onUpdate((prev) => [...prev, t]);
    setDraft("");
  };
  const remove = (i: number) => onUpdate((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardEdit className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
        <h3 className="font-bold">SOW</h3>
        <Badge variant="muted" className="ml-auto">{items.length} รายการ</Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-center text-[12px] text-[color:var(--color-muted)]">
          ยังไม่มี SOW — เพิ่มจากด้านล่าง
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="group flex items-start gap-2 rounded-md border border-[color:var(--color-border)] bg-white p-2.5 text-[13px]"
            >
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-metier-orange" />
              <span className="flex-1 leading-snug">{it}</span>
              <button
                onClick={() => remove(i)}
                className="invisible shrink-0 rounded p-0.5 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg group-hover:visible"
                title="ลบ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-[color:var(--color-border)] p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="เพิ่ม SOW item (กด ⌘/Ctrl + Enter เพื่อเพิ่ม)"
          className="min-h-[60px] flex-1 text-[13px]"
        />
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> เพิ่ม
        </Button>
      </div>
    </div>
  );
}

function ConfirmStrip({
  confirm,
  onSet,
}: {
  confirm: ConfirmRecord;
  onSet: (fn: (prev: ConfirmRecord) => ConfirmRecord) => void;
}) {
  return (
    <div
      className={cn(
        "border-t border-[color:var(--color-border)] p-5 transition-colors",
        confirm.confirmed && "bg-emerald-500/[0.04]",
      )}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-[color:var(--color-muted-fg)]">
            หมายเหตุจากเทศบาล / ทีม Metier
          </label>
          <Textarea
            value={confirm.notes}
            onChange={(e) => onSet((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="เช่น 'ตกลงในหลักการ ขอเพิ่ม training 2 รอบ' / 'รอเอกสารยืนยันงบ'"
            className="min-h-[60px]"
          />
        </div>
        <div className="flex flex-col items-stretch justify-end gap-2 md:w-[200px]">
          {confirm.confirmed ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  onSet((prev) => ({ ...prev, confirmed: false, confirmed_at: undefined }))
                }
              >
                <X className="h-4 w-4" /> ยกเลิกยืนยัน
              </Button>
              <div className="text-center text-[11px] text-[color:var(--color-muted)]">
                ยืนยันเมื่อ {confirm.confirmed_at?.slice(0, 10) || "—"}
              </div>
            </>
          ) : (
            <Button
              size="lg"
              onClick={() =>
                onSet((prev) => ({
                  ...prev,
                  confirmed: true,
                  confirmed_at: new Date().toISOString(),
                }))
              }
            >
              <CheckCircle2 className="h-4 w-4" /> เทศบาลยืนยัน
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
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

function exportSelectedToCsv(
  items: ProjectRecord[],
  metaMap: Record<string, ProjectMeta>,
  confirmMap: Record<string, ConfirmRecord>,
  sowMap: Record<string, string[]>,
  torMap: Record<string, TorRef[]>,
  overrides: OverrideMap,
) {
  if (items.length === 0) {
    alert("ยังไม่มีโครงการที่เลือก");
    return;
  }
  const headers = [
    "ID",
    "ชื่อโครงการ",
    "หน่วยงาน",
    "Main Group",
    "Sub-service",
    "งบประมาณ (บาท)",
    "ปีเริ่ม",
    "Priority",
    "Start Q",
    "ยืนยัน",
    "วันที่ยืนยัน",
    "TOR refs",
    "SOW items",
    "หมายเหตุ",
  ];
  const rows = items.map((p) => {
    const m = metaMap[p.master_project_id];
    const c = confirmMap[p.master_project_id];
    const main = getMainGroup(p, overrides);
    const sub = getSubService(p, overrides);
    const tor = torMap[p.master_project_id] ?? [];
    const sow = sowMap[p.master_project_id] ?? [];
    return [
      p.master_project_id,
      p.project_name_th ?? "",
      p.responsible_department ?? "",
      main,
      sub,
      String(Number(p.total_budget) || 0),
      p.first_planned_year ?? "",
      m?.priority ?? "",
      m?.start_q ?? "",
      c?.confirmed ? "TRUE" : "FALSE",
      c?.confirmed_at?.slice(0, 10) ?? "",
      tor.map((t) => `${t.code}: ${t.note}`).join(" | "),
      sow.join(" | "),
      c?.notes ?? "",
    ];
  });
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
  // Prepend BOM so Excel opens Thai characters correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `klongluang-selected-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
