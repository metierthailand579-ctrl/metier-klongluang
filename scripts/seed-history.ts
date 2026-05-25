/**
 * Seed `procurement_history_2568` from
 * ../2568 Project list/เทศบาลคลองหลวง 2568-05_2569.xlsx (sheet "clean")
 *
 * Usage:  npm run seed:history
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { config } from "dotenv";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const client = createClient(url, key, { auth: { persistSession: false } });

const SOURCE = resolve(
  process.cwd(),
  "..",
  "2568 Project list",
  "เทศบาลคลองหลวง 2568-05_2569.xlsx",
);

type CleanRow = {
  เลขโครงการ?: string | number;
  หน่วยงาน?: string;
  ชื่อโครงการ?: string;
  ราคา?: number | string;
  ประเภท?: string;
  ปี?: string | number;
};

async function main() {
  console.log(`Reading ${SOURCE}`);
  const buf = await readFile(SOURCE);
  const wb = XLSX.read(buf, { type: "buffer" });
  if (!wb.SheetNames.includes("clean")) {
    console.error(`Sheet "clean" not found. Have: ${wb.SheetNames.join(", ")}`);
    process.exit(1);
  }
  const sheet = wb.Sheets["clean"];
  const rows = XLSX.utils.sheet_to_json<CleanRow>(sheet, { defval: null });
  console.log(`Loaded ${rows.length} rows`);

  const seen = new Set<string>();
  const dataset: Record<string, unknown>[] = [];
  for (const r of rows) {
    const codeRaw = r["เลขโครงการ"];
    if (codeRaw == null || codeRaw === "") continue;
    const code = String(codeRaw).trim();
    if (!code) continue;
    if (seen.has(code)) continue;
    seen.add(code);

    const priceRaw = r["ราคา"];
    const yearRaw = r["ปี"];
    dataset.push({
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
  console.log(`Unique codes: ${dataset.length}`);

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < dataset.length; i += CHUNK) {
    const slice = dataset.slice(i, i + CHUNK);
    const { error } = await client
      .from("procurement_history_2568")
      .upsert(slice, { onConflict: "project_code" });
    if (error) {
      console.error(`Chunk ${i}–${i + slice.length} failed:`, error);
      process.exit(1);
    }
    inserted += slice.length;
    console.log(`  upserted ${inserted}/${dataset.length}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
