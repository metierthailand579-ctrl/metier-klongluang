"use client";

import { formatBaht, formatBahtCompact } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ProjectRecord } from "@/types/db";

/**
 * Slim summary strip showing total budget split across 2568 / 2569 / 2570
 * plus the grand total. Used under the KPI cards on /selected and
 * /timeline so the team always knows where the money lands by year.
 */
export function YearBudgetStrip({
  projects,
  title = "งบประมาณตามปี",
}: {
  projects: ProjectRecord[];
  title?: string;
}) {
  const y2568 = projects.reduce((s, p) => s + (Number(p.budget_2568) || 0), 0);
  const y2569 = projects.reduce((s, p) => s + (Number(p.budget_2569) || 0), 0);
  const y2570 = projects.reduce((s, p) => s + (Number(p.budget_2570) || 0), 0);
  const total = y2568 + y2569 + y2570;
  const years: Array<[number, number]> = [
    [2568, y2568],
    [2569, y2569],
    [2570, y2570],
  ];
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="text-[12px] font-medium text-[color:var(--color-muted-fg)]">
          {title}
        </div>
        <div className="text-[12px] text-[color:var(--color-muted)]">
          รวม{" "}
          <span className="font-bold tabular-nums text-fg">
            {formatBahtCompact(total)}
          </span>{" "}
          บาท
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {years.map(([y, v]) => {
          const pct = total ? (v / total) * 100 : 0;
          return (
            <div key={y}>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="font-mono text-[color:var(--color-muted)]">พ.ศ. {y}</span>
                <span className="tabular-nums text-[color:var(--color-muted)]">
                  {pct.toFixed(0)}%
                </span>
              </div>
              <div
                className={cn(
                  "mt-0.5 text-[18px] font-bold tabular-nums leading-tight",
                  v > 0 ? "text-fg" : "text-[color:var(--color-muted)]",
                )}
                title={formatBaht(v) + " บาท"}
              >
                {v > 0 ? formatBahtCompact(v) : "—"}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--color-subtle)]">
                <div
                  className="h-full rounded-full bg-metier-orange/80"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
