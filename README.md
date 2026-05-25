# คลองหลวง 2026 · Metier Opportunity Webapp

Interactive web app เพื่อวิเคราะห์โครงการในแผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง พ.ศ. 2566–2570 และคัดเลือกโครงการที่ Metier (Thailand) Co., Ltd. มีโอกาสรับงาน

**Repo:** https://github.com/metierthailand579-ctrl/metier-klongluang

---

## 🏛 Stack

- **Next.js 16** (App Router · TypeScript · Tailwind v4)
- **shadcn/ui primitives** (Radix) + **Framer Motion** + **Recharts** + **Lucide**
- **Supabase** (Postgres + Auth + RLS)
- IBM Plex Sans Thai · Metier brand CI (`#ff5008` orange)

## 🗺 หน้าหลัก (7)

| # | Route | เนื้อหา |
|---|---|---|
| 1 | `/methodology` | Storytelling วิธีทำงาน S1→S11 (timeline + animations) |
| 2 | `/projects` | 1,333 โครงการ — DataTable + KPI cards |
| 3 | `/groups` | Treemap / Sunburst ของ Work Category L1/L2 + Metier Service Area |
| 4 | `/history-2568` | 1,449 รายการจัดซื้อจัดจ้างจริง ปี 2568 (reference) |
| 5 | `/filter` | Filter + ติ๊กเลือก + live summary (มูลค่ารวม, จำนวน, mix) |
| 6 | `/selected` | โครงการที่เลือก + TOR matching + ร่าง SOW + ปุ่ม Confirm |
| 7 | `/status` | Kanban: ร่าง TOR → เปิดโครงการ → ยื่น → ดำเนินงาน → เสร็จ |

## 🚀 Local development

```bash
cp .env.local.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev          # http://localhost:3000
```

## 🌱 Seed the database (one-time)

After applying `supabase/migrations/0001_init.sql` (run via Supabase Dashboard SQL editor or MCP):

```bash
npm run seed:all     # projects (1,333) + procurement_history_2568 (1,449)
# OR
npm run seed:projects
npm run seed:history
```

Source files are read from the parent folder (`../output/extraction/ALL_records_v2.json` and `../2568 Project list/...xlsx`). Seed scripts use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

## ☁️ Deploy on Vercel

1. **Import repo** → https://vercel.com/new
2. **Root directory** → `web`
3. **Framework preset** → Next.js (auto-detected)
4. **Environment variables** (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://kvnbtsadnnjszdiktbhb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<from Supabase dashboard>`
   - *(do NOT add `SUPABASE_SERVICE_ROLE_KEY` to Vercel — server-side keys must never reach the browser; seeding is local only)*
5. **Deploy** → Vercel runs `npm run build` automatically
6. Supabase RLS protects writes; reads on `projects` and `procurement_history_2568` are public

## 📁 Project structure

```
app/                 home + 7 routes
components/
  brand/             MetierLogo, MetierSymbol
  ui/                Button, Card, Badge (shadcn-style primitives)
  site-header.tsx, site-footer.tsx, placeholder-page.tsx
lib/
  utils.ts           cn(), formatBaht(), formatBahtCompact()
  supabase/          client.ts (browser) + server.ts (RSC)
public/brand/        7 Metier PNG logos
scripts/
  seed-projects.ts   load ALL_records_v2.json → projects
  seed-history.ts    load XLSX-04 clean sheet → procurement_history_2568
supabase/
  migrations/0001_init.sql   7 tables + enums + RLS + view
types/db.ts          ProjectRecord, ProcurementRecord, Selection, ProjectStatus
```

## 🗄 Database schema (7 tables)

| Table | Rows | Purpose |
|---|---|---|
| `projects` | 1,333 | Master record of every planned project (read-public) |
| `procurement_history_2568` | 1,449 | Real procurement records 2567–2569 (read-public) |
| `selections` | dynamic | Metier-side picks: user_selected (TRUE/FALSE/TBD) + fit score |
| `tor_matches` | dynamic | Fuzzy matches of selected → historical procurements |
| `sow_components` | dynamic | SOW draft items per selected project |
| `project_confirmations` | dynamic | เทศบาลคลองหลวง confirms via UI |
| `project_status_timeline` | dynamic | Kanban status changes |

View `v_project_full` joins all 7 tables for the Selected/Status pages.

## 🎨 Brand CI

Three colors only: `#ff5008` (accent), `#000000`, `#ffffff`. IBM Plex Sans Thai. Orange used as accent only — never for body copy.

## 📜 License

Internal / proprietary — Metier (Thailand) Co., Ltd.
