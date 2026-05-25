import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  hint,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 transition-colors",
        accent
          ? "border-metier-orange/30 bg-[color:var(--color-metier-orange)]/[0.04]"
          : "border-[color:var(--color-border)]",
        className,
      )}
    >
      <div className="text-[12px] uppercase tracking-wide text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className={cn(
            "text-[28px] font-bold leading-none",
            accent && "text-metier-orange",
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[13px] font-light text-[color:var(--color-muted-fg)]">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-2 text-[12px] text-[color:var(--color-muted)]">
          {hint}
        </div>
      )}
    </div>
  );
}
