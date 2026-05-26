"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Every key that's expected to be shared. Used by the manual sync button to
// push all local state to Supabase in one click.
const SHARED_KEYS = [
  "khlongluang.selectedProjects.v1",
  "khlongluang.projectMeta.v1",
  "khlongluang.confirmations.v1",
  "khlongluang.statuses.v1",
  "khlongluang.statusComments.v1",
  "khlongluang.torRefs.v1",
  "khlongluang.sowItems.v1",
  "klongluang.groupOverrides.v1",
];

type Status = "checking" | "online" | "offline" | "syncing" | "synced";

export function SyncStatus() {
  const [status, setStatus] = useState<Status>("checking");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase
          .from("app_state")
          .select("key", { head: true, count: "exact" })
          .limit(1);
        setStatus(error ? "offline" : "online");
      } catch {
        setStatus("offline");
      }
    })();
  }, []);

  const pushAll = async () => {
    setStatus("syncing");
    try {
      const supabase = createSupabaseBrowserClient();
      const rows: Array<{ key: string; value: unknown; updated_at: string }> = [];
      const now = new Date().toISOString();
      for (const key of SHARED_KEYS) {
        const raw = window.localStorage.getItem(key);
        if (raw == null) continue;
        try {
          rows.push({ key, value: JSON.parse(raw), updated_at: now });
        } catch {
          // ignore corrupt key
        }
      }
      if (rows.length === 0) {
        setStatus("synced");
        setLastSyncedAt(now);
        return;
      }
      const { error } = await supabase.from("app_state").upsert(rows);
      if (error) throw error;
      setStatus("synced");
      setLastSyncedAt(now);
    } catch {
      setStatus("offline");
    }
  };

  const dot =
    status === "online" || status === "synced"
      ? "bg-emerald-500"
      : status === "syncing"
        ? "bg-amber-500 animate-pulse"
        : status === "offline"
          ? "bg-red-500"
          : "bg-[color:var(--color-muted)]";
  const label =
    status === "checking"
      ? "กำลังเช็ค sync..."
      : status === "online"
        ? "Sync ออนไลน์"
        : status === "syncing"
          ? "กำลัง sync..."
          : status === "synced"
            ? `Sync แล้ว ${lastSyncedAt?.slice(11, 16) ?? ""}`
            : "Offline — เก็บ local เท่านั้น";
  const Icon =
    status === "offline" ? CloudOff : status === "syncing" ? RefreshCw : Cloud;

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dot)} />
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          status === "syncing" && "animate-spin",
        )}
      />
      <span>{label}</span>
      <button
        onClick={pushAll}
        disabled={status === "syncing" || status === "checking"}
        className="rounded border border-[color:var(--color-border)] px-2 py-0.5 text-[11px] transition-colors hover:bg-[color:var(--color-subtle)] disabled:opacity-50"
        title="Push state จาก browser นี้ขึ้น Supabase — ใช้ตอนเพิ่ง apply migration ใหม่ ๆ"
      >
        Push state ขึ้น cloud
      </button>
    </div>
  );
}
