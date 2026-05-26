import projectsJson from "@/data/projects.json";
import type { ProjectRecord } from "@/types/db";
import { getMainGroup, isMetierGroup } from "@/lib/data/metier-taxonomy";
import { cleanDept, cleanProjectName } from "@/lib/data/name-fixes";

// Clean OCR typos once at module load. The original JSON stays as-is —
// `lib/data/name-fixes.ts` is the single place to add more corrections.
const projects: ProjectRecord[] = (projectsJson as unknown as ProjectRecord[]).map(
  (p) => ({
    ...p,
    project_name_th: cleanProjectName(p.project_name_th),
    responsible_department: cleanDept(p.responsible_department),
  }),
);

export function getAllProjects(): ProjectRecord[] {
  return projects;
}

export function getProjectById(id: string): ProjectRecord | undefined {
  return projects.find((p) => p.master_project_id === id);
}

export function getMetierProjects(): ProjectRecord[] {
  return projects.filter((p) => isMetierGroup(getMainGroup(p)));
}

// -------- pre-computed lookups (cheap because we run on the server) --------

export function uniqueDepartments(): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.responsible_department) set.add(p.responsible_department);
  }
  return Array.from(set).sort();
}

export function uniqueStrategies(): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.work_category_layer1) set.add(p.work_category_layer1);
  }
  return Array.from(set).sort();
}

export function uniqueMetierAreas(): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    if (p.metier_service_area_layer1) set.add(p.metier_service_area_layer1);
  }
  return Array.from(set).sort();
}
