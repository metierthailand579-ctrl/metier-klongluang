"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Lightbulb,
  Plus,
  Send,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/lib/shared-state";
import { useLocalStorage } from "@/lib/storage";

const ISSUES_KEY = "khlongluang.issues.v1";
const AUTHOR_KEY = "khlongluang.commentAuthor.v1";

type IssueType = "bug" | "problem" | "request";
type Severity = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "resolved" | "wontfix";

type IssueUpdate = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  type: IssueType;
  severity: Severity;
  status: Status;
  page: string;
  reporter: string;
  created_at: string;
  updated_at: string;
  resolution: string;
  updates: IssueUpdate[];
};

const TYPE_META: Record<IssueType, { label: string; icon: typeof Bug; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "#dc2626" },
  problem: { label: "ปัญหา", icon: TriangleAlert, color: "#d97706" },
  request: { label: "ขอเพิ่ม", icon: Lightbulb, color: "#7c3aed" },
};

const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  critical: { label: "วิกฤต", color: "#dc2626" },
  high: { label: "สูง", color: "#ff5008" },
  medium: { label: "กลาง", color: "#d97706" },
  low: { label: "ต่ำ", color: "#64748b" },
};

const STATUS_META: Record<Status, { label: string; color: string; icon: typeof CircleDot }> = {
  open: { label: "เปิดอยู่", color: "#dc2626", icon: CircleDot },
  in_progress: { label: "กำลังแก้", color: "#d97706", icon: CircleDot },
  resolved: { label: "แก้แล้ว", color: "#10b981", icon: CheckCircle2 },
  wontfix: { label: "ไม่แก้", color: "#94a3b8", icon: X },
};

const PAGE_OPTIONS = [
  "ทั่วไป",
  "1 · วิธีทำ",
  "2 · โครงการทั้งหมด",
  "3 · จัดกลุ่ม",
  "4 · ย้อนหลัง 2568",
  "5 · คัดเลือก",
  "6 · TOR + SOW",
  "Timeline",
  "7 · สถานะ",
];

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function IssuesBoard() {
  const [issues, setIssues, hydrated] = useSyncedState<Issue[]>(ISSUES_KEY, []);
  const [authorName, setAuthorName] = useLocalStorage<string>(AUTHOR_KEY, "");

  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Status | "all" | "active">("active");
  const [typeFilter, setTypeFilter] = useState<IssueType | "all">("all");
  const [q, setQ] = useState("");

  // New-issue draft
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    type: IssueType;
    severity: Severity;
    page: string;
  }>({ title: "", description: "", type: "bug", severity: "medium", page: "ทั่วไป" });

  const stats = useMemo(() => {
    let open = 0,
      inProgress = 0,
      resolved = 0;
    for (const it of issues) {
      if (it.status === "open") open += 1;
      else if (it.status === "in_progress") inProgress += 1;
      else if (it.status === "resolved") resolved += 1;
    }
    return { total: issues.length, open, inProgress, resolved };
  }, [issues]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const arr = issues.filter((it) => {
      if (statusFilter === "active" && (it.status === "resolved" || it.status === "wontfix"))
        return false;
      if (statusFilter !== "all" && statusFilter !== "active" && it.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (needle) {
        const hay = `${it.title} ${it.description} ${it.page} ${it.reporter}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // Sort: active first, then by severity desc, then newest
    const statusOrder: Record<Status, number> = {
      open: 0,
      in_progress: 1,
      resolved: 2,
      wontfix: 3,
    };
    arr.sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status])
        return statusOrder[a.status] - statusOrder[b.status];
      if (SEVERITY_RANK[b.severity] !== SEVERITY_RANK[a.severity])
        return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      return b.created_at.localeCompare(a.created_at);
    });
    return arr;
  }, [issues, statusFilter, typeFilter, q]);

  const submitNew = () => {
    if (!draft.title.trim()) return;
    const now = new Date().toISOString();
    const issue: Issue = {
      id: newId(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: draft.type,
      severity: draft.severity,
      status: "open",
      page: draft.page,
      reporter: authorName.trim() || "ไม่ระบุชื่อ",
      created_at: now,
      updated_at: now,
      resolution: "",
      updates: [],
    };
    setIssues((prev) => [issue, ...prev]);
    setDraft({ title: "", description: "", type: "bug", severity: "medium", page: "ทั่วไป" });
    setFormOpen(false);
  };

  const updateIssue = (id: string, patch: Partial<Issue>) => {
    setIssues((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...patch, updated_at: new Date().toISOString() } : it,
      ),
    );
  };
  const addUpdate = (id: string, body: string) => {
    const t = body.trim();
    if (!t) return;
    setIssues((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              updated_at: new Date().toISOString(),
              updates: [
                ...it.updates,
                {
                  id: newId(),
                  author: authorName.trim() || "ไม่ระบุชื่อ",
                  body: t,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : it,
      ),
    );
  };
  const removeUpdate = (id: string, uid: string) =>
    setIssues((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, updates: it.updates.filter((u) => u.id !== uid) } : it,
      ),
    );
  const removeIssue = (id: string) => {
    if (!confirm("ลบรายการนี้?")) return;
    setIssues((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="ทั้งหมด" value={stats.total.toLocaleString("th-TH")} unit="รายการ" />
        <KpiCard label="เปิดอยู่" value={stats.open.toLocaleString("th-TH")} unit="รายการ" accent />
        <KpiCard label="กำลังแก้" value={stats.inProgress.toLocaleString("th-TH")} unit="รายการ" />
        <KpiCard label="แก้แล้ว" value={stats.resolved.toLocaleString("th-TH")} unit="รายการ" />
      </div>

      {/* New-issue trigger / form */}
      <Card>
        <CardContent className="pt-4">
          {!formOpen ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> แจ้งปัญหา / Bug ใหม่
              </Button>
              <span className="text-[12px] text-[color:var(--color-muted)]">
                บันทึกสิ่งที่เจอ — คนอื่นในทีมจะเห็นทันที
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">แจ้งปัญหา / Bug ใหม่</h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="rounded p-1 text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="หัวข้อสั้น ๆ เช่น 'หน้า Timeline งบปี 2570 แสดงผิด'"
                autoFocus
              />
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="รายละเอียด: เกิดอะไรขึ้น / ทำยังไงถึงเจอ / คาดว่าควรเป็นยังไง"
                className="min-h-[80px]"
              />
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="ประเภท">
                  <Select
                    value={draft.type}
                    onValueChange={(v) => setDraft({ ...draft, type: v as IssueType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TYPE_META) as IssueType[]).map((t) => (
                        <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ความรุนแรง">
                  <Select
                    value={draft.severity}
                    onValueChange={(v) => setDraft({ ...draft, severity: v as Severity })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SEVERITY_META) as Severity[]).map((s) => (
                        <SelectItem key={s} value={s}>{SEVERITY_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="หน้าที่เกี่ยวข้อง">
                  <Select
                    value={draft.page}
                    onValueChange={(v) => setDraft({ ...draft, page: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAGE_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="ชื่อผู้แจ้ง">
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="ชื่อคุณ"
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setFormOpen(false)}>ยกเลิก</Button>
                <Button onClick={submitNew} disabled={!draft.title.trim()}>
                  <Send className="h-4 w-4" /> บันทึก
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 text-[12px]">
          {(
            [
              ["active", "ที่ยังไม่จบ"],
              ["open", "เปิดอยู่"],
              ["in_progress", "กำลังแก้"],
              ["resolved", "แก้แล้ว"],
              ["all", "ทั้งหมด"],
            ] as const
          ).map(([k, label]) => (
            <Chip key={k} active={statusFilter === k} onClick={() => setStatusFilter(k)}>
              {label}
            </Chip>
          ))}
        </div>
        <span className="ml-2 text-[12px] text-[color:var(--color-muted)]">|</span>
        <div className="flex gap-1 text-[12px]">
          <Chip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
            ทุกประเภท
          </Chip>
          {(Object.keys(TYPE_META) as IssueType[]).map((t) => (
            <Chip
              key={t}
              active={typeFilter === t}
              color={TYPE_META[t].color}
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_META[t].label}
            </Chip>
          ))}
        </div>
        <div className="ml-auto w-[220px]">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา..." />
        </div>
      </div>

      {/* List */}
      {!hydrated ? (
        <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-10 text-center text-[color:var(--color-muted)]">
          กำลังโหลด...
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--color-border)] p-12 text-center">
          <Bug className="mx-auto mb-3 h-10 w-10 text-[color:var(--color-muted)]" />
          <div className="font-bold">
            {issues.length === 0 ? "ยังไม่มีรายการ" : "ไม่มีรายการตรงเงื่อนไข"}
          </div>
          <div className="mt-1 text-[13px] text-[color:var(--color-muted-fg)]">
            {issues.length === 0
              ? "กด 'แจ้งปัญหา / Bug ใหม่' เพื่อเริ่มบันทึก"
              : "ลองเปลี่ยน filter"}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((it) => (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <IssueCard
                  issue={it}
                  authorName={authorName}
                  onUpdate={(patch) => updateIssue(it.id, patch)}
                  onAddUpdate={(body) => addUpdate(it.id, body)}
                  onRemoveUpdate={(uid) => removeUpdate(it.id, uid)}
                  onRemove={() => removeIssue(it.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  authorName,
  onUpdate,
  onAddUpdate,
  onRemoveUpdate,
  onRemove,
}: {
  issue: Issue;
  authorName: string;
  onUpdate: (patch: Partial<Issue>) => void;
  onAddUpdate: (body: string) => void;
  onRemoveUpdate: (uid: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const t = TYPE_META[issue.type];
  const sev = SEVERITY_META[issue.severity];
  const st = STATUS_META[issue.status];
  const TIcon = t.icon;
  const SIcon = st.icon;
  const isClosed = issue.status === "resolved" || issue.status === "wontfix";

  return (
    <Card className={cn("overflow-hidden", isClosed && "opacity-80")}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: `${t.color}15`, color: t.color }}
        >
          <TIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold"
              style={{ borderColor: st.color, color: st.color }}
            >
              <SIcon className="mr-0.5 h-2.5 w-2.5" />
              {st.label}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: sev.color, color: sev.color }}
            >
              {sev.label}
            </Badge>
            <span className="text-[11px] text-[color:var(--color-muted)]">{issue.page}</span>
            {issue.updates.length > 0 && (
              <span className="text-[11px] text-[color:var(--color-muted)]">
                · {issue.updates.length} อัปเดต
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-1 font-bold leading-snug",
              isClosed && "line-through decoration-[color:var(--color-muted)]",
            )}
          >
            {issue.title}
          </div>
          <div className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">
            โดย {issue.reporter} · {issue.created_at.slice(0, 10)}
          </div>
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
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-[color:var(--color-border)] p-4">
              {issue.description && (
                <div className="whitespace-pre-wrap rounded-md bg-[color:var(--color-subtle)]/50 p-3 text-[13px] leading-relaxed">
                  {issue.description}
                </div>
              )}

              {/* Status changer */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-[color:var(--color-muted-fg)]">เปลี่ยนสถานะ:</span>
                {(Object.keys(STATUS_META) as Status[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdate({ status: s })}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      issue.status === s ? "text-white" : "",
                    )}
                    style={
                      issue.status === s
                        ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color }
                        : { borderColor: STATUS_META[s].color, color: STATUS_META[s].color }
                    }
                  >
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>

              {/* Resolution */}
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  วิธีแก้ / ข้อสรุป
                </label>
                <Textarea
                  value={issue.resolution}
                  onChange={(e) => onUpdate({ resolution: e.target.value })}
                  placeholder="สรุปวิธีแก้ปัญหานี้ (กรอกเมื่อแก้เสร็จ)"
                  className={cn(
                    "min-h-[52px] text-[13px]",
                    issue.status === "resolved" && "border-emerald-500/40 bg-emerald-50/40",
                  )}
                />
              </div>

              {/* Update log */}
              <div>
                <div className="mb-2 text-[12px] font-medium text-[color:var(--color-muted-fg)]">
                  Log การติดตาม ({issue.updates.length})
                </div>
                {issue.updates.length > 0 && (
                  <ul className="mb-2 space-y-1.5">
                    {issue.updates
                      .slice()
                      .reverse()
                      .map((u) => (
                        <li
                          key={u.id}
                          className="group rounded-md border border-[color:var(--color-border)] bg-white p-2.5 text-[13px]"
                        >
                          <div className="flex items-baseline justify-between gap-2 text-[11px] text-[color:var(--color-muted-fg)]">
                            <span className="font-bold text-fg">{u.author}</span>
                            <span className="tabular-nums">
                              {u.created_at.slice(0, 10)} {u.created_at.slice(11, 16)}
                            </span>
                          </div>
                          <div className="mt-1 whitespace-pre-wrap leading-snug">{u.body}</div>
                          <button
                            onClick={() => onRemoveUpdate(u.id)}
                            className="invisible mt-1 inline-flex items-center gap-1 text-[10px] text-[color:var(--color-muted)] hover:text-red-600 group-hover:visible"
                          >
                            <Trash2 className="h-3 w-3" /> ลบ
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                <div className="flex items-start gap-2">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        onAddUpdate(body);
                        setBody("");
                      }
                    }}
                    placeholder={`อัปเดตความคืบหน้า (${authorName.trim() || "ไม่ระบุชื่อ"}) — ⌘/Ctrl+Enter ส่ง`}
                    className="min-h-[44px] flex-1 text-[13px]"
                  />
                  <Button
                    size="sm"
                    disabled={!body.trim()}
                    onClick={() => {
                      onAddUpdate(body);
                      setBody("");
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end border-t border-[color:var(--color-border)] pt-3">
                <Button size="sm" variant="ghost" onClick={onRemove}>
                  <Trash2 className="h-3.5 w-3.5" /> ลบรายการนี้
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-[color:var(--color-muted)]">{label}</div>
      {children}
    </div>
  );
}

function Chip({
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
