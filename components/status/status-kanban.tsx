"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  GripVertical,
  History,
  MessageSquare,
  Send,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import { useSyncedState } from "@/lib/shared-state";
import {
  LEGACY_STATUS_MAP,
  PROJECT_STATUSES,
  STATUS_COLUMNS,
  type ProjectStatus,
  type StatusColumn,
} from "@/types/db";
import type { ProjectRecord } from "@/types/db";
import {
  DEFAULT_DURATIONS,
  STATE_COLOR,
  STATE_LABEL,
  formatThaiDate,
  scheduleFor,
  type PhaseDurations,
  type ScheduleInfo,
} from "@/lib/data/schedule";
import {
  priorityColor,
  priorityLabel,
  type ProjectMeta,
} from "@/components/selected/selected-explorer";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";
const META_KEY = "khlongluang.projectMeta.v1";
const STATUS_KEY = "khlongluang.statuses.v1";
const DURATIONS_KEY = "khlongluang.phaseDurations.v1";
const COMMENTS_KEY = "khlongluang.statusComments.v1";
const WORKFLOW_KEY = "khlongluang.workflowState.v1";

// Per-project working sub-status (independent of the column position) so the
// team can mark things as "blocked" / "on hold" / "ready" while they sit
// in the same Kanban stage.
export type WorkflowState = "active" | "on_hold" | "blocked" | "ready";

const WORKFLOW_OPTIONS: Array<{
  value: WorkflowState;
  label: string;
  short: string;
  color: string;
  icon: string;
}> = [
  { value: "active", label: "กำลังทำ", short: "ทำ", color: "#0ea5e9", icon: "▶" },
  { value: "on_hold", label: "หยุดชั่วคราว", short: "พัก", color: "#94a3b8", icon: "⏸" },
  { value: "blocked", label: "ติดปัญหา", short: "ติด", color: "#dc2626", icon: "⚠" },
  { value: "ready", label: "พร้อมส่งต่อ", short: "พร้อม", color: "#10b981", icon: "✓" },
];

function workflowMeta(w: WorkflowState | undefined) {
  return WORKFLOW_OPTIONS.find((o) => o.value === w) ?? WORKFLOW_OPTIONS[0];
}

type ConfirmRecord = { confirmed: boolean; notes: string; confirmed_at?: string };

type StatusEntry = {
  status: ProjectStatus;
  changed_at: string;
};
type StatusBoard = Record<string, StatusEntry[]>;

type Comment = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};
type CommentMap = Record<string, Comment[]>;

const COLUMN_COLORS: Record<ProjectStatus, string> = {
  "ร่าง TOR": "#64748b",
  "ตรวจ TOR": "#0891b2",
  "แก้ TOR": "#0ea5e9",
  "รอเปิดโครงการ": "#7c3aed",
  "โครงการเปิด": "#a855f7",
  "ยื่นโครงการ": "#f59e0b",
  "รอประกาศผล": "#fbbf24",
  "ดำเนินงาน": "#ff5008",
  "ส่งมอบเสร็จสิ้น": "#10b981",
};

// Promote any pre-rework status values (5-state schema) to the new 9-state
// schema so existing user data keeps working.
function migrateStatus(s: string): ProjectStatus {
  if (PROJECT_STATUSES.includes(s as ProjectStatus)) return s as ProjectStatus;
  return LEGACY_STATUS_MAP[s] ?? "ร่าง TOR";
}

export function StatusKanban({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated1] = useSyncedState<string[]>(SELECTED_KEY, []);
  const [confirmMap, , hydrated2] = useSyncedState<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );
  const [board, setBoard, hydrated3] = useSyncedState<StatusBoard>(STATUS_KEY, {});
  const [metaMap] = useSyncedState<Record<string, ProjectMeta>>(META_KEY, {});
  // Phase durations are a per-user view setting, not a team decision —
  // keep them local so they don't override each other's preferences.
  const [durations, setDurations] = useLocalStorage<PhaseDurations>(
    DURATIONS_KEY,
    DEFAULT_DURATIONS,
  );
  const [comments, setComments] = useSyncedState<CommentMap>(COMMENTS_KEY, {});
  const [workflowMap, setWorkflowMap] = useSyncedState<Record<string, WorkflowState>>(
    WORKFLOW_KEY,
    {},
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const hydrated = hydrated1 && hydrated2 && hydrated3;

  const confirmedItems = useMemo(() => {
    const set = new Set(selectedIds);
    return projects.filter(
      (p) => set.has(p.master_project_id) && confirmMap[p.master_project_id]?.confirmed,
    );
  }, [projects, selectedIds, confirmMap]);

  const currentStatus = (pid: string): ProjectStatus => {
    const history = board[pid] ?? [];
    if (!history.length) return "ร่าง TOR";
    return migrateStatus(history[history.length - 1].status);
  };

  const moveTo = (pid: string, status: ProjectStatus) => {
    setBoard((prev) => {
      const history = prev[pid] ?? [];
      const last = history[history.length - 1];
      if (last?.status === status) return prev;
      return {
        ...prev,
        [pid]: [...history, { status, changed_at: new Date().toISOString() }],
      };
    });
  };

  // Compute schedule per project (today is real-time).
  const today = useMemo(() => new Date(), []);
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleInfo>();
    for (const p of confirmedItems) {
      const meta = metaMap[p.master_project_id];
      map.set(
        p.master_project_id,
        scheduleFor(meta?.start_q, currentStatus(p.master_project_id), durations, today),
      );
    }
    return map;
  }, [confirmedItems, metaMap, durations, board, today]);

  const columns = useMemo(() => {
    const buckets = Object.fromEntries(
      PROJECT_STATUSES.map((s) => [s, [] as ProjectRecord[]]),
    ) as Record<ProjectStatus, ProjectRecord[]>;
    for (const p of confirmedItems) {
      buckets[currentStatus(p.master_project_id)].push(p);
    }
    return buckets;
  }, [confirmedItems, board]);

  const totals = useMemo(() => {
    const t = confirmedItems.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    let lateCount = 0;
    let dueSoonCount = 0;
    for (const s of scheduleMap.values()) {
      if (s.state === "late") lateCount += 1;
      else if (s.state === "due_soon") dueSoonCount += 1;
    }
    return {
      count: confirmedItems.length,
      total: t,
      lateCount,
      dueSoonCount,
      doneCount: columns["ส่งมอบเสร็จสิ้น"].length,
    };
  }, [confirmedItems, scheduleMap, columns]);

  const addComment = (pid: string, body: string, author: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setComments((prev) => ({
      ...prev,
      [pid]: [
        ...(prev[pid] ?? []),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          author: author.trim() || "ไม่ระบุชื่อ",
          body: trimmed,
          created_at: new Date().toISOString(),
        },
      ],
    }));
  };
  const removeComment = (pid: string, cid: string) => {
    setComments((prev) => ({
      ...prev,
      [pid]: (prev[pid] ?? []).filter((c) => c.id !== cid),
    }));
  };

  const activeProject = activeProjectId
    ? confirmedItems.find((p) => p.master_project_id === activeProjectId) ?? null
    : null;

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-[color:var(--color-muted)]">
        กำลังโหลด...
      </div>
    );
  }

  if (confirmedItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-12 text-center">
        <History className="mx-auto mb-3 h-10 w-10 text-[color:var(--color-muted)]" />
        <CardTitle>ยังไม่มีโครงการที่ confirmed</CardTitle>
        <CardDescription className="mx-auto mt-2 max-w-md">
          ไปที่{" "}
          <a href="/selected" className="font-medium text-metier-orange underline">
            หน้า 6 · TOR + SOW
          </a>{" "}
          แล้วกดปุ่ม <Badge variant="success" className="mx-1">เทศบาลยืนยัน</Badge>{" "}
          ที่โครงการที่ตกลงรับ — โครงการนั้นจะปรากฏใน Kanban นี้
        </CardDescription>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Confirmed"
          value={totals.count.toLocaleString("th-TH")}
          unit="โครงการ"
          accent
        />
        <KpiCard
          label="งบประมาณรวม"
          value={formatBahtCompact(totals.total)}
          unit="บาท"
          hint={formatBaht(totals.total) + " บาท"}
        />
        <KpiCard
          label="ล่าช้า · ต้องตามด่วน"
          value={totals.lateCount.toLocaleString("th-TH")}
          unit="โครงการ"
          hint={
            totals.dueSoonCount > 0
              ? `+ ${totals.dueSoonCount} ใกล้ครบกำหนด`
              : "ตามแผนทั้งหมด"
          }
        />
        <KpiCard
          label="เสร็จสิ้น"
          value={totals.doneCount.toLocaleString("th-TH")}
          unit={`/ ${totals.count}`}
        />
      </div>

      {/* Settings + late warning */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border)] bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-[13px]">
          <CalendarClock className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
          <span className="text-[color:var(--color-muted-fg)]">
            สถานะคำนวณจาก <strong className="text-fg">Start Q</strong> (หน้า 6) +
          </span>
          <span className="font-mono text-[11px] text-fg">
            ร่าง {durations["ร่าง TOR"]}d · ตรวจ {durations["ตรวจ TOR"]}d · แก้{" "}
            {durations["แก้ TOR"]}d · รอเปิด {durations["รอเปิดโครงการ"]}d · เปิด{" "}
            {durations["โครงการเปิด"]}d · ยื่น {durations["ยื่นโครงการ"]}d · รอประกาศ{" "}
            {durations["รอประกาศผล"]}d · ดำเนิน {durations["ดำเนินงาน"]}d
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totals.lateCount > 0 && (
            <Badge variant="outline" className="border-red-500 text-red-600">
              <AlertTriangle className="mr-1 h-3 w-3" />
              {totals.lateCount} โครงการล่าช้า
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen((x) => !x)}>
            <Settings className="h-3.5 w-3.5" />
            ตั้งระยะเวลา phase
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <SettingsPanel
              durations={durations}
              onChange={setDurations}
              onReset={() => setDurations(DEFAULT_DURATIONS)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board — 6 columns; some columns stack 2 sub-states (top/bottom) */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {STATUS_COLUMNS.map((col) => (
          <ColumnGroup
            key={col.label}
            column={col}
            columns={columns}
            currentStatus={currentStatus}
            scheduleMap={scheduleMap}
            metaMap={metaMap}
            workflowMap={workflowMap}
            commentsCount={(pid) => (comments[pid] ?? []).length}
            onMove={moveTo}
            onOpenDetail={setActiveProjectId}
          />
        ))}
      </div>

      <div className="text-[12px] text-[color:var(--color-muted)]">
        💡 ลาก-วาง การ์ดข้าม column เพื่อเปลี่ยนสถานะ · กดเข้าการ์ดเพื่อดู detail + comment
      </div>

      {/* Detail drawer */}
      <Dialog.Root
        open={!!activeProject}
        onOpenChange={(o) => !o && setActiveProjectId(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
          <Dialog.Content className="fixed right-0 top-0 z-50 h-full w-full max-w-[520px] overflow-y-auto bg-white shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right">
            {activeProject && (
              <DetailDrawer
                project={activeProject}
                schedule={scheduleMap.get(activeProject.master_project_id)!}
                history={board[activeProject.master_project_id] ?? []}
                comments={comments[activeProject.master_project_id] ?? []}
                meta={metaMap[activeProject.master_project_id]}
                confirm={confirmMap[activeProject.master_project_id]}
                workflow={workflowMap[activeProject.master_project_id] ?? "active"}
                currentStatus={currentStatus(activeProject.master_project_id)}
                onSelectStatus={(s) => moveTo(activeProject.master_project_id, s)}
                onSetWorkflow={(w) =>
                  setWorkflowMap((prev) => ({
                    ...prev,
                    [activeProject.master_project_id]: w,
                  }))
                }
                onAddComment={(body, author) =>
                  addComment(activeProject.master_project_id, body, author)
                }
                onRemoveComment={(cid) =>
                  removeComment(activeProject.master_project_id, cid)
                }
                onClose={() => setActiveProjectId(null)}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SettingsPanel({
  durations,
  onChange,
  onReset,
}: {
  durations: PhaseDurations;
  onChange: (d: PhaseDurations) => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <CardTitle className="text-[15px]">ระยะเวลาแต่ละ phase (วัน)</CardTitle>
            <CardDescription>
              ใช้คำนวณว่าโครงการ "ควรอยู่ phase ไหนตอนนี้" — ปรับให้เหมาะกับงานจริง
            </CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={onReset}>
            คืนค่าเริ่มต้น
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(DEFAULT_DURATIONS) as Array<keyof PhaseDurations>).map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <span className="text-[11px] text-[color:var(--color-muted)]">{k}</span>
              <Input
                type="number"
                value={durations[k]}
                min={1}
                onChange={(e) =>
                  onChange({ ...durations, [k]: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ColumnGroup({
  column,
  columns,
  currentStatus,
  scheduleMap,
  metaMap,
  workflowMap,
  commentsCount,
  onMove,
  onOpenDetail,
}: {
  column: StatusColumn;
  columns: Record<ProjectStatus, ProjectRecord[]>;
  currentStatus: (pid: string) => ProjectStatus;
  scheduleMap: Map<string, ScheduleInfo>;
  metaMap: Record<string, ProjectMeta>;
  workflowMap: Record<string, WorkflowState>;
  commentsCount: (pid: string) => number;
  onMove: (pid: string, s: ProjectStatus) => void;
  onOpenDetail: (pid: string) => void;
}) {
  const total = column.statuses.reduce(
    (n, s) => n + (columns[s]?.length ?? 0),
    0,
  );
  const headerColor = COLUMN_COLORS[column.statuses[0]];
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white">
      <div
        className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-3 py-2"
        style={{ background: `${headerColor}10` }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: headerColor }} />
          <span className="text-[13px] font-bold">{column.label}</span>
        </div>
        <Badge variant="muted">{total}</Badge>
      </div>
      <div className="flex flex-1 flex-col divide-y divide-[color:var(--color-border)]">
        {column.statuses.map((status, idx) => (
          <SubColumn
            key={status}
            status={status}
            color={COLUMN_COLORS[status]}
            items={columns[status] ?? []}
            position={
              column.statuses.length === 1
                ? "only"
                : idx === 0
                  ? "top"
                  : "bottom"
            }
            currentStatus={currentStatus}
            scheduleMap={scheduleMap}
            metaMap={metaMap}
            workflowMap={workflowMap}
            commentsCount={commentsCount}
            onMove={onMove}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}

function SubColumn({
  status,
  color,
  items,
  position,
  currentStatus,
  scheduleMap,
  metaMap,
  workflowMap,
  commentsCount,
  onMove,
  onOpenDetail,
}: {
  status: ProjectStatus;
  color: string;
  items: ProjectRecord[];
  position: "only" | "top" | "bottom";
  currentStatus: (pid: string) => ProjectStatus;
  scheduleMap: Map<string, ScheduleInfo>;
  metaMap: Record<string, ProjectMeta>;
  workflowMap: Record<string, WorkflowState>;
  commentsCount: (pid: string) => number;
  onMove: (pid: string, s: ProjectStatus) => void;
  onOpenDetail: (pid: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const pid = e.dataTransfer.getData("text/plain");
        if (pid) onMove(pid, status);
      }}
      className={cn(
        "flex flex-1 flex-col transition-colors",
        over && "bg-metier-orange/[0.06] ring-1 ring-inset ring-metier-orange/30",
      )}
    >
      {position !== "only" && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-[11px] font-semibold" style={{ color }}>
              {position === "top" ? "▲ " : "▼ "}
              {status}
            </span>
          </div>
          <span className="text-[10px] tabular-nums text-[color:var(--color-muted)]">
            {items.length}
          </span>
        </div>
      )}
      <div
        className={cn(
          "flex-1 space-y-2 p-2",
          position === "only" && "min-h-[120px]",
          position !== "only" && "min-h-[80px]",
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((p) => (
            <motion.div
              key={p.master_project_id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <KanbanCard
                project={p}
                schedule={scheduleMap.get(p.master_project_id)!}
                meta={metaMap[p.master_project_id]}
                workflow={workflowMap[p.master_project_id] ?? "active"}
                commentsN={commentsCount(p.master_project_id)}
                color={color}
                onOpenDetail={() => onOpenDetail(p.master_project_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="flex h-full min-h-[60px] items-center justify-center rounded-md border border-dashed border-[color:var(--color-border)] text-[11px] text-[color:var(--color-muted)]">
            ว่าง
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  project,
  schedule,
  meta,
  workflow,
  commentsN,
  color,
  onOpenDetail,
}: {
  project: ProjectRecord;
  schedule: ScheduleInfo;
  meta?: ProjectMeta;
  workflow: WorkflowState;
  commentsN: number;
  color: string;
  onOpenDetail: () => void;
}) {
  const stateColor = STATE_COLOR[schedule.state];
  const pColor = meta?.priority ? priorityColor(meta.priority) : null;
  const wf = workflowMeta(workflow);
  // Schedule glyph instead of long pill — keeps the card slim. Tooltip
  // shows the full STATE_LABEL on hover.
  const stateGlyph =
    schedule.state === "late"
      ? "⚠"
      : schedule.state === "due_soon"
        ? "⏰"
        : schedule.state === "ahead"
          ? "↑"
          : schedule.state === "done"
            ? "✓"
            : schedule.state === "on_track"
              ? "●"
              : "·";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.master_project_id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group rounded-md border bg-white p-2.5 hover:border-metier-orange/40"
      style={{
        borderLeft: `3px solid ${stateColor}`,
        borderColor: "var(--color-border)",
        borderLeftColor: stateColor,
      }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-[color:var(--color-muted)] group-hover:text-fg" />
        <button onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
          {/* Header row: workflow chip + state glyph + budget */}
          <div className="mb-1 flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-semibold"
              style={{ borderColor: wf.color, color: wf.color }}
              title={`สถานะการทำงาน: ${wf.label}`}
            >
              {wf.icon} {wf.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className="text-[11px] font-bold"
                style={{ color: stateColor }}
                title={STATE_LABEL[schedule.state]}
              >
                {stateGlyph}
              </span>
              <span className="text-[12px] font-bold tabular-nums">
                {formatBahtCompact(project.total_budget || 0)}
              </span>
            </div>
          </div>
          {/* Name */}
          <div className="line-clamp-2 text-[13px] font-medium leading-snug hover:text-metier-orange">
            {project.project_name_th}
          </div>
          {/* Footer: dept + priority + comments */}
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-[color:var(--color-muted)]">
              {project.responsible_department || "—"}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {meta?.priority && (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: pColor! }}
                  title={`Priority: ${priorityLabel(meta.priority)}`}
                >
                  {meta.priority === "urgent" && "🔥"}
                  {meta.priority === "high" && "↑"}
                  {meta.priority === "medium" && "—"}
                  {meta.priority === "low" && "↓"}
                </span>
              )}
              {commentsN > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] text-[color:var(--color-muted)]"
                  title={`${commentsN} comments`}
                >
                  <MessageSquare className="h-2.5 w-2.5" />
                  {commentsN}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function DetailDrawer({
  project,
  schedule,
  history,
  comments,
  meta,
  confirm,
  workflow,
  currentStatus,
  onSelectStatus,
  onSetWorkflow,
  onAddComment,
  onRemoveComment,
  onClose,
}: {
  project: ProjectRecord;
  schedule: ScheduleInfo;
  history: StatusEntry[];
  comments: Comment[];
  meta?: ProjectMeta;
  confirm?: ConfirmRecord;
  workflow: WorkflowState;
  currentStatus: ProjectStatus;
  onSelectStatus: (s: ProjectStatus) => void;
  onSetWorkflow: (w: WorkflowState) => void;
  onAddComment: (body: string, author: string) => void;
  onRemoveComment: (cid: string) => void;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useLocalStorage<string>(
    "khlongluang.commentAuthor.v1",
    "",
  );

  const stateColor = STATE_COLOR[schedule.state];

  const submit = () => {
    if (!body.trim()) return;
    onAddComment(body, authorName);
    setBody("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[color:var(--color-border)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Dialog.Title className="font-mono text-[11px] text-[color:var(--color-muted)]">
              {project.master_project_id}
            </Dialog.Title>
            <h2 className="mt-1 text-[18px] font-bold leading-snug">
              {project.project_name_th}
            </h2>
            <div className="mt-1 text-[12px] text-[color:var(--color-muted-fg)]">
              {project.responsible_department || "—"} · {project.work_category_layer1}
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              className="rounded-md p-1 hover:bg-[color:var(--color-subtle)]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
          <Badge
            variant="outline"
            style={{ borderColor: stateColor, color: stateColor, fontWeight: 600 }}
          >
            {STATE_LABEL[schedule.state]}
          </Badge>
          {meta?.priority && (
            <Badge
              variant="outline"
              style={{
                borderColor: priorityColor(meta.priority),
                color: priorityColor(meta.priority),
                fontWeight: 600,
              }}
            >
              {priorityLabel(meta.priority)}
            </Badge>
          )}
          {confirm?.confirmed && <Badge variant="success">ยืนยันแล้ว</Badge>}
        </div>
      </div>

      {/* Schedule details */}
      <div className="space-y-3 border-b border-[color:var(--color-border)] p-5">
        <YearBudgetBreakdown project={project} />
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <Info label="งบประมาณรวม" value={formatBaht(project.total_budget) + " บาท"} />
          <Info label="ตั้งใจเริ่ม" value={meta?.start_q ? meta.start_q.replace("-", " ") : "—"} />
          <Info label="วันเริ่มจริง (calc)" value={formatThaiDate(schedule.startDate)} />
          <Info
            label="วันที่ผ่านไป"
            value={
              schedule.startDate
                ? schedule.daysSinceStart >= 0
                  ? `${schedule.daysSinceStart} วัน`
                  : `อีก ${-schedule.daysSinceStart} วัน`
                : "—"
            }
          />
          <Info label="คาดว่าควรอยู่ phase" value={schedule.expectedStatus} />
          <Info label="phase ปัจจุบัน" value={currentStatus} />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] text-[color:var(--color-muted)]">
            เลื่อน phase
          </div>
          <div className="flex flex-wrap gap-1">
            {PROJECT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onSelectStatus(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  s === currentStatus
                    ? "border-metier-orange bg-metier-orange text-white"
                    : "border-[color:var(--color-border)] text-[color:var(--color-muted-fg)] hover:text-fg",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Workflow sub-status */}
        <div>
          <div className="mb-1.5 text-[11px] text-[color:var(--color-muted)]">
            สถานะการทำงาน (ใน phase นี้)
          </div>
          <div className="flex flex-wrap gap-1">
            {WORKFLOW_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => onSetWorkflow(o.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  workflow === o.value
                    ? "text-white"
                    : "text-[color:var(--color-muted-fg)] hover:text-fg",
                )}
                style={
                  workflow === o.value
                    ? { background: o.color, borderColor: o.color }
                    : { borderColor: o.color, color: o.color }
                }
              >
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="border-b border-[color:var(--color-border)] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[color:var(--color-muted-fg)]" />
            <h3 className="text-[14px] font-bold">ประวัติการเปลี่ยน phase</h3>
            <Badge variant="muted" className="ml-auto">
              {history.length}
            </Badge>
          </div>
          <ol className="space-y-1.5 text-[12px]">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40 px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: COLUMN_COLORS[h.status] }}
                  />
                  <span className="font-medium">{h.status}</span>
                </div>
                <span className="text-[11px] text-[color:var(--color-muted)] tabular-nums">
                  {h.changed_at.slice(0, 10)} {h.changed_at.slice(11, 16)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Comments */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-[color:var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
            <h3 className="text-[14px] font-bold">Comments / Remark</h3>
            <Badge variant="muted" className="ml-auto">
              {comments.length}
            </Badge>
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-5">
          {comments.length === 0 ? (
            <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-6 text-center text-[12px] text-[color:var(--color-muted)]">
              ยังไม่มี comment — เพิ่มอันแรกด้านล่าง
            </div>
          ) : (
            comments
              .slice()
              .reverse()
              .map((c) => (
                <div
                  key={c.id}
                  className="group rounded-md border border-[color:var(--color-border)] bg-white p-3"
                >
                  <div className="flex items-baseline justify-between gap-2 text-[11px] text-[color:var(--color-muted-fg)]">
                    <span className="font-bold text-fg">{c.author}</span>
                    <span className="tabular-nums">
                      {c.created_at.slice(0, 10)} {c.created_at.slice(11, 16)}
                    </span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-[13px] leading-snug">
                    {c.body}
                  </div>
                  <button
                    onClick={() => onRemoveComment(c.id)}
                    className="invisible mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)] hover:text-red-600 group-hover:visible"
                  >
                    <Trash2 className="h-3 w-3" />
                    ลบ
                  </button>
                </div>
              ))
          )}
        </div>

        {/* Compose */}
        <div className="space-y-2 border-t border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40 p-3">
          <Input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="ชื่อผู้คอมเมนต์ (เก็บไว้ใน browser)"
            className="text-[12px]"
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="เขียน comment / remark (กด ⌘/Ctrl + Enter ส่ง)"
            className="min-h-[64px] text-[13px]"
          />
          <Button size="sm" onClick={submit} className="w-full" disabled={!body.trim()}>
            <Send className="h-3.5 w-3.5" /> ส่ง comment
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny per-year budget pills shown under each Kanban card. Years with no
 * budget render dim so the eye lands on where money actually sits.
 */
function YearStripCompact({ project }: { project: ProjectRecord }) {
  const ys: Array<[number, number]> = [
    [2568, Number(project.budget_2568) || 0],
    [2569, Number(project.budget_2569) || 0],
    [2570, Number(project.budget_2570) || 0],
  ];
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-1 text-[9.5px] tabular-nums">
      {ys.map(([y, v]) => (
        <div
          key={y}
          className={cn(
            "rounded px-1 py-0.5 text-center",
            v > 0
              ? "bg-[color:var(--color-subtle)] text-fg"
              : "text-[color:var(--color-muted)]",
          )}
          title={`พ.ศ. ${y}: ${formatBaht(v)} บาท`}
        >
          <span className="opacity-60">{String(y).slice(-2)}</span>{" "}
          <span className="font-semibold">{v > 0 ? formatBahtCompact(v) : "—"}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Larger per-year budget block used inside the detail drawer. Visualises
 * how the total budget is allocated across the 3 plan years.
 */
function YearBudgetBreakdown({ project }: { project: ProjectRecord }) {
  const ys: Array<[number, number]> = [
    [2568, Number(project.budget_2568) || 0],
    [2569, Number(project.budget_2569) || 0],
    [2570, Number(project.budget_2570) || 0],
  ];
  const total = ys.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="rounded-md border border-[color:var(--color-border)] bg-white p-3">
      <div className="mb-2 text-[11px] font-medium text-[color:var(--color-muted-fg)]">
        งบประมาณตามปี
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ys.map(([y, v]) => {
          const pct = total ? (v / total) * 100 : 0;
          return (
            <div key={y}>
              <div className="text-[10px] text-[color:var(--color-muted)]">พ.ศ. {y}</div>
              <div
                className={cn(
                  "mt-0.5 text-[15px] font-bold tabular-nums leading-tight",
                  v > 0 ? "text-fg" : "text-[color:var(--color-muted)]",
                )}
              >
                {v > 0 ? formatBahtCompact(v) : "—"}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                <div
                  className="h-full rounded-full bg-metier-orange/80"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-0.5 text-[9.5px] tabular-nums text-[color:var(--color-muted)]">
                {pct.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[color:var(--color-subtle)]/40 px-2.5 py-1.5">
      <div className="text-[10px] text-[color:var(--color-muted)]">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium leading-tight">{value}</div>
    </div>
  );
}

function short(s: ProjectStatus): string {
  switch (s) {
    case "ร่าง TOR":
      return "ร่าง";
    case "ตรวจ TOR":
      return "ตรวจ";
    case "แก้ TOR":
      return "แก้";
    case "รอเปิดโครงการ":
      return "รอเปิด";
    case "โครงการเปิด":
      return "เปิด";
    case "ยื่นโครงการ":
      return "ยื่น";
    case "รอประกาศผล":
      return "รอผล";
    case "ดำเนินงาน":
      return "ดำเนิน";
    case "ส่งมอบเสร็จสิ้น":
      return "เสร็จ";
  }
}
