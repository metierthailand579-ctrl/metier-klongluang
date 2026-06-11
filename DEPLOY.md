# DEPLOY · คลองหลวง 2026

End-to-end deploy checklist สำหรับขึ้น GitHub + Vercel + Supabase

---

## 1. Push to GitHub (ครั้งแรกเท่านั้น)

```bash
cd <repo>/web
git push -u origin main
```

macOS จะ pop up browser dialog ให้ login GitHub ครั้งเดียว → keep in Keychain

---

## 2. Supabase setup

### 2.1 Authenticate MCP (ใน Claude session)

```
claude /mcp
```
เลือก `supabase` → Authenticate → browser login

### 2.2 Apply schema

ทางเลือก **A. ใช้ Supabase MCP** (เมื่อ authenticated แล้ว): Claude จะ run migration ให้

ทางเลือก **B. รันมือใน Dashboard**:
1. https://supabase.com/dashboard/project/ydwghfjszaxfdifzshik/sql/new
2. paste เนื้อหา `supabase/migrations/0001_init.sql`
3. กด Run

### 2.3 Copy keys → `.env.local`

```bash
cp .env.local.example .env.local
```
แก้ค่า:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://ydwghfjszaxfdifzshik.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← Supabase Dashboard → Settings → API → anon public
- `SUPABASE_SERVICE_ROLE_KEY` ← Supabase Dashboard → Settings → API → service_role (เก็บลับ)

### 2.4 Seed (local one-time)

```bash
npm install
npm run seed:all
```
จะใส่:
- 1,333 records → `projects`
- ~1,449 records → `procurement_history_2568`

---

## 3. Vercel deploy

1. https://vercel.com/new → Import Git Repository
2. เลือก `metierthailand579-ctrl/metier-klongluang`
3. **Root Directory** → `web` (สำคัญ — repo มีไฟล์อื่นด้วย)
4. Framework Preset → Next.js (auto)
5. **Environment Variables** → เพิ่ม 2 ตัว (anon key only):
   ```
   NEXT_PUBLIC_SUPABASE_URL         = https://ydwghfjszaxfdifzshik.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY    = <จาก Supabase>
   ```
   ⚠️ **อย่า** ใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน Vercel — เป็น server-side seed key ใช้ local เท่านั้น
6. Deploy

หลังจาก deploy ทุกครั้งที่ commit ใหม่ push ไป main, Vercel จะ auto-deploy

---

## 4. Subsequent changes

```bash
cd web
git add -A && git commit -m "..."
git push
```

Schema migration ใหม่ → เพิ่มไฟล์ใน `supabase/migrations/0002_*.sql` → run ใน Dashboard / MCP

Data update → เปลี่ยน extraction ต้นทางแล้วรัน `npm run data:build` (สร้าง `data/*.json` ใหม่ ซึ่งแอปอ่านจริง) — `seed:*` เป็น legacy push ขึ้นตาราง Supabase เดิมที่แอปไม่ได้อ่านแล้ว

> หมายเหตุ: ตอนนี้แอปอ่านข้อมูลโครงการจาก `data/*.json` ในเครื่อง และใช้ Supabase แค่ตาราง `app_state` (shared state + realtime) ดู README ส่วน "Data architecture"

---

## 5. Troubleshooting

| ปัญหา | แก้ |
|---|---|
| `git push` ขึ้น 403/permission | ตรวจสิทธิ์เป็น collaborator ใน metierthailand579-ctrl/metier-klongluang |
| Seed ขึ้น `permission denied` | RLS — service_role_key ต้องถูก, ใช้ `SUPABASE_SERVICE_ROLE_KEY` (ไม่ใช่ anon) |
| Vercel build fail `Module not found` | Root Directory ตั้งเป็น `web` หรือยัง |
| `prepass` หรือ React 19 warning | Next.js 16 ใช้ React 19; ไม่ต้องแก้ |
| Thai text ไม่ขึ้น/เป็นกรอบ | ตรวจว่า `IBM_Plex_Sans_Thai` import ถูก (`subsets: ['thai', 'latin']`) |
