// OCR / extraction typos cleaned at runtime so the original projects.json
// stays untouched as a faithful copy of what the source PDFs say. Any
// downstream consumer (display, search, export) gets the clean values.

// ---------------------------------------------------------------------------
// Departments — collapse OCR variants onto the real division names.
// ---------------------------------------------------------------------------
const DEPT_FIXES: Record<string, string> = {
  // กองช่าง (engineering / civil works)
  "กองข่าง": "กองช่าง",
  "กองขําง": "กองช่าง",
  "กองจ่าง": "กองช่าง",
  // กองคลัง (finance)
  "กองตลัง": "กองคลัง",
  "กองศลัง": "กองคลัง",
  // กองสาธารณสุข
  "กองสาธารณสุขา": "กองสาธารณสุขฯ",
  "กองสาธารณสุร": "กองสาธารณสุข",
  "กองสาสารณสุข": "กองสาธารณสุข",
  // กองสวัสดิการ
  "กองสวัสดีการ": "กองสวัสดิการ",
  // สำนักปลัด — Thai has two valid spellings of สำ/สํา; normalise to the
  // common form
  "สํานักปลัด": "สำนักปลัด",
};

export function cleanDept(s: string | null | undefined): string | null {
  if (!s) return s ?? null;
  return DEPT_FIXES[s] ?? s;
}

// ---------------------------------------------------------------------------
// Project name typos — substring replacements applied in order.
// Each is a known OCR misread from the source PDF extraction.
// ---------------------------------------------------------------------------
const NAME_REPLACEMENTS: Array<[string | RegExp, string]> = [
  // พระ → พระเกียรติ family (ห/ท mis-read as พ)
  [/หระเกียรติ/g, "พระเกียรติ"],
  [/ทระเกียรติ/g, "พระเกียรติ"],
  [/เทิดหระ/g, "เทิดพระ"],

  // ประเพณี family (ห mis-read as พ, ม mis-read as ณ)
  [/ประเหณี/g, "ประเพณี"],
  [/ประเพมี/g, "ประเพณี"],
  [/ประเหมี/g, "ประเพณี"],

  // ปีใหม่ (ป mis-read as บ)
  [/วันขึ้นบีใหม่/g, "วันขึ้นปีใหม่"],

  // ร้องเพลง (พ mis-read as ห)
  [/ร้องเหลง/g, "ร้องเพลง"],

  // กีฬา (กิ → กี)
  [/กิฬา/g, "กีฬา"],

  // สัมพันธ์ (ส mis-read as สิม + ก/ก)
  [/สิมทันธ์/g, "สัมพันธ์"],
  [/สิมพันธ์/g, "สัมพันธ์"],

  // พัฒนา (พ mis-read as ห)
  [/หัฒนา/g, "พัฒนา"],

  // พนักงาน (พ mis-read as ห)
  [/หนักงาน/g, "พนักงาน"],

  // มัลติมีเดีย / multimedia
  [/มัสติมิเดีย/g, "มัลติมีเดีย"],
  [/มัลติมิเดีย/g, "มัลติมีเดีย"],
  [/มัลติมีเตีย/g, "มัลติมีเดีย"],

  // ศึกษา (รถ → ศึ)
  [/ศุบย์พัฒนา/g, "ศูนย์พัฒนา"],

  // เครื่อง... อึ/อึ๊/อึ๋ in keyboard-row typos → เก้าอี้
  [/เก้าอึ[๊๋]?/g, "เก้าอี้"],
  [/เก้าอิ์/g, "เก้าอี้"],

  // โต๊ะวางคอมพิวเตอร์ + variant prefixes ทร้อม / หร้อม → พร้อม
  [/(ทร้อม|หร้อม)เก้า/g, "พร้อมเก้า"],
];

export function cleanProjectName(s: string | null | undefined): string {
  if (!s) return s ?? "";
  let out = s;
  for (const [find, rep] of NAME_REPLACEMENTS) {
    out = out.replace(find, rep);
  }
  return out;
}
