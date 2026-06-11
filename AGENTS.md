<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: คลองหลวง 2026 (Metier Opportunity Webapp)

วิเคราะห์แผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง 2566–2570 → คัดเลือกโครงการที่ Metier รับงานได้ → ติดตามตั้งแต่ร่าง TOR ถึงส่งมอบ แบบทำงานร่วมกันเป็นทีม (realtime). ดูรายละเอียดเต็มใน `README.md`.

**Data architecture — อ่านก่อนแก้โค้ดที่แตะข้อมูล (ไม่ตรงกับที่เดาจากโครงสร้าง):**

- ข้อมูล **อ่านอย่างเดียว** (1,333 โครงการ + 1,449 จัดซื้อ) มาจาก **ไฟล์ JSON ในเครื่อง** `data/*.json` ผ่าน `lib/data/*` — **ไม่ได้ดึงจาก Supabase**. rebuild ด้วย `npm run data:build`.
- ข้อมูล **ที่ทีมแก้ร่วมกัน** (เลือกโครงการ, priority, TOR, สถานะ Kanban, comment, issues) เก็บใน Supabase **ตารางเดียวคือ `app_state`** (key/value `jsonb`) + Realtime ผ่าน `lib/shared-state.ts` (`useSyncedState`).
- 7 ตารางใน `supabase/migrations/0001_init.sql` (`projects`, `selections`, …) เป็น **legacy scaffold — แอปไม่ได้ query**. อย่าเขียนโค้ดที่อ่าน/เขียนตารางพวกนี้.
- ไฟล์แนบ TOR ตอนนี้ยัง **local-only** (base64 ใน localStorage) ยังไม่ได้ต่อ Supabase Storage → คนอื่นในทีมไม่เห็น.

**Conventions:** 9 routes ใน `app/`; CI 3 สี (`#ff5008` accent / ดำ / ขาว); IBM Plex Sans Thai; UI/comment ภาษาไทยเป็นหลัก.
