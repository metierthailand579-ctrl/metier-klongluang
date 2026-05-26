import type { ProcurementRecord } from "@/types/db";

// Procurement method is encoded in project_name text (e.g.
// "...โดยวิธีเฉพาะเจาะจง (เลขที่โครงการ : ...)"), not in a structured field.
const METHOD_PATTERNS: Array<[ProcurementMethod, RegExp]> = [
  ["e-bidding", /e[- ]?bidding|ประกวดราคาอิเล็กทรอนิกส์|วิธีประกวดราคา/i],
  ["คัดเลือก", /โดยวิธีคัดเลือก/],
  ["เฉพาะเจาะจง", /โดยวิธีเฉพาะเจาะจง/],
  ["ตกลงราคา", /โดยวิธีตกลงราคา/],
  ["e-market", /e[- ]?market|ตลาดอิเล็กทรอนิกส์/i],
];

export type ProcurementMethod =
  | "เฉพาะเจาะจง"
  | "e-bidding"
  | "คัดเลือก"
  | "ตกลงราคา"
  | "e-market"
  | "อื่น ๆ";

export const METHOD_COLORS: Record<ProcurementMethod, string> = {
  "เฉพาะเจาะจง": "#475569",
  "e-bidding": "#ff5008",
  "คัดเลือก": "#7c3aed",
  "ตกลงราคา": "#0f766e",
  "e-market": "#0369a1",
  "อื่น ๆ": "#94a3b8",
};

export function getProcurementMethod(r: ProcurementRecord): ProcurementMethod {
  const n = r.project_name ?? "";
  for (const [label, pat] of METHOD_PATTERNS) {
    if (pat.test(n)) return label;
  }
  return "อื่น ๆ";
}

// Department lives inside parenthesised qualifiers in the name, e.g.
// "...ซ่อมเครื่องปรับอากาศ ... (กองช่าง) โดยวิธีเฉพาะเจาะจง". We grab the
// LAST such qualifier (the closest to the procurement-method phrase) because
// the early ones are often the activity location, not the buyer.
const DEPT_PAT = /\((กอง[^)]+|งาน[^)]+|สำนัก[^)]+|ฝ่าย[^)]+|ศูนย์[^)]+)\)/g;

export function getDepartment(r: ProcurementRecord): string {
  const n = r.project_name ?? "";
  const matches = Array.from(n.matchAll(DEPT_PAT)).map((m) => m[1]);
  if (matches.length === 0) return "(ไม่ระบุหน่วยงาน)";
  return normaliseDept(matches[matches.length - 1]);
}

// Normalise the trailing "ฯ" abbreviation variants so they roll up.
const DEPT_ALIASES: Record<string, string> = {
  "กองสาธารณสุข": "กองสาธารณสุขฯ",
  "กองสาธารณสุขและสิ่งแวดล้อม": "กองสาธารณสุขฯ",
  "สำนักปลัด": "สำนักปลัดเทศบาล",
  "สำนักปลัดฯ": "สำนักปลัดเทศบาล",
  "กองยุทธศาสตร์ฯ": "กองยุทธศาสตร์และงบประมาณ",
};
function normaliseDept(name: string): string {
  return DEPT_ALIASES[name] ?? name;
}

// Map a procurement record into one of the 11 main groups used on /groups
// (4 Metier + 7 Municipal) so the two pages line up. Procurement records
// have no work_category_layer1; we infer it from keywords in the name.
//
// Patterns are ordered most-specific first.
const MAIN_GROUP_PATTERNS: Array<[string, RegExp]> = [
  // — MARKETING (strategy / planning) —
  [
    "MARKETING",
    /แผน.*?(สื่อสาร|ประชาสัมพันธ์|การตลาด|แบรนด์)|มาตรฐานการเปิดเผยข้อมูล|ที่ปรึกษา.*?(สื่อสาร|ประชาสัมพันธ์|แบรนด์|การตลาด|นวัตกรรมองค์กร)/,
  ],
  // — MEDIA MANAGEMENT (PR / journals / brochures / signage) —
  [
    "MEDIA MANAGEMENT",
    /แผ่นพับ|วารสาร|ประชาสัมพันธ์(?!.*ก่อสร้าง)|สื่อสิ่งพิมพ์|ป้ายไวนิล|ผู้ช่วยนักประชา/,
  ],
  // — CREATIVE PRODUCTION (events, ceremonies, design, campaigns) —
  [
    "CREATIVE PRODUCTION",
    /จัดงาน|พิธี(?!กร)|เฉลิมพระเกียรติ|เฉลิมพระชนม|เทิดพระเกียรติ|รัฐพิธี|ประเพณี|แห่(เทียน|ผ้า|พระ)|แข่งขัน(กีฬา|ทักษะ|ฟุตบอล)|กีฬา(สานสัมพันธ์|เทศบาล)|^โครงการรณรงค์|สัปดาห์รณรงค์|วันสงกรานต์|วันลอยกระทง|วันปีใหม่|วันสตรี|วันเทศบาล|ออกแบบ.*(โลโก้|กราฟิก)|งานออกแบบ/,
  ],
  // — SOFTWARE DEVELOPMENT (websites / apps / IT systems) —
  [
    "SOFTWARE DEVELOPMENT",
    /เว็บไซต์|website|แอพ|แอป|application|จัดทำระบบ|พัฒนาระบบ|Smart City|แพลตฟอร์ม|CCTV.*ระบบ|ระบบคอมพิวเตอร์.*พัฒนา/i,
  ],
  // — MUNICIPAL: ครุภัณฑ์ (equipment purchases) —
  [
    "7. ครุภัณฑ์",
    /^ซื้อ|ซื้อ(วัสดุ|ครุภัณฑ์|อุปกรณ์|เครื่อง|เก้าอี้|โต๊ะ|เครื่องปรับอากาศ|คอมพิวเตอร์|กล้อง|โปรเจคเตอร์|เครื่องเสียง)/,
  ],
  // — MUNICIPAL: โครงสร้างพื้นฐาน (construction / civil works) —
  [
    "2. โครงสร้างพื้นฐาน",
    /ก่อสร้าง|ปรับปรุง.*?(ถนน|อาคาร|สะพาน|ระบบประปา|ระบบระบายน้ำ|ท่อ|คอนกรีต|แอสฟัลท์|ลาน|สนาม)|วางท่อ|ปูพื้น|ขุดลอก/,
  ],
  // — MUNICIPAL: ซ่อมแซม → also infrastructure (default) —
  [
    "2. โครงสร้างพื้นฐาน",
    /(^|จ้าง.*?)ซ่อม(แซม)?|^จ้าง.*?ปรับปรุง/,
  ],
  // — MUNICIPAL: คุณภาพชีวิต (welfare / health-related services) —
  [
    "3. คุณภาพชีวิต",
    /ผู้สูงอายุ|ผู้พิการ|สวัสดิการ|สาธารณสุข|โรค|วัคซีน|แพทย์ฉุกเฉิน|อนามัย|ปฐมพยาบาล|ติดเชื้อ/,
  ],
  // — MUNICIPAL: สิ่งแวดล้อม / ความสะอาด —
  [
    "6. ความสะอาดและสิ่งแวดล้อม",
    /ขยะ|สิ่งแวดล้อม|คลอง|คูน้ำ|กำจัด.*?(ปลวก|ยุง|หนู)|ทำความสะอาด/,
  ],
  // — MUNICIPAL: การศึกษา —
  [
    "5. การศึกษา ศาสนา กีฬา",
    /การศึกษา|โรงเรียน|นักเรียน|ครู|ค่าย|ทุน(การศึกษา)?|กีฬา|วัด|ศาสนา|ห้องสมุด/,
  ],
  // — MUNICIPAL: ชุมชนเข้มแข็ง —
  [
    "4. ชุมชนเข้มแข็ง",
    /ดับเพลิง|อาสาสมัคร|ป้องกัน.*ภัย|จราจร|เทศกิจ|รปภ|ความปลอดภัย/,
  ],
];

export function getProcurementMainGroup(r: ProcurementRecord): string {
  const n = r.project_name ?? "";
  for (const [group, pat] of MAIN_GROUP_PATTERNS) {
    if (pat.test(n)) return group;
  }
  // Default catch-alls
  if (/^จ้าง/.test(n)) return "1. บริหารจัดการ";
  if (/^เช่า/.test(n)) return "1. บริหารจัดการ";
  return "1. บริหารจัดการ";
}

// Strip the "(เลขที่โครงการ : …)" trailer + parenthesised qualifiers + the
// "โดยวิธี…" phrase from the displayed project name. The raw values stay on
// the record; this is purely for readability in the table.
export function getCleanName(r: ProcurementRecord): string {
  let n = r.project_name ?? "";
  n = n.replace(/\(เลขที่โครงการ\s*:\s*[^)]+\)\s*$/u, "");
  n = n.replace(/\s*โดยวิธี[^()]*$/u, "");
  return n.trim();
}
