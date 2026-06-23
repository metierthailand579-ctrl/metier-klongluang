---
name: คลองหลวง 2026 · Metier Opportunity Webapp
description: เครื่องมือภายในทีมสำหรับคัดเลือกโครงการภาครัฐและติดตาม TOR → ส่งมอบ แบบ realtime
colors:
  metier-orange: "#ff5008"
  ink: "#0a0a0a"
  pure-black: "#000000"
  surface-white: "#ffffff"
  surface-subtle: "#f5f5f5"
  border: "#e5e7eb"
  muted-fg: "#4b5563"
  muted: "#6b7280"
  neutral-300: "#d4d4d4"
  neutral-400: "#a3a3a3"
  success: "#047857"
  warning: "#b45309"
  # Semantic / data-encoding palette — encode DATA (status, schedule, priority,
  # category), never chrome. Governed by The Data-Color Rule (see Colors §).
  status-late: "#dc2626"
  status-due-soon: "#d97706"
  status-on-track: "#15803d"
  status-ahead: "#0369a1"
  status-done: "#10b981"
  status-active: "#0ea5e9"
  status-medium: "#f59e0b"
  status-pending: "#fbbf24"
  review-cyan: "#0891b2"
  neutral-slate: "#94a3b8"
  slate-600: "#64748b"
  slate-700: "#334155"
  slate-500: "#475569"
  violet: "#7c3aed"
  purple: "#a855f7"
  purple-deep: "#9333ea"
  blue-royal: "#1d4ed8"
  teal: "#0f766e"
  teal-2: "#0d9488"
  brown: "#92400e"
typography:
  display:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "IBM Plex Sans Thai, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "20px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.metier-orange}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  badge-default:
    backgroundColor: "{colors.metier-orange}"
    textColor: "{colors.surface-white}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  badge-muted:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.muted-fg}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.metier-orange}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
---

# Design System: คลองหลวง 2026 · Metier Opportunity Webapp

## 1. Overview

**Creative North Star: "The Situation Room"**

นี่คือแผงสถานการณ์ของทีม — ที่ที่ข้อมูลภาครัฐปริมาณมหาศาล (1,333 โครงการ + 1,449 รายการจัดซื้อ) ถูกกลั่นจนนิ่งพอจะตัดสินใจรับงานได้ ทุกหน้าจอต้องให้ความรู้สึก *แม่นยำ เห็นสถานะจริงทุกอย่าง พร้อมตัดสินใจ* ไม่ใช่หน้าโชว์ ดีไซน์รับใช้การทำงาน ไม่ใช่กลับกัน

ระบบนี้เกือบไม่มีสี: พื้นขาวสะอาด ตัวอักษรเกือบดำ และส้ม Metier `#ff5008` เพียงหยดเดียวที่ทำหน้าที่ "ตอนนี้ดูตรงนี้" ความเงียบคือฟีเจอร์ — chrome ถอยให้ข้อมูลเด่น ส้มจึงมีน้ำหนักทุกครั้งที่ปรากฏ คอมโพเนนต์ทุกตัว **precise & quiet**: ขอบคม เส้นบาง เงาน้อย ไม่มีของประดับที่ไม่ช่วยตัดสินใจ

ระบบนี้ **ปฏิเสธ** ทั้งสี่แบบที่ระบุใน PRODUCT.md: SaaS dashboard โหล ๆ (เลขใหญ่ + gradient + การ์ดไอคอนเรียงพรืด), พอร์ทัลราชการรก ๆ (ตารางแน่นจนอ่านไม่ออก), แอปคอนซูเมอร์เล่น ๆ (สีจัด การ์ตูน), และ enterprise หนัก ๆ (เทอะทะ ดูเก่า) เป้าหมายคือดูเป็นเครื่องมือเฉพาะทางที่ "ตั้งใจออกแบบ" ไม่ใช่เทมเพลตสำเร็จรูป

**Key Characteristics:**
- พื้นขาว ตัวอักษรเกือบดำ ส้มเป็น accent เดียว ใช้น้อยแต่หนักแน่น
- Flat-by-default: โครงสร้างมาจากเส้นขอบ + เงาบางมาก ไม่ใช่เงาหนัก
- ความหนาแน่นรับใช้ความเข้าใจ ไม่ใช่ความรก
- IBM Plex Sans Thai อ่านง่ายทุกช่วงวัย (WCAG AA + เน้นตัวใหญ่)
- สถานะจริงเสมอ: sync status, ลำดับความสำคัญ, สถานะ Kanban เห็นได้ทันที

## 2. Colors

พาเลตต์เกือบ monochrome: ขาว–เกือบดำ–เทา โดยมีส้ม Metier เป็นเสียงเดียวที่กล้าพูด

### Primary
- **Metier Orange** (`#ff5008`): accent เดียวของระบบ ใช้กับ primary action, สถานะ active ของ nav, badge สำคัญ, focus ring เท่านั้น **ห้ามแตะ body copy** ความหายากคือพลังของมัน

### Neutral
- **Ink** (`#0a0a0a`): สีตัวอักษรหลักบนพื้นขาว — เกือบดำสนิทเพื่อ contrast สูงสุด
- **Pure Black** (`#000000`): ส่วนหนึ่งของ CI สำหรับโลโก้/องค์ประกอบแบรนด์ ไม่ใช่สี text เริ่มต้น
- **Surface White** (`#ffffff`): พื้นหลัง หน้าเว็บ และการ์ด — แบนสนิท ไม่มี tint
- **Surface Subtle** (`#f5f5f5`): พื้นรองสำหรับ ghost/secondary button, hover, badge เงียบ
- **Border** (`#e5e7eb`): เส้นขอบและ divider ทั้งหมด — โครงสร้างหลักของระบบที่เลือก flat
- **Muted FG** (`#4b5563`): ตัวอักษรรอง/คำอธิบาย — เข้มพอผ่าน AA บนพื้นขาว
- **Muted** (`#6b7280`): placeholder และ label จาง ⚠️ ระวัง: บนพื้น tint อ่อนอาจไม่ถึง 4.5:1 — ตรวจทุกครั้ง

### Tertiary (สถานะเท่านั้น — ไม่ใช่สีแบรนด์)
- **Success** (`#047857` บนพื้น emerald tint ~15%): สถานะ "สำเร็จ/ตามแผน"
- **Warning** (`#b45309` บนพื้น amber tint ~15%): สถานะ "เตือน/ล่าช้า"

### Semantic & Data-Encoding Palette
สีกลุ่มนี้ **เข้ารหัสข้อมูล** ไม่ใช่ตกแต่ง — ปรากฏเฉพาะบน status glyph, สถานะตารางเวลา, ป้าย priority, หัวคอลัมน์ Kanban และ chip หมวดหมู่ ผูกกับ legend เสมอ ห้ามใช้กับพื้นหลัง/body text/layout

- **Schedule states:** late `#dc2626` · due-soon `#d97706` · on-track `#15803d` · ahead `#0369a1` · done `#10b981` · not-started `#94a3b8`
- **Workflow sub-status:** active `#0ea5e9` · on-hold `#94a3b8` · blocked `#dc2626` · ready `#10b981`
- **Priority:** urgent `#dc2626` · high `#ff5008` · medium `#f59e0b` · low `#64748b`
- **Kanban columns (9) / Main groups (11):** categorical ramp ข้าม slate/cyan/sky/violet/purple/amber/teal/brown (ดู `COLUMN_COLORS` ใน status-kanban, `GROUP_COLOR` ใน metier-taxonomy)

### Named Rules
**The One Voice Rule.** ส้ม `#ff5008` ปรากฏได้ ≤10% ของพื้นที่จอใด ๆ มันคือเสียงเดียวที่ดังได้ ถ้าทุกอย่างเป็นส้ม แปลว่าไม่มีอะไรสำคัญ

**The Status-Only Color Rule.** เขียว/เหลือง/แดงมีไว้สื่อ "สถานะของข้อมูล" เท่านั้น (สำเร็จ/เตือน/ล่าช้า) ห้ามใช้เป็นสีตกแต่ง

**The Data-Color Rule.** สีจาก Semantic palette ใช้ได้เฉพาะเมื่อมีความหมายผูกกับ legend (status/priority/category) ถ้าใช้เพื่อความสวยล้วน = ผิด ให้กลับไปใช้ neutral UI palette แทน

## 3. Typography

**Display / Body / Label Font:** IBM Plex Sans Thai (fallback: system-ui, sans-serif)
**Mono:** ui-monospace, SFMono-Regular — เฉพาะตัวเลขแบบ tabular (จำนวนนับ, งบประมาณ)

**Character:** ฟอนต์เดียวทั้งระบบ ทำงานด้วย *น้ำหนัก* ไม่ใช่การผสมฟอนต์ — หัวข้อหนา (700) คมและกระชับ, เนื้อหาปกติ (400) อ่านสบาย ความเป็นมืออาชีพมาจากความสม่ำเสมอ ไม่ใช่ลูกเล่น

### Hierarchy
- **Display** (700, 32px, line-height 1.2, letter-spacing -0.01em): หัวหน้า/หัวข้อหลักของหน้า
- **Headline** (700, 24px, 1.25, -0.01em): หัวข้อ section
- **Title** (700, 18px, 1.3): หัวการ์ด, หัวกลุ่มข้อมูล
- **Body** (400, 16px, 1.6): เนื้อหาหลัก — line-height สูงเผื่อสระบน/ล่างภาษาไทย ความยาวบรรทัด 65–75ch
- **Label** (500, 14px, 1.4): ปุ่ม, nav, input, ฉลาก
- **Caption** (500, 12px, 1.4): badge, meta, ตัวเลขนับ

### Named Rules
**The Weight-400 Floor Rule.** Body copy ห้ามบางกว่า 400 IBM Plex Sans Thai ที่ weight 300 บางเกินไปสำหรับสระไทยในขนาดเล็ก ⚠️ โค้ดปัจจุบันตั้ง `body { font-weight: 300 }` ใน globals.css — ถือเป็น deviation ที่ต้องแก้เป็น 400

**The One-Family Rule.** ฟอนต์เดียวทั้งระบบ ลำดับชั้นมาจากน้ำหนัก+ขนาด ห้ามเพิ่มฟอนต์คู่ที่หน้าตาใกล้กัน

## 4. Elevation

ระบบนี้ **flat-by-default** ความลึกมาจากเส้นขอบ `#e5e7eb` และเงาที่บางมาก ไม่ใช่เงาฟุ้งหรือ glassmorphism เลเยอร์ถูกสื่อด้วยพื้น (ขาว vs `#f5f5f5`) และเส้นคั่น มากกว่าด้วยเงา

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`): เงา `shadow-sm` บาง ๆ ใต้การ์ด แค่พอแยกจากพื้น
- **Header blur** (`background: rgba(255,255,255,0.85); backdrop-filter: blur(...)`): เฉพาะ sticky header เพื่อให้เนื้อหาเลื่อนผ่านได้อ่านออก — นี่คือการใช้ blur แบบมีเหตุผล ไม่ใช่ glass ตกแต่ง
- **Focus ring** (`outline: 2px solid #ff5008; outline-offset: 2px`): วงโฟกัสส้มสำหรับ keyboard navigation ทุก interactive

### Named Rules
**The Flat-By-Default Rule.** พื้นผิวแบนตอนพัก เงาปรากฏเฉพาะเมื่อตอบสนองสถานะ (hover, focus) ถ้าเห็นเงาหนา ๆ ใต้ทุกอย่าง แปลว่าหลุดจากระบบ

## 5. Components

ทุกคอมโพเนนต์ **precise & quiet**: chrome น้อย ให้ข้อมูลเด่น ขอบคม เส้นบาง

### Buttons
- **Shape:** มุมโค้งเบา (8px / `rounded-md`), สูง 36px (md), text 14px น้ำหนัก 500
- **Primary:** พื้นส้ม `#ff5008` ตัวอักษรขาว, hover เพิ่มความสว่าง (`brightness-110`), active หรี่ลง (`brightness-95`) — สำหรับ action สำคัญที่สุดของหน้าเท่านั้น
- **Outline:** ขอบ `#e5e7eb` พื้นโปร่ง ตัวอักษร ink, hover พื้น `#f5f5f5`
- **Ghost:** ไม่มีขอบ ตัวอักษร muted-fg, hover พื้น `#f5f5f5` + ตัวอักษรเข้มขึ้น
- **Secondary:** พื้น `#f5f5f5` ตัวอักษร ink, hover หรี่เล็กน้อย
- **Link:** ตัวอักษรส้ม underline เมื่อ hover
- **Focus:** อาศัย global focus ring ส้ม (ปุ่มตั้ง `focus-visible:outline-none` แล้วให้ ring ระดับ global ทำงาน)
- **Sizes:** sm (32px) / md (36px) / lg (40px, text 15px) / icon (36×36)

### Chips / Badges
- **Shape:** เม็ดกลม (`rounded-full`), px 10 py 2, text 12px น้ำหนัก 500
- **Default:** พื้นส้ม ตัวอักษรขาว — สำหรับนับ/ป้ายสำคัญ
- **Outline:** ขอบ border ตัวอักษร ink
- **Muted:** พื้น `#f5f5f5` ตัวอักษร muted-fg — ป้ายเงียบ
- **Success / Warning:** พื้น tint 15% (emerald/amber) ตัวอักษรเข้ม — สื่อสถานะข้อมูลเท่านั้น

### Cards / Containers
- **Corner Style:** มุมโค้งชัด (20px / `rounded-xl`)
- **Background:** ขาว `#ffffff`
- **Shadow Strategy:** `shadow-sm` เท่านั้น (ดู Elevation)
- **Border:** เส้น `#e5e7eb` 1px รอบด้าน — โครงสร้างหลัก
- **Internal Padding:** 20px (`p-5`); header `pb-3`, footer มีเส้นคั่นบน
- **ห้าม:** การ์ดซ้อนการ์ด, การ์ดไอคอน+หัวข้อ+ข้อความขนาดเท่ากันเรียงพรืด

### Inputs / Fields
- **Style:** สูง 36px, ขอบ `#e5e7eb`, พื้นขาว, มุม 8px, text 14px
- **Placeholder:** สี muted `#6b7280` — ตรวจ contrast ให้ถึง 4.5:1
- **Focus:** ขอบเปลี่ยนเป็นส้ม (`focus:border-metier-orange`) + global focus ring
- **Disabled:** `opacity-50` + cursor not-allowed

### Navigation
- **Style:** sticky top, พื้นขาว 85% + backdrop-blur, เส้นขอบล่าง, max-width 1440px
- **Items:** มุม 8px, px 12 py 6, text 14px
- **Active:** พื้นส้ม ตัวอักษรขาว (เด่นชัดว่าอยู่หน้าไหน)
- **Inactive:** ตัวอักษร muted-fg, hover → ตัวอักษรเข้ม + พื้น `#f5f5f5`
- **Count badge:** เม็ดกลม tabular-nums สลับสีส้ม/ขาวตามสถานะ active

### Signature: Kanban Status Board
บอร์ด `/status` 6 คอลัมน์ / 9 sub-states คือคอมโพเนนต์เด่นของแอป สื่อสถานะ "ล่าช้า/ตามแผน" ด้วยสี success/warning (ไม่ใช่สีตกแต่ง) แต่ละการ์ดต้องอ่านสถานะออกในวินาทีเดียว ⚠️ ปัจจุบันการ์ดบางใบใช้ `border-left: 3px solid` (side-stripe) ซึ่งเป็น absolute ban — ต้องแทนด้วยเส้นขอบเต็ม, พื้น tint, หรือ badge สถานะ

## 6. Do's and Don'ts

### Do:
- **Do** ใช้ส้ม `#ff5008` ≤10% ของจอ เฉพาะ primary action / active / focus / badge สำคัญ
- **Do** ตั้ง body weight ≥ 400 และ line-height ≥ 1.6 เพื่อสระไทยและการอ่านหลายช่วงวัย
- **Do** สื่อความลึกด้วยเส้นขอบ `#e5e7eb` + `shadow-sm` (flat-by-default)
- **Do** ตรวจ contrast: body ≥ 4.5:1, large text ≥ 3:1 รวม muted/placeholder
- **Do** ให้ทุก interactive มี orange focus ring และมีทางเลือก `prefers-reduced-motion`
- **Do** ใช้สีเขียว/เหลืองเพื่อสื่อ "สถานะข้อมูล" เท่านั้น (สำเร็จ/เตือน/ล่าช้า)

### Don't:
- **Don't** ใช้ `border-left`/`border-right` > 1px เป็นแถบสีบนการ์ด/รายการ (side-stripe — absolute ban; มีอยู่จริงใน status-kanban.tsx + timeline-view.tsx ต้องแก้)
- **Don't** ใช้ gradient text (`background-clip: text`) หรือ gradient เป็น accent
- **Don't** ใช้ glassmorphism เป็นค่าเริ่มต้น (header blur คือข้อยกเว้นที่มีเหตุผลเดียว)
- **Don't** ทำ hero-metric template: เลขใหญ่ + label เล็ก + gradient
- **Don't** เรียงการ์ดไอคอน+หัวข้อ+ข้อความขนาดเท่ากันเป็นพรืด หรือซ้อนการ์ดในการ์ด
- **Don't** ใส่ eyebrow ตัวเล็ก uppercase tracking เหนือทุก section
- **Don't** แตะ body copy ด้วยสีส้ม
- **Don't** ทำให้หน้าตาเหมือน SaaS dashboard โหล ๆ, พอร์ทัลราชการรก ๆ, แอปคอนซูเมอร์เล่น ๆ, หรือ enterprise หนัก ๆ (anti-references ทั้งสี่จาก PRODUCT.md)
