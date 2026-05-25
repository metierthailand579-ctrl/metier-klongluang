/**
 * Build slim JSON datasets in web/data/ from the parent project's
 * extraction outputs. Run once, or whenever the upstream data changes.
 *
 *   npm run data:build
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const ROOT = resolve(process.cwd(), "..");
const OUT = resolve(process.cwd(), "data");

const PROJECT_FIELDS = [
  "master_project_id",
  "origin_file_id",
  "source_pdf_file",
  "source_page",
  "document_type",
  "project_status_type",
  "project_name_th",
  "strategy_or_plan_category",
  "program_or_workstream",
  "objective_or_rationale",
  "target_output",
  "target_group",
  "location",
  "responsible_department",
  "implementation_period",
  "budget_2566",
  "budget_2567",
  "budget_2568",
  "budget_2569",
  "budget_2570",
  "total_budget",
  "budget_unit",
  "work_category_layer1",
  "work_category_layer2",
  "metier_service_area_layer1",
  "metier_service_area_layer2",
  "planned_years_list",
  "planned_year_summary",
  "first_planned_year",
  "last_planned_year",
  "num_planned_years",
  "extraction_confidence",
] as const;

type ProjectRow = Record<(typeof PROJECT_FIELDS)[number], unknown>;

async function buildProjects() {
  const src = resolve(ROOT, "output", "extraction", "ALL_records_v2.json");
  const raw = await readFile(src, "utf-8");
  const records = JSON.parse(raw) as Record<string, unknown>[];

  const slim: ProjectRow[] = records.map((r) => {
    const out = {} as ProjectRow;
    for (const f of PROJECT_FIELDS) {
      out[f] = r[f] ?? null;
    }
    return out;
  });

  const dst = resolve(OUT, "projects.json");
  await writeFile(dst, JSON.stringify(slim), "utf-8");
  console.log(`  → ${slim.length} projects → ${dst}`);
}

async function buildHistory() {
  const src = resolve(
    ROOT,
    "2568 Project list",
    "เทศบาลคลองหลวง 2568-05_2569.xlsx",
  );
  const buf = await readFile(src);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets["clean"];
  const rows = XLSX.utils.sheet_to_json<{
    เลขโครงการ?: string | number;
    หน่วยงาน?: string;
    ชื่อโครงการ?: string;
    ราคา?: number | string;
    ประเภท?: string;
    ปี?: string | number;
  }>(sheet, { defval: null });

  const seen = new Set<string>();
  type HistRow = {
    project_code: string;
    agency: string | null;
    project_name: string;
    price: number | null;
    category: string | null;
    year: number | null;
  };
  const slim: HistRow[] = [];
  for (const r of rows) {
    const codeRaw = r["เลขโครงการ"];
    if (codeRaw == null || codeRaw === "") continue;
    const code = String(codeRaw).trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const priceRaw = r["ราคา"];
    const yearRaw = r["ปี"];
    slim.push({
      project_code: code,
      agency: r["หน่วยงาน"] ?? null,
      project_name: r["ชื่อโครงการ"] ?? "ไม่ทราบข้อมูลในส่วนนี้",
      price:
        typeof priceRaw === "number"
          ? priceRaw
          : priceRaw
            ? Number(String(priceRaw).replace(/,/g, "")) || null
            : null,
      category: r["ประเภท"] ?? null,
      year: yearRaw ? Number(String(yearRaw).trim()) || null : null,
    });
  }
  const dst = resolve(OUT, "procurement_2568.json");
  await writeFile(dst, JSON.stringify(slim), "utf-8");
  console.log(`  → ${slim.length} procurements → ${dst}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await buildProjects();
  await buildHistory();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
