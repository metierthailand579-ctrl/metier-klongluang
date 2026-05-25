import type { ProjectRecord } from "@/types/db";

export type Bucket = { key: string; count: number; budget: number };

export function summarize(projects: ProjectRecord[]) {
  const totalBudget = projects.reduce(
    (s, p) => s + (Number(p.total_budget) || 0),
    0,
  );
  const metierCount = projects.filter(
    (p) => p.metier_service_area_layer1 && p.metier_service_area_layer1 !== "NOT_APPLICABLE",
  ).length;
  const metierBudget = projects
    .filter(
      (p) => p.metier_service_area_layer1 && p.metier_service_area_layer1 !== "NOT_APPLICABLE",
    )
    .reduce((s, p) => s + (Number(p.total_budget) || 0), 0);

  return {
    count: projects.length,
    totalBudget,
    metierCount,
    metierBudget,
    metierShare: projects.length ? metierCount / projects.length : 0,
    metierBudgetShare: totalBudget ? metierBudget / totalBudget : 0,
  };
}

export function bucketBy<K extends keyof ProjectRecord>(
  projects: ProjectRecord[],
  key: K,
): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const p of projects) {
    const raw = p[key];
    const k = raw == null || raw === "" ? "(ไม่ระบุ)" : String(raw);
    const slot = map.get(k) ?? { key: k, count: 0, budget: 0 };
    slot.count += 1;
    slot.budget += Number(p.total_budget) || 0;
    map.set(k, slot);
  }
  return Array.from(map.values()).sort((a, b) => b.budget - a.budget);
}

export type TreemapNode = {
  name: string;
  size: number;
  count: number;
  children?: TreemapNode[];
};

/**
 * Two-level treemap: layer1 → layer2.
 * `metric` chooses whether tile size reflects budget (default) or count.
 */
export function buildTreemap(
  projects: ProjectRecord[],
  layer1Key: keyof ProjectRecord,
  layer2Key: keyof ProjectRecord,
  metric: "budget" | "count" = "budget",
): TreemapNode[] {
  const groups = new Map<string, Map<string, { budget: number; count: number }>>();
  for (const p of projects) {
    const l1 = String(p[layer1Key] ?? "(ไม่ระบุ)");
    const l2 = String(p[layer2Key] ?? "(ไม่ระบุ)");
    const inner = groups.get(l1) ?? new Map();
    const slot = inner.get(l2) ?? { budget: 0, count: 0 };
    slot.budget += Number(p.total_budget) || 0;
    slot.count += 1;
    inner.set(l2, slot);
    groups.set(l1, inner);
  }
  const value = (s: { budget: number; count: number }) =>
    metric === "budget" ? s.budget : s.count;

  return Array.from(groups.entries())
    .map(([l1, inner]) => {
      const children = Array.from(inner.entries())
        .map(([l2, s]) => ({
          name: l2,
          size: value(s),
          count: s.count,
        }))
        .sort((a, b) => b.size - a.size);
      const total = children.reduce((s, c) => s + c.size, 0);
      const totalCount = children.reduce((s, c) => s + c.count, 0);
      return { name: l1, size: total, count: totalCount, children };
    })
    .sort((a, b) => b.size - a.size);
}
