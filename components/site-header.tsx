"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MetierLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useSyncedState } from "@/lib/shared-state";

const SELECTED_KEY = "khlongluang.selectedProjects.v1";
const CONFIRM_KEY = "khlongluang.confirmations.v1";

const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/methodology", label: "1 · วิธีทำ" },
  { href: "/projects", label: "2 · โครงการทั้งหมด" },
  { href: "/groups", label: "3 · จัดกลุ่ม" },
  { href: "/history-2568", label: "4 · ย้อนหลัง 2568" },
  { href: "/filter", label: "5 · คัดเลือก", countKey: "selected" as const },
  { href: "/selected", label: "6 · TOR + SOW", countKey: "selected" as const },
  { href: "/timeline", label: "Timeline", countKey: "selected" as const },
  { href: "/status", label: "7 · สถานะ", countKey: "confirmed" as const },
];

type ConfirmRecord = { confirmed: boolean };

export function SiteHeader() {
  const pathname = usePathname();
  const [selectedIds, , hydrated1] = useSyncedState<string[]>(SELECTED_KEY, []);
  const [confirmMap, , hydrated2] = useSyncedState<Record<string, ConfirmRecord>>(
    CONFIRM_KEY,
    {},
  );
  const hydrated = hydrated1 && hydrated2;
  const selectedCount = selectedIds.length;
  const confirmedCount = hydrated
    ? Object.values(confirmMap).filter((c) => c?.confirmed).length
    : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--color-border)] bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-4">
        <Link href="/" className="shrink-0">
          <MetierLogo variant="color-light" width={120} priority />
        </Link>
        <span className="hidden text-[14px] text-[color:var(--color-muted)] md:inline">
          / คลองหลวง 2026
        </span>
        <nav className="ml-auto flex flex-wrap items-center gap-1 text-[14px]">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const count =
              !hydrated
                ? null
                : item.countKey === "selected"
                  ? selectedCount
                  : item.countKey === "confirmed"
                    ? confirmedCount
                    : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-metier-orange text-white"
                    : "text-[color:var(--color-muted-fg)] hover:text-fg hover:bg-[color:var(--color-subtle)]",
                )}
              >
                {item.label}
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                      active
                        ? "bg-white text-metier-orange"
                        : "bg-metier-orange text-white",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
