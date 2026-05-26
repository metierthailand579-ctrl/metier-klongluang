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
import { PROJECT_STATUSES, type ProjectStatus } from "@/types/db";
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
  "เปิดโครงการ": "#0ea5e9",
  "ยื่นโครงการ": "#f59e0b",
  "กำลังดำเนินงาน": "#ff5008",
  "เสร็จสิ้น": "#10b981",
};

export function StatusKanban({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated1] = useLocalStorage<string[]>(SELECTED_KEY, []);
  const [confirmMap, , hydrated2] = useLocalStorage<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );
  const [board, setBoard, hydrated3] = useLocalStorage<StatusBoard>(STATUS_KEY, {});
  const [metaMap] = useLocalStorage<Record<string, ProjectMeta>>(META_KEY, {});
  const [durations, setDurations] = useLocalStorage<PhaseDurations>(
    DURATIONS_KEY,
    DEFAULT_DURATIONS,
  );
  const [comments, setComments] = useLocalStorage<CommentMap>(COMMENTS_KEY, {});
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
    return history.length ? history[history.length - 1].status : "ร่าง TOR";
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
    const buckets: Record<ProjectStatus, ProjectRecord[]> = {
      "ร่าง TOR": [],
      "เปิดโครงการ": [],
      "ยื่นโครงการ": [],
      "กำลังดำเนินงาน": [],
      "เสร็จสิ้น": [],
    };
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
      doneCount: columns["เสร็จสิ้น"].length,
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
          <span className="font-mono text-[12px] text-fg">
            ร่าง {durations["ร่าง TOR"]}d · เปิด {durations["เปิดโครงการ"]}d · ยื่น{" "}
            {durations["ยื่นโครงการ"]}d · ดำเนิน {durations["กำลังดำเนินงาน"]}d
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

      {/* Board */}
      <div className="grid gap-3 lg:grid-cols-5">
        {PROJECT_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            color={COLUMN_COLORS[status]}
            items={columns[status]}
            currentStatus={currentStatus}
            scheduleMap={scheduleMap}
            metaMap={metaMap}
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
                currentStatus={currentStatus(activeProject.master_project_id)}
                onSelectStatus={(s) => moveTo(activeProject.master_project_id, s)}
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

function Column({
  status,
  color,
  items,
  currentStatus,
  scheduleMap,
  metaMap,
  commentsCount,
  onMove,
  onOpenDetail,
}: {
  status: ProjectStatus;
  color: string;
  items: ProjectRecord[];
  currentStatus: (pid: string) => ProjectStatus;
  scheduleMap: Map<string, ScheduleInfo>;
  metaMap: Record<string, ProjectMeta>;
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
        "flex flex-col rounded-xl border bg-white transition-colors",
        over
          ? "border-metier-orange ring-2 ring-metier-orange/20"
          : "border-[color:var(--color-border)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="text-[14px] font-medium">{status}</span>
        </div>
        <Badge variant="muted">{items.length}</Badge>
      </div>
      <div className="min-h-[120px] flex-1 space-y-2 p-2">
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
                commentsN={commentsCount(p.master_project_id)}
                color={color}
                onSelectStatus={(s) => onMove(p.master_project_id, s)}
                currentStatus={currentStatus(p.master_project_id)}
                onOpenDetail={() => onOpenDetail(p.master_project_id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <div className="flex h-full min-h-[80px] items-center justify-center rounded-md border border-dashed border-[color:var(--color-border)] text-[12px] text-[color:var(--color-muted)]">
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
  commentsN,
  color,
  onSelectStatus,
  currentStatus,
  onOpenDetail,
}: {
  project: ProjectRecord;
  schedule: ScheduleInfo;
  meta?: ProjectMeta;
  commentsN: number;
  color: string;
  onSelectStatus: (s: ProjectStatus) => void;
  currentStatus: ProjectStatus;
  onOpenDetail: () => void;
}) {
  const stateColor = STATE_COLOR[schedule.state];
  const pColor = meta?.priority ? priorityColor(meta.priority) : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.master_project_id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group rounded-md border bg-white p-2.5 hover:border-metier-orange/40"
      style={{ borderLeft: `3px solid ${stateColor}`, borderColor: "var(--color-border)", borderLeftColor: stateColor }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-[color:var(--color-muted)] group-hover:text-fg" />
        <button onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
          <div className="font-mono text-[10px] text-[color:var(--color-muted)]">
            {project.master_project_id}
          </div>
          <div className="mt-0.5 line-clamp-3 text-[13px] font-medium leading-snug hover:text-metier-orange">
            {project.project_name_th}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-[color:var(--color-muted)]">
              {project.responsible_department || "—"}
            </span>
            <span className="shrink-0 text-[12px] font-bold tabular-nums">
              {formatBahtCompact(project.total_budget || 0)}
            </span>
          </div>
        </button>
      </div>

      {/* Urgency / schedule pill */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Badge
          variant="outline"
          className="text-[10px] font-semibold"
          style={{ borderColor: stateColor, color: stateColor }}
        >
          {schedule.state === "late" && `⚠ ${STATE_LABEL.late}`}
          {schedule.state === "due_soon" && `⏰ ${STATE_LABEL.due_soon}`}
          {schedule.state === "on_track" && `✓ ${STATE_LABEL.on_track}`}
          {schedule.state === "ahead" && `↑ ${STATE_LABEL.ahead}`}
          {schedule.state === "not_started" && `· ${STATE_LABEL.not_started}`}
          {schedule.state === "done" && `✓ ${STATE_LABEL.done}`}
        </Badge>
        {meta?.priority && (
          <Badge
            variant="outline"
            className="px-1 py-0 text-[9.5px] font-semibold"
            style={{ borderColor: pColor!, color: pColor! }}
          >
            {priorityLabel(meta.priority)}
          </Badge>
        )}
        {commentsN > 0 && (
          <Badge variant="muted" className="px-1 py-0 text-[9.5px]">
            <MessageSquare className="mr-0.5 h-2.5 w-2.5" />
            {commentsN}
          </Badge>
        )}
      </div>

      {/* Quick status pills */}
      <div className="mt-2 flex flex-wrap gap-1">
        {PROJECT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              onSelectStatus(s);
            }}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] transition-colors",
              s === currentStatus
                ? "text-white"
                : "bg-[color:var(--color-subtle)] text-[color:var(--color-muted-fg)] hover:bg-[color:var(--color-subtle)]/80",
            )}
            style={s === currentStatus ? { background: color } : undefined}
            title={`เลื่อนไป "${s}"`}
          >
            {short(s)}
          </button>
        ))}
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
  currentStatus,
  onSelectStatus,
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
  currentStatus: ProjectStatus;
  onSelectStatus: (s: ProjectStatus) => void;
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
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <Info label="งบประมาณ" value={formatBaht(project.total_budget) + " บาท"} />
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
    case "เปิดโครงการ":
      return "เปิด";
    case "ยื่นโครงการ":
      return "ยื่น";
    case "กำลังดำเนินงาน":
      return "ทำ";
    case "เสร็จสิ้น":
      return "เสร็จ";
  }
}
