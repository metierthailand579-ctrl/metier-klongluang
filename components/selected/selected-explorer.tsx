"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardEdit,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KpiCard } from "@/components/kpi-card";
import { cn, formatBaht, formatBahtCompact } from "@/lib/utils";
import { useLocalStorage } from "@/lib/storage";
import type { ProjectRecord } from "@/types/db";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const TOR_KEY = "khlongluang.torRefs.v1";
const SOW_KEY = "khlongluang.sowItems.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";

export type ConfirmRecord = {
  confirmed: boolean;
  notes: string;
  confirmed_at?: string;
};

export type TorRef = {
  code: string;
  note: string;
};

export function SelectedExplorer({ projects }: { projects: ProjectRecord[] }) {
  const [selectedIds, , hydrated] = useLocalStorage<string[]>(SELECTED_KEY, []);
  const [torMap, setTorMap] = useLocalStorage<Record<string, TorRef[]>>(TOR_KEY, {});
  const [sowMap, setSowMap] = useLocalStorage<Record<string, string[]>>(SOW_KEY, {});
  const [confirmMap, setConfirmMap] = useLocalStorage<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );

  const items = useMemo(() => {
    const set = new Set(selectedIds);
    return projects.filter((p) => set.has(p.master_project_id));
  }, [projects, selectedIds]);

  const summary = useMemo(() => {
    const total = items.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const confirmedCount = items.filter(
      (p) => confirmMap[p.master_project_id]?.confirmed,
    ).length;
    return { count: items.length, total, confirmedCount };
  }, [items, confirmMap]);

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

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-[color:var(--color-muted)]">
        กำลังโหลดที่เลือกไว้...
      </div>
    );
  }

  if (items.length === 0) {
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
      <motion.div
        className="grid gap-3 sm:grid-cols-3"
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

      <div className="space-y-4">
        {items.map((p, i) => (
          <ProjectCard
            key={p.master_project_id}
            project={p}
            tor={torMap[p.master_project_id] ?? []}
            sow={sowMap[p.master_project_id] ?? []}
            confirm={confirmMap[p.master_project_id] ?? { confirmed: false, notes: "" }}
            onUpdateTor={(fn) => updateTor(p.master_project_id, fn)}
            onUpdateSow={(fn) => updateSow(p.master_project_id, fn)}
            onSetConfirm={(fn) => setConfirm(p.master_project_id, fn)}
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
  onUpdateTor,
  onUpdateSow,
  onSetConfirm,
  initiallyOpen,
}: {
  project: ProjectRecord;
  tor: TorRef[];
  sow: string[];
  confirm: ConfirmRecord;
  onUpdateTor: (fn: (prev: TorRef[]) => TorRef[]) => void;
  onUpdateSow: (fn: (prev: string[]) => string[]) => void;
  onSetConfirm: (fn: (prev: ConfirmRecord) => ConfirmRecord) => void;
  initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        confirm.confirmed && "border-emerald-500/40 bg-emerald-500/[0.02]",
      )}
    >
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
            {project.metier_service_area_layer1 && project.metier_service_area_layer1 !== "NOT_APPLICABLE" && (
              <Badge variant="default">{project.metier_service_area_layer1}</Badge>
            )}
            {confirm.confirmed && <Badge variant="success">ยืนยันแล้ว</Badge>}
            {tor.length > 0 && (
              <Badge variant="muted">{tor.length} TOR ref</Badge>
            )}
            {sow.length > 0 && (
              <Badge variant="muted">{sow.length} SOW</Badge>
            )}
          </div>
          <div className="mt-1 font-bold leading-snug">{project.project_name_th}</div>
          <div className="mt-1 truncate text-[13px] text-[color:var(--color-muted-fg)]">
            {project.responsible_department || "—"} ·{" "}
            {project.work_category_layer1} · ปี{" "}
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
              <TorRefList items={tor} onUpdate={onUpdateTor} />
              <SowList items={sow} onUpdate={onUpdateSow} />
            </div>
            <ConfirmStrip confirm={confirm} onSet={onSetConfirm} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function TorRefList({
  items,
  onUpdate,
}: {
  items: TorRef[];
  onUpdate: (fn: (prev: TorRef[]) => TorRef[]) => void;
}) {
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  const add = () => {
    if (!code.trim() && !note.trim()) return;
    onUpdate((prev) => [...prev, { code: code.trim(), note: note.trim() }]);
    setCode("");
    setNote("");
  };
  const remove = (i: number) => onUpdate((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-[color:var(--color-muted-fg)]" />
        <h3 className="font-bold">TOR อ้างอิง</h3>
        <Badge variant="muted" className="ml-auto">{items.length} รายการ</Badge>
      </div>

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
        <Button size="sm" variant="outline" onClick={add} className="w-full">
          <Plus className="h-3.5 w-3.5" /> เพิ่ม TOR อ้างอิง
        </Button>
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
            onChange={(e) =>
              onSet((prev) => ({ ...prev, notes: e.target.value }))
            }
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
