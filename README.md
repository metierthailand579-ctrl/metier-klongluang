# คลองหลวง 2026 · Metier Opportunity Webapp

Interactive web app เพื่อวิเคราะห์โครงการในแผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง พ.ศ. 2566–2570 และคัดเลือกโครงการที่ Metier (Thailand) Co., Ltd. มีโอกาสรับงาน — แล้วติดตามตั้งแต่ร่าง TOR → ส่งมอบ แบบทำงานร่วมกันเป็นทีม (realtime)

**Repo:** https://github.com/metierthailand579-ctrl/metier-klongluang

---

## 🏛 Stack

- **Next.js 16** (App Router · TypeScript · Tailwind v4)
- **shadcn/ui primitives** (Radix) + **Framer Motion** + **Recharts** + **Lucide**
- **Supabase** (Postgres + Realtime) — ใช้สำหรับ *shared state เท่านั้น* (ดู Architecture ด้านล่าง)
- IBM Plex Sans Thai · Metier brand CI (`#ff5008` orange)

## 🧱 Data architecture (อ่านก่อน — สำคัญ)

แอปแยกข้อมูลเป็น 2 ฝั่งชัดเจน:

| ฝั่ง | เก็บที่ไหน | ตัวอย่าง |
|---|---|---|
| **อ่านอย่างเดียว (static)** | ไฟล์ JSON ในเครื่อง — `data/projects.json`, `data/procurement_2568.json` โหลดผ่าน `lib/data/*` | 1,333 โครงการ, 1,449 รายการจัดซื้อ, taxonomy 11 กลุ่ม |
| **ทีมแก้ร่วมกัน (mutable)** | Supabase ตารางเดียว `app_state` (key/value `jsonb`) + **Realtime** ผ่าน `lib/shared-state.ts` (`useSyncedState`) | การติ๊กเลือก, priority, ไตรมาส, สถานะ Kanban, comment, issues |

- `useSyncedState` = drop-in แทน `useLocalStorage` → เขียน localStorage ทันที (ไม่ flash) แล้ว debounce upsert ขึ้น Supabase + subscribe `postgres_changes` ให้เบราว์เซอร์อื่นเห็นสด ๆ ถ้า Supabase ล่ม จะ fallback เป็น localStorage-only โดยไม่ error
- ⚠️ 7 ตารางเดิมใน `0001_init.sql` (`projects`, `procurement_history_2568`, `selections`, …) เป็น **legacy scaffold — แอปปัจจุบันไม่ได้ query** (โค้ดเรียกแค่ `app_state`) ข้อมูลโครงการมาจาก JSON ในเครื่องล้วน ๆ

## 🗺 หน้าหลัก (9)

| # | Route | เนื้อหา |
|---|---|---|
| 1 | `/methodology` | Storytelling วิธีทำงาน (timeline + animations) — อ่าน 6 PDF + 4 Excel จนถึงคัดเลือก |
| 2 | `/projects` | 1,333 โครงการ — DataTable + KPI cards + year-budget strips |
| 3 | `/groups` | 11 Main Groups (4 Metier + 7 Municipal) — ติ๊กเปลี่ยนกลุ่มแต่ละโครงการเองได้ |
| 4 | `/history-2568` | 1,449 รายการจัดซื้อจัดจ้างจริง — สรุป 3 มุม: ประเภทงาน / หน่วยงาน / วิธีจัดจ้าง |
| 5 | `/filter` | Filter หลายมิติ + ติ๊กโครงการที่ Metier ทำได้ + ปุ่ม "ทีมแนะนำ" + live summary |
| 6 | `/selected` | ใส่ Priority + ไตรมาส + แนบ TOR + usable 3-state + ร่าง SOW + comment thread ต่อ TOR + Confirm |
| 7 | `/timeline` | ภาพรวมโหลดต่อไตรมาส 2569 / 2570 + filter toolbar (search / Main Group / Priority / year / confirmed) |
| 8 | `/status` | Kanban 6 คอลัมน์ / 9 sub-states · auto-detect "ล่าช้า/ตามแผน" จาก start date · comment ต่อการ์ด |
| 9 | `/issues` | Shared Issue & Bug tracker — บันทึกปัญหา · วิธีแก้ · แจ้ง bug — ทีมเห็น/อัปเดตร่วมกัน realtime |

## 🚀 Local development

```bash
cp .env.local.example .env.local   # (ถ้ายังไม่มี ให้สร้างเอง — ดู Environment ด้านล่าง)
npm install
npm run dev          # http://localhost:3000
```

**Environment variables** (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL       = https://ydwghfjszaxfdifzshik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = <จาก Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY      = <เฉพาะตอนรัน legacy seed scripts — local เท่านั้น>
```

ถ้าไม่ตั้งค่า Supabase แอปยังรันได้ (shared state จะ fallback เป็น localStorage-only)

## 🔄 Rebuild local data

ข้อมูล 1,333 โครงการ + 1,449 จัดซื้ออยู่ใน `data/*.json` (commit ไว้แล้ว) — สร้างใหม่จาก extraction ต้นทางของ parent project ด้วย:

```bash
npm run data:build   # อ่าน ../output/extraction/*.json + ../2568 Project list/*.xlsx → data/*.json
```

> Legacy: `npm run seed:all` / `seed:projects` / `seed:history` ยังอยู่ แต่ใช้เพื่อ push ข้อมูลขึ้นตาราง Supabase เดิม ซึ่ง **แอปปัจจุบันไม่ได้อ่านแล้ว** — ปกติไม่ต้องรัน

## ☁️ Deploy on Vercel

1. **Import repo** → https://vercel.com/new
2. **Root directory** → `web`
3. **Framework preset** → Next.js (auto-detected)
4. **Environment variables** (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ydwghfjszaxfdifzshik.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<from Supabase dashboard>`
   - *(อย่าใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน Vercel — server-side key ต้องไม่หลุดถึง browser; seed เป็น local เท่านั้น)*
5. **Deploy** → Vercel รัน `npm run build` ให้อัตโนมัติ
6. RLS บน `app_state` เปิด read/write สาธารณะ (single-workspace) — ดู note ใน Security ด้านล่าง

## 📁 Project structure

```
app/                 home + 9 routes (methodology, projects, groups, history-2568,
                     filter, selected, timeline, status, issues)
components/
  brand/             MetierLogo, MetierSymbol
  ui/                Button, Card, Badge, … (shadcn-style primitives)
  <route>/           explorer/board component ต่อหน้า (filter, groups, selected, …)
  site-header.tsx, site-footer.tsx, sync-status.tsx, team-picks-seeder.tsx
  year-budget-strip.tsx, kpi-card.tsx
data/                projects.json (1,333) + procurement_2568.json (1,449) — static, commit แล้ว
lib/
  utils.ts           cn(), formatBaht(), formatBahtCompact()
  shared-state.ts    useSyncedState() — localStorage + Supabase app_state + realtime
  supabase/          client.ts (browser) + server.ts (RSC)
  data/              projects.ts, history.ts, history-derived.ts, metier-taxonomy.ts,
                     name-fixes.ts, pdf-labels.ts, schedule.ts, stats.ts, team-picks.ts
scripts/
  build-local-data.ts  สร้าง data/*.json จาก extraction ต้นทาง (npm run data:build)
  seed-projects.ts / seed-history.ts  legacy — push ขึ้นตาราง Supabase เดิม
supabase/migrations/
  0001_init.sql            7 tables + enums + RLS + view (legacy scaffold)
  0002_app_state.sql       app_state key/value store (ตารางที่แอปใช้จริง)
  0003_app_state_realtime.sql  เปิด Realtime publication + REPLICA IDENTITY FULL
types/db.ts          ProjectRecord, ProcurementRecord, Selection, ProjectStatus (9 ค่า)
```

## 🗄 Supabase tables

| Table | สถานะ | Purpose |
|---|---|---|
| `app_state` | **ใช้งานจริง** | key/value `jsonb` เดียวเก็บ shared state ทั้งหมด + Realtime |
| `projects`, `procurement_history_2568`, `selections`, `tor_matches`, `sow_components`, `project_confirmations`, `project_status_timeline` | legacy | scaffold เดิมจาก `0001_init.sql` — แอปปัจจุบันไม่ได้ query |

## 🎨 Brand CI

สามสีเท่านั้น: `#ff5008` (accent), `#000000`, `#ffffff`. IBM Plex Sans Thai. Orange ใช้เป็น accent เท่านั้น — ห้ามใช้กับ body copy

## 🔐 Security note

`app_state` เปิด RLS แบบ public read/write โดยตั้งใจ (single-workspace สำหรับทีม Metier + คลองหลวง ไม่มี auth) — ใครมี URL ก็แก้ shared state ได้ ถ้าต้องการจำกัดสิทธิ์/แยก workspace ต้องเพิ่ม Auth + `workspace_id` (ดู comment ใน `0002_app_state.sql`)

## 📜 License

Internal / proprietary — Metier (Thailand) Co., Ltd.
