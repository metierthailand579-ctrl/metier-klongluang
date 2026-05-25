"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, GripVertical, History, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import { PROJECT_STATUSES, type ProjectStatus } from "@/types/db";
import type { ProjectRecord } from "@/types/db";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";
const STATUS_KEY = "khlongluang.statuses.v1";

type ConfirmRecord = { confirmed: boolean; notes: string; confirmed_at?: string };

type StatusEntry = {
  status: ProjectStatus;
  changed_at: string;
};

type StatusBoard = Record<string, StatusEntry[]>;

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

  const hydrated = hydrated1 && hydrated2 && hydrated3;

  // confirmed-and-selected projects
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
    return { count: confirmedItems.length, total: t };
  }, [confirmedItems]);

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
          แล้วกดปุ่ม{" "}
          <Badge variant="success" className="mx-1">เทศบาลยืนยัน</Badge>{" "}
          ที่โครงการที่ตกลงรับ — โครงการนั้นจะปรากฏใน Kanban นี้
        </CardDescription>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="โครงการ Confirmed" value={totals.count.toLocaleString("th-TH")} unit="รายการ" accent />
        <KpiCard label="งบประมาณรวม" value={formatBahtCompact(totals.total)} unit="บาท" />
        <KpiCard
          label="เสร็จสิ้น"
          value={columns["เสร็จสิ้น"].length.toLocaleString("th-TH")}
          unit={`/ ${totals.count}`}
        />
      </div>

      {/* Board */}
      <div className="grid gap-3 lg:grid-cols-5">
        {PROJECT_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            color={COLUMN_COLORS[status]}
            items={columns[status]}
            currentStatus={currentStatus}
            history={board}
            onMove={moveTo}
          />
        ))}
      </div>

      <div className="text-[12px] text-[color:var(--color-muted)]">
        💡 ลาก-วาง การ์ดข้ามคอลัมน์เพื่อเปลี่ยนสถานะ · ทุกการเปลี่ยนเก็บใน timeline log
      </div>
    </div>
  );
}

function Column({
  status,
  color,
  items,
  currentStatus,
  history,
  onMove,
}: {
  status: ProjectStatus;
  color: string;
  items: ProjectRecord[];
  currentStatus: (pid: string) => ProjectStatus;
  history: StatusBoard;
  onMove: (pid: string, s: ProjectStatus) => void;
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
        over ? "border-metier-orange ring-2 ring-metier-orange/20" : "border-[color:var(--color-border)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <span className="font-medium text-[14px]">{status}</span>
        </div>
        <Badge variant="muted">{items.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 p-2 min-h-[120px]">
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
                history={history[p.master_project_id] ?? []}
                color={color}
                onSelectStatus={(s) => onMove(p.master_project_id, s)}
                currentStatus={currentStatus(p.master_project_id)}
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
  history,
  color,
  onSelectStatus,
  currentStatus,
}: {
  project: ProjectRecord;
  history: StatusEntry[];
  color: string;
  onSelectStatus: (s: ProjectStatus) => void;
  currentStatus: ProjectStatus;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", project.master_project_id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group rounded-md border border-[color:var(--color-border)] bg-white p-2.5 hover:border-metier-orange/40"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-[color:var(--color-muted)] group-hover:text-fg" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] text-[color:var(--color-muted)]">
            {project.master_project_id}
          </div>
          <div className="mt-0.5 text-[13px] leading-snug line-clamp-3">
            {project.project_name_th}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-[color:var(--color-muted)] truncate">
              {project.responsible_department || "—"}
            </span>
            <span className="shrink-0 text-[12px] font-bold tabular-nums">
              {formatBahtCompact(project.total_budget || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick status pills */}
      <div className="mt-2 flex flex-wrap gap-1">
        {PROJECT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => onSelectStatus(s)}
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

      {history.length > 0 && (
        <>
          <button
            onClick={() => setShowHistory((x) => !x)}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)] hover:text-fg"
          >
            <Clock className="h-2.5 w-2.5" />
            {history.length} step{history.length > 1 ? "s" : ""}
          </button>
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="mt-1.5 space-y-0.5 border-t border-[color:var(--color-border)] pt-1.5 text-[11px]">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span>{h.status}</span>
                      <span className="text-[10px] text-[color:var(--color-muted)] tabular-nums">
                        {h.changed_at.slice(0, 10)}{" "}
                        {h.changed_at.slice(11, 16)}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
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
