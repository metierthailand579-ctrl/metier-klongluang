/**
 * Seed `projects` table from output/extraction/ALL_records_v2.json
 *
 * Usage:  npm run seed:projects
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    (server-only, never commit)
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });

const SOURCE = resolve(
  process.cwd(),
  "..",
  "output",
  "extraction",
  "ALL_records_v2.json",
);

type RawRecord = Record<string, unknown>;

const PROJECT_FIELDS: string[] = [
  "master_project_id",
  "origin_file_id",
  "origin_project_id",
  "source_pdf_file",
  "source_page",
  "source_section",
  "document_type",
  "project_status_type",
  "project_name_th",
  "strategy_or_plan_category",
  "program_or_workstream",
  "plan_period",
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
];

function pick(record: RawRecord): RawRecord {
  const out: RawRecord = {};
  for (const f of PROJECT_FIELDS) {
    const v = record[f];
    out[f] = v === undefined ? null : v;
  }
  return out;
}

async function main() {
  console.log(`Reading ${SOURCE}`);
  const raw = await readFile(SOURCE, "utf-8");
  const records = JSON.parse(raw) as RawRecord[];
  console.log(`Loaded ${records.length} records`);

  const rows = records.map(pick);

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { error } = await client
      .from("projects")
      .upsert(slice, { onConflict: "master_project_id" });
    if (error) {
      console.error(`Chunk ${i}–${i + slice.length} failed:`, error);
      process.exit(1);
    }
    inserted += slice.length;
    console.log(`  upserted ${inserted}/${rows.length}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
