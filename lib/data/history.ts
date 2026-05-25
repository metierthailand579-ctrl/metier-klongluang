import historyJson from "@/data/procurement_2568.json";
import type { ProcurementRecord } from "@/types/db";

const records = historyJson as unknown as ProcurementRecord[];

export function getAllHistory(): ProcurementRecord[] {
  return records;
}

export function uniqueHistoryCategories(): string[] {
  const set = new Set<string>();
  for (const r of records) {
    if (r.category) set.add(r.category);
  }
  return Array.from(set).sort();
}

export function uniqueHistoryYears(): number[] {
  const set = new Set<number>();
  for (const r of records) {
    if (r.year) set.add(r.year);
  }
  return Array.from(set).sort((a, b) => a - b);
}
