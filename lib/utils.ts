import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const bahtFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

export function formatBaht(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return bahtFormatter.format(value);
}

export function formatBahtCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} พันล้าน`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} ล้าน`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} พัน`;
  return bahtFormatter.format(value);
}

export function thaiYear(input: number | string | null | undefined): string {
  if (input == null) return "—";
  return String(input);
}
