export type ProjectRecord = {
  master_project_id: string;
  origin_file_id: string | null;
  origin_project_id: string | null;
  source_pdf_file: string | null;
  source_page: number | null;
  source_section: string | null;
  document_type: string | null;
  project_status_type: string | null;
  project_name_th: string;
  strategy_or_plan_category: string | null;
  program_or_workstream: string | null;
  plan_period: string | null;
  objective_or_rationale: string | null;
  target_output: string | null;
  target_group: string | null;
  location: string | null;
  responsible_department: string | null;
  implementation_period: string | null;
  budget_2566: number | null;
  budget_2567: number | null;
  budget_2568: number | null;
  budget_2569: number | null;
  budget_2570: number | null;
  total_budget: number | null;
  budget_unit: string | null;
  work_category_layer1: string | null;
  work_category_layer2: string | null;
  metier_service_area_layer1: string | null;
  metier_service_area_layer2: string | null;
  planned_years_list: string | null;
  planned_year_summary: string | null;
  first_planned_year: number | null;
  last_planned_year: number | null;
  num_planned_years: number | null;
  extraction_confidence: string | null;
};

export type ProcurementRecord = {
  project_code: string;
  agency: string | null;
  project_name: string;
  price: number | null;
  category: string | null;
  year: number | null;
};

export type SelectionStatus = "TRUE" | "FALSE" | "TBD";

export type Selection = {
  id: string;
  master_project_id: string;
  user_selected: SelectionStatus;
  selection_priority: number | null;
  selection_notes: string | null;
  metier_fit_score: number | null;
  metier_fit_tier: "high" | "medium" | "low" | null;
  created_at: string;
  updated_at: string;
};

export type ProjectStatus =
  | "ร่าง TOR"
  | "ตรวจ TOR"
  | "แก้ TOR"
  | "รอเปิดโครงการ"
  | "โครงการเปิด"
  | "ยื่นโครงการ"
  | "รอประกาศผล"
  | "ดำเนินงาน"
  | "ส่งมอบเสร็จสิ้น";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "ร่าง TOR",
  "ตรวจ TOR",
  "แก้ TOR",
  "รอเปิดโครงการ",
  "โครงการเปิด",
  "ยื่นโครงการ",
  "รอประกาศผล",
  "ดำเนินงาน",
  "ส่งมอบเสร็จสิ้น",
];

// Map old (pre-rework) status values from existing localStorage/Supabase data
// onto the new 9-value schema. Applied at read time so we don't lose anyone's
// in-progress work.
export const LEGACY_STATUS_MAP: Record<string, ProjectStatus> = {
  "ร่าง TOR": "ร่าง TOR",
  "เปิดโครงการ": "รอเปิดโครงการ",
  "ยื่นโครงการ": "ยื่นโครงการ",
  "กำลังดำเนินงาน": "ดำเนินงาน",
  "เสร็จสิ้น": "ส่งมอบเสร็จสิ้น",
};

// Visual grouping for the kanban — some columns stack two sub-states.
export type StatusColumn = {
  label: string;
  statuses: ProjectStatus[];
};
export const STATUS_COLUMNS: StatusColumn[] = [
  { label: "ร่าง TOR", statuses: ["ร่าง TOR"] },
  { label: "ตรวจ / แก้ TOR", statuses: ["ตรวจ TOR", "แก้ TOR"] },
  { label: "เปิดโครงการ", statuses: ["รอเปิดโครงการ", "โครงการเปิด"] },
  { label: "ยื่น / รอประกาศผล", statuses: ["ยื่นโครงการ", "รอประกาศผล"] },
  { label: "ดำเนินงาน", statuses: ["ดำเนินงาน"] },
  { label: "ส่งมอบเสร็จสิ้น", statuses: ["ส่งมอบเสร็จสิ้น"] },
];
