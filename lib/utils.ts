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

// Timestamps are stored as UTC ISO strings (new Date().toISOString()). The team
// works in Thailand, so render them in ICT (Asia/Bangkok) with a Buddhist-era
// year — forcing the zone also keeps output identical across machines & SSR.
const thaiTimestampFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const thaiDateOnlyFmt = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatThaiTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return thaiTimestampFmt.format(d);
}

export function formatThaiDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return thaiDateOnlyFmt.format(d);
}

// Sortable ISO date (YYYY-MM-DD) anchored to Thai time — for CSV cells and
// filenames where we want machine-friendly ordering, not the display format.
const ictIsoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatIctIsoDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return ictIsoDateFmt.format(d);
}
