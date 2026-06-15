"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  ExternalLink,
  FileText,
  Flag,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCw,
  Search,
  Send,
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
import { YearBudgetStrip } from "@/components/year-budget-strip";
import {
  cn,
  formatBaht,
  formatBahtCompact,
  formatIctIsoDate,
  formatThaiDateOnly,
  formatThaiTimestamp,
} from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import { useSyncedState } from "@/lib/shared-state";
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
const TOR_DRAFT_KEY = "khlongluang.torDrafts.v1";

// 2 MB / file — keeps localStorage manageable until Supabase Storage is wired up.
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type ConfirmRecord = {
  confirmed: boolean;
  notes: string;
  confirmed_at?: string;
};

export type TorUsability = "pending" | "usable" | "not_usable";

export type TorComment = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

export type TorRef = {
  id?: string; // stable React key; backfilled for legacy rows saved before this field
  code: string;
  note: string;
  usable?: TorUsability; // undefined === "pending" (back-compat for existing rows)
  comments?: TorComment[];
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

// The actual TOR the team drafts themselves (work product), stored inline as
// text and synced so everyone sees the same draft. Distinct from TorRef, which
// only points at existing/historical TOR documents.
export type TorDraftStatus =
  | "drafting"
  | "done"
  | "review_pending"
  | "reviewed"
  | "revised"
  | "submitted";
export type TorDraft = {
  content: string;
  status: TorDraftStatus;
  updated_at: string;
};
const EMPTY_DRAFT: TorDraft = { content: "", status: "drafting", updated_at: "" };
const DRAFT_STATUS: Array<{ value: TorDraftStatus; label: string; cls: string }> = [
  { value: "drafting", label: "กำลังร่าง", cls: "border-slate-400/50 bg-slate-50 text-slate-600" },
  { value: "done", label: "ร่างเสร็จ", cls: "border-sky-500/40 bg-sky-50 text-sky-700" },
  { value: "review_pending", label: "รอตรวจ", cls: "border-amber-500/40 bg-amber-50 text-amber-700" },
  { value: "reviewed", label: "ตรวจแล้ว", cls: "border-violet-500/40 bg-violet-50 text-violet-700" },
  { value: "revised", label: "ตรวจแล้วผ่านแก้", cls: "border-teal-500/40 bg-teal-50 text-teal-700" },
  { value: "submitted", label: "ส่งแล้ว", cls: "border-emerald-500/40 bg-emerald-50 text-emerald-700" },
];
function draftStatusLabel(s: TorDraftStatus): string {
  return DRAFT_STATUS.find((o) => o.value === s)?.label ?? "กำลังร่าง";
}
function draftStatusClass(s: TorDraftStatus): string {
  return DRAFT_STATUS.find((o) => o.value === s)?.cls ?? DRAFT_STATUS[0].cls;
}

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

// Local-first text editing for fields that sync to shared state. Keeps the
// textarea instant while pushing to Supabase only after the user pauses (so
// fast typing doesn't spam Realtime or fight a teammate's caret). A remote
// value is adopted only when the user isn't mid-edit; any pending edit is
// flushed on unmount so collapsing a card or navigating away never drops it.
function useDebouncedSync<T>(
  remote: T,
  commit: (value: T) => void,
  delay = 500,
): [T, (value: T) => void] {
  const [local, setLocal] = useState<T>(remote);
  const editingRef = useRef(false);
  const pendingRef = useRef<T>(remote);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });

  useEffect(() => {
    if (!editingRef.current) setLocal(remote);
  }, [remote]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (editingRef.current) commitRef.current(pendingRef.current);
    };
  }, []);

  const onChange = (value: T) => {
    setLocal(value);
    pendingRef.current = value;
    editingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      editingRef.current = false;
      commitRef.current(value);
    }, delay);
  };

  return [local, onChange];
}

export function SelectedExplorer({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated] = useSyncedState<string[]>(SELECTED_KEY, []);
  const [torMap, setTorMap] = useSyncedState<Record<string, TorRef[]>>(TOR_KEY, {});
  const [sowMap, setSowMap] = useSyncedState<Record<string, string[]>>(SOW_KEY, {});
  const [confirmMap, setConfirmMap] = useSyncedState<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );
  const [metaMap, setMetaMap] = useSyncedState<Record<string, ProjectMeta>>(META_KEY, {});
  const [draftMap, setDraftMap] = useSyncedState<Record<string, TorDraft>>(
    TOR_DRAFT_KEY,
    {},
  );
  // File attachments stay local-only: base64 in a shared JSONB column would
  // explode the table size and isn't useful until we wire Supabase Storage.
  const [attachMap, setAttachMap] = useLocalStorage<Record<string, TorAttachment[]>>(
    ATTACH_KEY,
    {},
  );

  const [overrides] = useSyncedState<OverrideMap>(GROUP_OVERRIDES_KEY, {});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<Set<Priority>>(new Set());
  const [mainGroupFilter, setMainGroupFilter] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  // Per-card expand state (undefined === fall back to default: first 2 open).
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [attachNoticeDismissed, setAttachNoticeDismissed] = useLocalStorage<boolean>(
    "khlongluang.attachNoticeDismissed.v1",
    false,
  );

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
  const setAllOpen = (value: boolean) =>
    setOpenMap(Object.fromEntries(items.map((p) => [p.master_project_id, value])));

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
  const updateDraft = (pid: string, fn: (prev: TorDraft) => TorDraft) => {
    setDraftMap((prev) => ({ ...prev, [pid]: fn(prev[pid] ?? EMPTY_DRAFT) }));
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

      <YearBudgetStrip projects={allItems} title="งบประมาณตามปี (โครงการที่เลือก)" />

      {!attachNoticeDismissed && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-500/40 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            ไฟล์แนบเก็บใน browser ของคุณเอง (limit 2MB/ไฟล์) — เมื่อต่อ Supabase Storage แล้ว
            จะอัปโหลดจริงและ share ข้ามอุปกรณ์ได้
          </span>
          <button
            onClick={() => setAttachNoticeDismissed(true)}
            className="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100"
            title="ปิดข้อความนี้"
            aria-label="ปิดข้อความแจ้งเตือนไฟล์แนบ"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-border)] pt-2 text-[12px] text-[color:var(--color-muted-fg)]">
            <span>
              แสดง{" "}
              <span className="font-bold text-fg">{items.length.toLocaleString("th-TH")}</span>{" "}
              จาก {allItems.length.toLocaleString("th-TH")} โครงการที่เลือก
            </span>
            {items.length > 0 && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAllOpen(true)}>
                  <ChevronDown className="h-3.5 w-3.5" /> กางทั้งหมด
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAllOpen(false)}>
                  <ChevronUp className="h-3.5 w-3.5" /> พับทั้งหมด
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-8 text-center text-[13px] text-[color:var(--color-muted)]">
            ไม่มีโครงการตรงเงื่อนไข — ล้างฟิลเตอร์เพื่อดูทั้งหมด
          </div>
        )}
        {items.map((p, i) => {
          const isOpen = openMap[p.master_project_id] ?? i < 2;
          return (
            <ProjectCard
              key={p.master_project_id}
              project={p}
              tor={torMap[p.master_project_id] ?? []}
              sow={sowMap[p.master_project_id] ?? []}
              confirm={confirmMap[p.master_project_id] ?? { confirmed: false, notes: "" }}
              meta={metaMap[p.master_project_id] ?? { priority: "", start_q: "" }}
              attachments={attachMap[p.master_project_id] ?? []}
              draft={draftMap[p.master_project_id] ?? EMPTY_DRAFT}
              onUpdateTor={(fn) => updateTor(p.master_project_id, fn)}
              onUpdateSow={(fn) => updateSow(p.master_project_id, fn)}
              onSetConfirm={(fn) => setConfirm(p.master_project_id, fn)}
              onSetMeta={(fn) => setMeta(p.master_project_id, fn)}
              onUpdateAttach={(fn) => updateAttach(p.master_project_id, fn)}
              onUpdateDraft={(fn) => updateDraft(p.master_project_id, fn)}
              open={isOpen}
              onToggle={() =>
                setOpenMap((m) => ({ ...m, [p.master_project_id]: !isOpen }))
              }
            />
          );
        })}
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
  draft,
  onUpdateTor,
  onUpdateSow,
  onSetConfirm,
  onSetMeta,
  onUpdateAttach,
  onUpdateDraft,
  open,
  onToggle,
}: {
  project: ProjectRecord;
  tor: TorRef[];
  sow: string[];
  confirm: ConfirmRecord;
  meta: ProjectMeta;
  attachments: TorAttachment[];
  draft: TorDraft;
  onUpdateTor: (fn: (prev: TorRef[]) => TorRef[]) => void;
  onUpdateSow: (fn: (prev: string[]) => string[]) => void;
  onSetConfirm: (fn: (prev: ConfirmRecord) => ConfirmRecord) => void;
  onSetMeta: (fn: (prev: ProjectMeta) => ProjectMeta) => void;
  onUpdateAttach: (fn: (prev: TorAttachment[]) => TorAttachment[]) => void;
  onUpdateDraft: (fn: (prev: TorDraft) => TorDraft) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const pColor = priorityColor(meta.priority);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        confirm.confirmed && "border-emerald-500/40 bg-emerald-500/[0.02]",
      )}
    >
      {/* Header — always visible, click to expand/collapse. On narrow screens it
          wraps so the budget block drops to its own full-width line instead of
          squeezing the title/badges into a cramped left column. */}
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-start gap-x-3 gap-y-2 p-5 text-left sm:flex-nowrap"
      >
        <div className="order-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-subtle)]">
          {confirm.confirmed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <FileText className="h-5 w-5 text-[color:var(--color-muted-fg)]" />
          )}
        </div>
        <div className="order-2 min-w-0 flex-1">
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
            {draft.content.trim() && (
              <Badge
                variant="outline"
                className={cn("font-semibold", draftStatusClass(draft.status))}
              >
                <ClipboardEdit className="mr-0.5 h-2.5 w-2.5" />
                ร่าง TOR: {draftStatusLabel(draft.status)}
              </Badge>
            )}
          </div>
          <div className="mt-1 font-bold leading-snug">{project.project_name_th}</div>
          <div className="mt-1 truncate text-[13px] text-[color:var(--color-muted-fg)]">
            {project.responsible_department || "—"} · {project.work_category_layer1} · ปี{" "}
            {project.first_planned_year || "—"}
          </div>
        </div>
        <div className="order-4 w-full text-right sm:order-3 sm:w-auto sm:shrink-0">
          <div className="text-[18px] font-bold tabular-nums">
            {formatBaht(project.total_budget)}
          </div>
          <div className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">บาท · รวม</div>
          <BudgetByYear project={project} />
        </div>
        <div className="order-3 shrink-0 self-center sm:order-4">
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
            <div className="space-y-5 border-t border-[color:var(--color-border)] p-5">
              <TorDraftEditor draft={draft} onUpdate={onUpdateDraft} />
              <div className="grid gap-5 md:grid-cols-2">
                <TorRefList
                  items={tor}
                  attachments={attachments}
                  onUpdate={onUpdateTor}
                  onUpdateAttach={onUpdateAttach}
                />
                <SowList items={sow} onUpdate={onUpdateSow} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm strip — ALWAYS visible, OUTSIDE expand/collapse. When the card
          is collapsed it shrinks to a compact bar (button + note preview) so a
          long list stays scannable, but the confirm action never disappears. */}
      <ConfirmStrip confirm={confirm} onSet={onSetConfirm} open={open} />
    </Card>
  );
}

function TorDraftEditor({
  draft,
  onUpdate,
}: {
  draft: TorDraft;
  onUpdate: (fn: (prev: TorDraft) => TorDraft) => void;
}) {
  const [content, setContent] = useDebouncedSync(draft.content, (value) =>
    onUpdate((prev) => ({ ...prev, content: value, updated_at: new Date().toISOString() })),
  );
  const setStatus = (status: TorDraftStatus) =>
    onUpdate((prev) => ({ ...prev, status, updated_at: new Date().toISOString() }));
  const chars = content.trim().length;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ClipboardEdit className="h-4 w-4 text-metier-orange" />
        <h3 className="font-bold">ร่าง TOR (ของเรา)</h3>
        <div className="ml-auto flex flex-wrap justify-end gap-1">
          {DRAFT_STATUS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatus(s.value)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
                draft.status === s.value
                  ? s.cls
                  : "border-[color:var(--color-border)] text-[color:var(--color-muted)] hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="พิมพ์หรือวางเนื้อหาร่าง TOR ที่ทีมเราเขียนเอง ที่นี่ — บันทึกอัตโนมัติ และทีมเห็นเหมือนกัน"
        className="min-h-[120px] text-[13px] leading-relaxed"
      />
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-[color:var(--color-muted)]">
        <span>{chars.toLocaleString("th-TH")} ตัวอักษร · บันทึกอัตโนมัติ</span>
        {draft.updated_at && <span>แก้ล่าสุด {formatThaiTimestamp(draft.updated_at)}</span>}
      </div>
    </div>
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

  // Backfill stable ids onto legacy rows once, so each item's comment thread
  // stays attached to the right ref when an earlier ref is deleted.
  useEffect(() => {
    if (items.some((t) => !t.id)) {
      onUpdate((prev) => prev.map((t) => (t.id ? t : { ...t, id: makeId() })));
    }
  }, [items, onUpdate]);

  const add = () => {
    if (!code.trim() && !note.trim()) return;
    onUpdate((prev) => [
      ...prev,
      { id: makeId(), code: code.trim(), note: note.trim(), usable: "pending" as const },
    ]);
    setCode("");
    setNote("");
  };
  const remove = (i: number) => onUpdate((prev) => prev.filter((_, idx) => idx !== i));
  const cycleUsable = (i: number) =>
    onUpdate((prev) =>
      prev.map((t, idx) => {
        if (idx !== i) return t;
        const next: TorUsability =
          (t.usable ?? "pending") === "pending"
            ? "usable"
            : t.usable === "usable"
              ? "not_usable"
              : "pending";
        return { ...t, usable: next };
      }),
    );
  const addComment = (i: number, body: string, author: string) => {
    const b = body.trim();
    if (!b) return;
    onUpdate((prev) =>
      prev.map((t, idx) =>
        idx === i
          ? {
              ...t,
              comments: [
                ...(t.comments ?? []),
                {
                  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  author: author.trim() || "ไม่ระบุชื่อ",
                  body: b,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : t,
      ),
    );
  };
  const removeComment = (i: number, cid: string) =>
    onUpdate((prev) =>
      prev.map((t, idx) =>
        idx === i
          ? { ...t, comments: (t.comments ?? []).filter((c) => c.id !== cid) }
          : t,
      ),
    );

  // Tally usability for the header badge
  const usableCount = items.filter((t) => t.usable === "usable").length;
  const notUsableCount = items.filter((t) => t.usable === "not_usable").length;
  const pendingCount = items.length - usableCount - notUsableCount;

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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FileText className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
        <h3 className="font-bold">TOR อ้างอิง</h3>
        <Badge variant="muted" className="ml-auto">
          {items.length} ref · {attachments.length} ไฟล์
        </Badge>
        {items.length > 0 && (
          <div className="flex w-full gap-1 text-[10.5px]">
            {usableCount > 0 && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                ✓ ใช้ได้ {usableCount}
              </span>
            )}
            {pendingCount > 0 && (
              <span className="rounded-full border border-amber-500/40 bg-amber-50 px-1.5 py-0.5 text-amber-700">
                ⏳ รอตรวจ {pendingCount}
              </span>
            )}
            {notUsableCount > 0 && (
              <span className="rounded-full border border-red-500/40 bg-red-50 px-1.5 py-0.5 text-red-700">
                ✗ ใช้ไม่ได้ {notUsableCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TOR refs (text) */}
      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-4 text-center text-[12px] text-[color:var(--color-muted)]">
          ยังไม่มี TOR อ้างอิง — เพิ่มจากด้านล่าง
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((t, i) => (
            <TorRefItem
              key={t.id ?? i}
              tor={t}
              onCycleUsable={() => cycleUsable(i)}
              onRemove={() => remove(i)}
              onAddComment={(body, author) => addComment(i, body, author)}
              onRemoveComment={(cid) => removeComment(i, cid)}
            />
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
                  aria-label={`ดาวน์โหลดไฟล์ ${a.name}`}
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="invisible rounded p-1 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg group-hover:visible"
                  title="ลบไฟล์"
                  aria-label={`ลบไฟล์ ${a.name}`}
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

function TorRefItem({
  tor,
  onCycleUsable,
  onRemove,
  onAddComment,
  onRemoveComment,
}: {
  tor: TorRef;
  onCycleUsable: () => void;
  onRemove: () => void;
  onAddComment: (body: string, author: string) => void;
  onRemoveComment: (cid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useLocalStorage<string>(
    "khlongluang.commentAuthor.v1",
    "",
  );

  const u = tor.usable ?? "pending";
  const comments = tor.comments ?? [];
  const usableStyles =
    u === "usable"
      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
      : u === "not_usable"
        ? "border-red-500 bg-red-50 text-red-700"
        : "border-amber-500/50 bg-amber-50/50 text-amber-700";
  const usableLabel =
    u === "usable" ? "✓ ใช้ได้" : u === "not_usable" ? "✗ ใช้ไม่ได้" : "⏳ รอตรวจ";

  const submit = () => {
    if (!body.trim()) return;
    onAddComment(body, authorName);
    setBody("");
  };

  return (
    <li
      className={cn(
        "rounded-md border bg-white text-[13px]",
        u === "not_usable" ? "border-red-200" : "border-[color:var(--color-border)]",
      )}
    >
      <div className="group flex items-start gap-2 p-2.5">
        <div className={cn("min-w-0 flex-1", u === "not_usable" && "opacity-60")}>
          {tor.code && (
            <div className="font-mono text-[11px] text-metier-orange">{tor.code}</div>
          )}
          {tor.note && (
            <div
              className={cn(
                "mt-0.5 whitespace-pre-wrap leading-snug",
                u === "not_usable" && "line-through",
              )}
            >
              <Linkify text={tor.note} />
            </div>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[color:var(--color-muted)] hover:text-fg"
          >
            <MessageSquare className="h-3 w-3" />
            {comments.length > 0 ? `${comments.length} comment` : "เพิ่ม comment"}
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>
        <button
          onClick={onCycleUsable}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors",
            usableStyles,
          )}
          title="คลิกเพื่อเปลี่ยน: รอตรวจ → ใช้ได้ → ใช้ไม่ได้"
          aria-label={`สถานะ TOR: ${usableLabel} — คลิกเพื่อเปลี่ยนสถานะ`}
        >
          <RotateCw className="h-2.5 w-2.5 opacity-60" />
          {usableLabel}
        </button>
        <button
          onClick={onRemove}
          className="invisible shrink-0 rounded p-0.5 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-fg group-hover:visible"
          title="ลบ"
          aria-label="ลบ TOR อ้างอิงนี้"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/30 p-2.5">
              {comments.length > 0 && (
                <ul className="space-y-1.5">
                  {comments
                    .slice()
                    .reverse()
                    .map((c) => (
                      <li
                        key={c.id}
                        className="group/c rounded-md border border-[color:var(--color-border)] bg-white p-2 text-[12px]"
                      >
                        <div className="flex items-baseline justify-between gap-2 text-[10.5px] text-[color:var(--color-muted-fg)]">
                          <span className="font-bold text-fg">{c.author}</span>
                          <span className="tabular-nums">
                            {formatThaiTimestamp(c.created_at)}
                          </span>
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap leading-snug">
                          <Linkify text={c.body} />
                        </div>
                        <button
                          onClick={() => onRemoveComment(c.id)}
                          className="invisible mt-0.5 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)] hover:text-red-600 group-hover/c:visible"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> ลบ
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="ชื่อผู้คอมเมนต์"
                className="h-7 text-[11px]"
              />
              <div className="flex items-start gap-1.5">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  placeholder="comment เกี่ยวกับ TOR นี้ (⌘/Ctrl+Enter ส่ง)"
                  className="min-h-[40px] flex-1 text-[12px]"
                />
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={!body.trim()}
                  aria-label="ส่ง comment"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
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
                aria-label="ลบ SOW item นี้"
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
  open,
}: {
  confirm: ConfirmRecord;
  onSet: (fn: (prev: ConfirmRecord) => ConfirmRecord) => void;
  open: boolean;
}) {
  const [notes, setNotes] = useDebouncedSync(confirm.notes, (value) =>
    onSet((prev) => ({ ...prev, notes: value })),
  );
  const doConfirm = () =>
    onSet((prev) => ({ ...prev, confirmed: true, confirmed_at: new Date().toISOString() }));
  const undoConfirm = () =>
    onSet((prev) => ({ ...prev, confirmed: false, confirmed_at: undefined }));

  // Collapsed: a single compact row — note preview + the confirm action stay
  // visible, but the editable textarea is tucked away to keep the list short.
  if (!open) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 border-t border-[color:var(--color-border)] px-5 py-2.5 transition-colors",
          confirm.confirmed && "bg-emerald-500/[0.04]",
        )}
      >
        <div className="min-w-0 flex-1 text-[12px] text-[color:var(--color-muted-fg)]">
          {notes.trim() ? (
            <span className="line-clamp-1">
              <span className="font-medium text-[color:var(--color-muted)]">หมายเหตุ: </span>
              {notes}
            </span>
          ) : (
            <span className="text-[color:var(--color-muted)]">ยังไม่มีหมายเหตุ — กางการ์ดเพื่อเพิ่ม</span>
          )}
        </div>
        {confirm.confirmed ? (
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="success">
              ยืนยันแล้ว · {formatThaiDateOnly(confirm.confirmed_at)}
            </Badge>
            <Button variant="outline" size="sm" onClick={undoConfirm}>
              <X className="h-3.5 w-3.5" /> ยกเลิก
            </Button>
          </div>
        ) : (
          <Button size="sm" className="shrink-0" onClick={doConfirm}>
            <CheckCircle2 className="h-4 w-4" /> เทศบาลยืนยัน
          </Button>
        )}
      </div>
    );
  }

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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="เช่น 'ตกลงในหลักการ ขอเพิ่ม training 2 รอบ' / 'รอเอกสารยืนยันงบ'"
            className="min-h-[60px]"
          />
        </div>
        <div className="flex flex-col items-stretch justify-end gap-2 md:w-[200px]">
          {confirm.confirmed ? (
            <>
              <Button variant="outline" size="lg" onClick={undoConfirm}>
                <X className="h-4 w-4" /> ยกเลิกยืนยัน
              </Button>
              <div className="text-center text-[11px] text-[color:var(--color-muted)]">
                ยืนยันเมื่อ {formatThaiDateOnly(confirm.confirmed_at)}
              </div>
            </>
          ) : (
            <Button size="lg" onClick={doConfirm}>
              <CheckCircle2 className="h-4 w-4" /> เทศบาลยืนยัน
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact 2568 / 2569 / 2570 budget split shown under the total in each
 * project card header. Years with 0 budget are dimmed to keep the focus on
 * where the money actually lands.
 */
function BudgetByYear({ project }: { project: ProjectRecord }) {
  const years: Array<[number, number]> = [
    [2568, Number(project.budget_2568) || 0],
    [2569, Number(project.budget_2569) || 0],
    [2570, Number(project.budget_2570) || 0],
  ];
  return (
    <div className="mt-2 flex justify-end gap-1.5 text-[10.5px] tabular-nums">
      {years.map(([y, v]) => (
        <div
          key={y}
          className={cn(
            "rounded px-1.5 py-0.5",
            v > 0
              ? "bg-[color:var(--color-subtle)] text-fg"
              : "text-[color:var(--color-muted)]",
          )}
          title={`พ.ศ. ${y}: ${formatBaht(v)} บาท`}
        >
          <span className="opacity-60">{y}</span>{" "}
          <span className="font-semibold">{v > 0 ? formatBahtCompact(v) : "—"}</span>
        </div>
      ))}
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
      formatIctIsoDate(c?.confirmed_at),
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
  const today = formatIctIsoDate(new Date().toISOString());
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

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// Render free text but turn http(s) URLs (e.g. pasted Google Drive / SharePoint
// links to a TOR draft) into clickable links that open in a new tab.
const URL_SPLIT_RE = /(https?:\/\/[^\s]+)/g;
const IS_URL_RE = /^https?:\/\//;
function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_SPLIT_RE).map((part, i) =>
        IS_URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 break-all text-metier-orange underline decoration-metier-orange/40 underline-offset-2 hover:decoration-metier-orange"
          >
            {part}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
