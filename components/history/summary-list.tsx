"use client";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn, formatBahtCompact } from "@/lib/utils";

export type SummaryRow = {
  key: string;
  label: string;
  count: number;
  value: number;
  color?: string;
};

export function SummaryList({
  title,
  description,
  rows,
  active,
  onPick,
  maxRows = 8,
  unit = "บาท",
}: {
  title: string;
  description?: string;
  rows: SummaryRow[];
  active: string | null;
  onPick: (key: string | null) => void;
  maxRows?: number;
  unit?: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const visible = rows.slice(0, maxRows);
  const hiddenCount = rows.length - visible.length;
  const max = visible.reduce((m, r) => Math.max(m, r.value), 0);

  return (
    <Card className="h-full">
      <CardContent className="pt-5">
        <div className="mb-3">
          <CardTitle className="text-[15px]">{title}</CardTitle>
          {description && (
            <CardDescription className="text-[11px]">{description}</CardDescription>
          )}
        </div>
        <div className="space-y-1">
          {visible.map((r) => {
            const pct = max ? (r.value / max) * 100 : 0;
            const isActive = active === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onPick(isActive ? null : r.key)}
                className={cn(
                  "group flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-colors",
                  isActive
                    ? "bg-[color:var(--color-metier-orange)]/[0.08]"
                    : "hover:bg-[color:var(--color-subtle)]/60",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-[13px]">
                    {r.color && (
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                    )}
                    <span
                      className={cn(
                        "leading-tight",
                        isActive && "font-semibold text-metier-orange",
                      )}
                    >
                      {r.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--color-muted)]">
                    {r.count.toLocaleString("th-TH")} ร.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isActive ? "#ff5008" : r.color ?? "#0f172a",
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-[12px] font-bold tabular-nums",
                      isActive ? "text-metier-orange" : "text-fg",
                    )}
                  >
                    {formatBahtCompact(r.value)}
                  </span>
                </div>
              </button>
            );
          })}
          {hiddenCount > 0 && (
            <div className="px-2 pt-1 text-[11px] text-[color:var(--color-muted)]">
              + อีก {hiddenCount.toLocaleString("th-TH")} รายการ
            </div>
          )}
        </div>
        <div className="mt-3 border-t border-[color:var(--color-border)] pt-2 text-[11px] text-[color:var(--color-muted-fg)]">
          รวม {rows.length.toLocaleString("th-TH")} กลุ่ม · {formatBahtCompact(total)} {unit}
        </div>
      </CardContent>
    </Card>
  );
}
