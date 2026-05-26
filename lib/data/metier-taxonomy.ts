import type { ProjectRecord } from "@/types/db";

// ---------------------------------------------------------------------------
// Metier service catalog (4 main groups). These are the services Metier sells.
// ---------------------------------------------------------------------------
export const METIER_TAXONOMY = {
  MARKETING: [
    "Business Development",
    "Brand Strategy",
    "Communication Strategy",
    "Marketing Training",
    "Sales Strategy",
    "Crisis Management",
    "CRM Strategy",
  ],
  "MEDIA MANAGEMENT": [
    "Ads Planning",
    "Ads Optimisation",
    "AI Search Optimisation",
    "SEO Services",
    "KOLs / Influencer",
    "Public Relations",
    "E-Commerce Ads",
    "Email Marketing",
    "Offline Media",
  ],
  "CREATIVE PRODUCTION": [
    "Branding and Identity",
    "Graphic Design",
    "Content Creation",
    "Video & 3D",
    "Event Marketing",
    "Campaign Execution",
  ],
  "SOFTWARE DEVELOPMENT": [
    "UX / UI Design",
    "Brand Website",
    "Mobile Application",
    "E-commerce Website",
    "ERP/CRM Systems",
    "Software Quality Assurance & Cyber Security",
  ],
} as const satisfies Record<string, readonly string[]>;

export type MetierMainGroup = keyof typeof METIER_TAXONOMY;
export const METIER_GROUPS = Object.keys(METIER_TAXONOMY) as MetierMainGroup[];

// ---------------------------------------------------------------------------
// Municipal main groups (the rest of the 1,333 projects). These map 1:1 to
// work_category_layer1 in the source data so the auto-mapping is exact.
// ---------------------------------------------------------------------------
export const MUNICIPAL_GROUPS = [
  "2. โครงสร้างพื้นฐาน",
  "7. ครุภัณฑ์",
  "1. บริหารจัดการ",
  "3. คุณภาพชีวิต",
  "5. การศึกษา ศาสนา กีฬา",
  "6. ความสะอาดและสิ่งแวดล้อม",
  "4. ชุมชนเข้มแข็ง",
] as const;

export type MunicipalGroup = (typeof MUNICIPAL_GROUPS)[number];

// ---------------------------------------------------------------------------
// All main groups (Metier first, municipal next) + unclassified fallback.
// ---------------------------------------------------------------------------
export const UNCLASSIFIED = "ยังไม่จัดหมวด" as const;
export const OTHER_SUB_LABEL = "อื่น ๆ (ยังไม่จัดประเภท)" as const;
/**
 * @deprecated Replaced by per-project mapping into a real main group.
 * Kept as an export so other code (legacy seeds) doesn't crash.
 */
export const NOT_METIER_MAIN = UNCLASSIFIED;

export const ALL_MAIN_GROUPS: readonly string[] = [
  ...METIER_GROUPS,
  ...MUNICIPAL_GROUPS,
  UNCLASSIFIED,
];

/** Kept as alias for the old name used by GroupsExplorer. */
export const MAIN_GROUPS = ALL_MAIN_GROUPS;

export function isMetierGroup(name: string): name is MetierMainGroup {
  return (METIER_GROUPS as readonly string[]).includes(name);
}

export function isMunicipalGroup(name: string): name is MunicipalGroup {
  return (MUNICIPAL_GROUPS as readonly string[]).includes(name);
}

// Brand colors per main group (used in the tagger chips/dropdowns).
export const GROUP_COLOR: Record<string, string> = {
  // Metier
  MARKETING: "#ff5008",
  "MEDIA MANAGEMENT": "#7c3aed",
  "CREATIVE PRODUCTION": "#0f766e",
  "SOFTWARE DEVELOPMENT": "#0369a1",
  // Municipal
  "2. โครงสร้างพื้นฐาน": "#92400e",
  "7. ครุภัณฑ์": "#475569",
  "1. บริหารจัดการ": "#334155",
  "3. คุณภาพชีวิต": "#15803d",
  "5. การศึกษา ศาสนา กีฬา": "#1d4ed8",
  "6. ความสะอาดและสิ่งแวดล้อม": "#0d9488",
  "4. ชุมชนเข้มแข็ง": "#9333ea",
  [UNCLASSIFIED]: "#94a3b8",
};

// ---------------------------------------------------------------------------
// Per-project overrides set manually in the tagger UI. Persisted in localStorage.
// ---------------------------------------------------------------------------
export type GroupOverride = { main: string; sub: string };
export type OverrideMap = Record<string, GroupOverride | undefined>;

// ---------------------------------------------------------------------------
// Auto-mapping rules from the seed JSON's metier_service_area_layer2 values
// onto canonical Metier sub-services. Anything that doesn't match falls into
// OTHER_SUB_LABEL inside its parent main group.
// ---------------------------------------------------------------------------
const METIER_SUB_REMAP: Record<string, { main: MetierMainGroup; sub: string }> = {
  "Event Marketing/Festival": { main: "CREATIVE PRODUCTION", sub: "Event Marketing" },
  "Branding & Display Production": { main: "CREATIVE PRODUCTION", sub: "Branding and Identity" },
  "Graphic Design": { main: "CREATIVE PRODUCTION", sub: "Graphic Design" },
  "Public Relations": { main: "MEDIA MANAGEMENT", sub: "Public Relations" },
  "Public Relations/Digital Media": { main: "MEDIA MANAGEMENT", sub: "Public Relations" },
  "Offline Media": { main: "MEDIA MANAGEMENT", sub: "Offline Media" },
  "Mobile Application": { main: "SOFTWARE DEVELOPMENT", sub: "Mobile Application" },
  "Smart City/Platform Development": { main: "SOFTWARE DEVELOPMENT", sub: OTHER_SUB_LABEL },
  "IT Hardware Procurement (less aligned)": { main: "SOFTWARE DEVELOPMENT", sub: OTHER_SUB_LABEL },
  "Server/IT Infrastructure": { main: "SOFTWARE DEVELOPMENT", sub: OTHER_SUB_LABEL },
  "Production Equipment (less aligned)": { main: "CREATIVE PRODUCTION", sub: OTHER_SUB_LABEL },
};

export type MappedGroup = { main: string; sub: string };

// MARKETING captures the "think / plan / strategise" side of comms work — a
// PR plan, a comms strategy, a brand consultancy. Distribution/execution
// (brochures, journals, LED billboards, sound systems) stays in MEDIA or
// CREATIVE. This check runs BEFORE the Metier auto-tag so it overrides any
// existing MEDIA tag on a planning project.
const MARKETING_PLANNING_PATTERNS: RegExp[] = [
  /แผน(การ)?(สื่อสาร|ประชาสัมพันธ์|การตลาด|แบรนด์|สื่อ)/,
  /(จัดทำ|ทบทวน|พัฒนา)แผน.*?(สื่อสาร|ประชาสัมพันธ์|การตลาด|แบรนด์)/,
  /มาตรฐานการเปิดเผยข้อมูล|กำกับการเผยแพร่/,
  /ที่ปรึกษา.*(สื่อสาร|ประชาสัมพันธ์|แบรนด์|การตลาด|brand|communication)/i,
  /กลยุทธ์.*(สื่อสาร|ประชาสัมพันธ์|การตลาด|แบรนด์)/,
];
const MARKETING_BIZDEV_PATTERNS: RegExp[] = [
  /ที่ปรึกษา.*นวัตกรรมองค์กร/,
  /พัฒนาองค์กร.*ที่ปรึกษา/,
];
const MARKETING_TRAINING_PATTERNS: RegExp[] = [
  /อบรม.*(การตลาด|ผู้ประกอบการ|แบรนด์)/,
  /ฝึกอบรม.*(การตลาด|ผู้ประกอบการ)/,
];
function promoteToMarketing(p: ProjectRecord): MappedGroup | null {
  const n = p.project_name_th ?? "";
  if (MARKETING_PLANNING_PATTERNS.some((r) => r.test(n))) {
    return { main: "MARKETING", sub: "Communication Strategy" };
  }
  if (MARKETING_BIZDEV_PATTERNS.some((r) => r.test(n))) {
    return { main: "MARKETING", sub: "Business Development" };
  }
  if (MARKETING_TRAINING_PATTERNS.some((r) => r.test(n))) {
    return { main: "MARKETING", sub: "Marketing Training" };
  }
  return null;
}

// Promote non-Metier projects into Metier groups when the name shows it's
// actually communications/event/campaign work the Metier team could deliver.
// The seed auto-tagger marked these "NOT_APPLICABLE" because it was too
// conservative — keyword evidence in the project name pulls them in.
const EVENT_PATTERNS: RegExp[] = [
  /จัดงาน/,
  /เทิดพระเกียรติ|เฉลิมพระเกียรติ|เฉลิมพระชนม/,
  /รัฐพิธี/,
  /พิธี(เปิด|ปิด|รับ|บวงสรวง|กตเวที|รำลึก|พระราชทาน)/,
  /แห่(เทียน|ผ้า|พระ)/,
  /แข่งขัน(กีฬา|ทักษะ|ฟุตบอล)/,
  /กีฬา(สานสัมพันธ์|เทศบาล)/,
  /ประกวด/,
  /วัน(สงกรานต์|ลอยกระทง|ปีใหม่|เด็ก|แม่|พ่อ|สตรี|เทศบาล|คลองหลวง|ผู้สูงอายุ|กีฬา)/,
];
const CAMPAIGN_PATTERNS: RegExp[] = [
  /^โครงการรณรงค์/,
  /^โครงการสัปดาห์(รณรงค์|ส่งเสริม)/,
];
function promoteToMetier(p: ProjectRecord): MappedGroup | null {
  const n = p.project_name_th ?? "";
  if (EVENT_PATTERNS.some((r) => r.test(n))) {
    return { main: "CREATIVE PRODUCTION", sub: "Event Marketing" };
  }
  if (CAMPAIGN_PATTERNS.some((r) => r.test(n))) {
    return { main: "CREATIVE PRODUCTION", sub: "Campaign Execution" };
  }
  return null;
}

// Refine the Metier sub-service for known-fuzzy auto-tags. The seed JSON's
// "Smart City/Platform Development" lumps together websites, apps, and
// platforms — split them out so the dropdown shows a sensible canonical sub.
function refineMetierSub(
  main: MetierMainGroup,
  fallback: string,
  p: ProjectRecord,
): string {
  if (main !== "SOFTWARE DEVELOPMENT") return fallback;
  const name = (p.project_name_th ?? "").toLowerCase();
  if (name.includes("เว็บไซต์") || name.includes("website")) return "Brand Website";
  if (
    name.includes("แอปพลิเคชัน") ||
    name.includes("แอพพลิเคชัน") ||
    name.includes("แอปพลิเคชั่น") ||
    name.includes("แอพพลิเคชั่น") ||
    name.includes("แอป") ||
    name.includes("แอพ")
  )
    return "Mobile Application";
  if (
    name.includes("smart") ||
    name.includes("แพลตฟอร์ม") ||
    name.includes("dashboard") ||
    name.includes("นวัตกรรม") ||
    name.includes("ระบบ")
  )
    return "ERP/CRM Systems";
  return fallback;
}

export function mapProjectToGroup(
  p: ProjectRecord,
  overrides?: OverrideMap,
): MappedGroup {
  const ov = overrides?.[p.master_project_id];
  if (ov) return ov;

  const l1 = p.metier_service_area_layer1;
  const l2 = p.metier_service_area_layer2;
  const wc1 = p.work_category_layer1;
  const wc2 = p.work_category_layer2;

  // Hard rule: anything classified as "7. ครุภัณฑ์" by the municipality is an
  // equipment purchase — projector, computer desk, server, sound system — and
  // belongs in the Municipal equipment bucket regardless of what the Metier
  // auto-tagger said. (The Metier sub-service for these is almost always
  // suffixed "(less aligned)" — the tagger itself flagged them as off-domain.)
  const isEquipmentPurchase = wc1 === "7. ครุภัณฑ์";

  // Strategy/planning comms work belongs in MARKETING. Run this BEFORE the
  // existing Metier auto-tag so a "PR plan" overrides a stale MEDIA tag.
  if (!isEquipmentPurchase) {
    const marketing = promoteToMarketing(p);
    if (marketing) return marketing;
  }

  if (l1 && l1 !== "NOT_APPLICABLE" && !isEquipmentPurchase) {
    if (l2 && METIER_SUB_REMAP[l2]) {
      const mapped = METIER_SUB_REMAP[l2];
      return {
        main: mapped.main,
        sub: refineMetierSub(mapped.main, mapped.sub, p),
      };
    }
    if (isMetierGroup(l1)) {
      return { main: l1, sub: refineMetierSub(l1, l2 ?? OTHER_SUB_LABEL, p) };
    }
  }

  // Promote events/campaigns the auto-tagger missed (only when not equipment).
  if (!isEquipmentPurchase) {
    const promoted = promoteToMetier(p);
    if (promoted) return promoted;
  }

  // Otherwise fall back to the municipal taxonomy from work_category_layer1/2.
  if (wc1 && isMunicipalGroup(wc1)) {
    return { main: wc1, sub: wc2 ?? OTHER_SUB_LABEL };
  }

  return { main: UNCLASSIFIED, sub: OTHER_SUB_LABEL };
}

export function getMainGroup(p: ProjectRecord, overrides?: OverrideMap): string {
  return mapProjectToGroup(p, overrides).main;
}

export function getSubService(p: ProjectRecord, overrides?: OverrideMap): string {
  return mapProjectToGroup(p, overrides).sub;
}

// ---------------------------------------------------------------------------
// Sub-service options for a given main group.
//   - Metier: canonical taxonomy + "อื่น ๆ" catch-all
//   - Municipal: dynamic — distinct work_category_layer2 values found in data
//     (the tagger passes the project set so we can derive these on the fly)
// ---------------------------------------------------------------------------
export function allSubsForMain(main: string, projects?: ProjectRecord[]): string[] {
  if (isMetierGroup(main)) {
    return [...METIER_TAXONOMY[main], OTHER_SUB_LABEL];
  }
  if (isMunicipalGroup(main) && projects) {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.work_category_layer1 === main && p.work_category_layer2) {
        set.add(p.work_category_layer2);
      }
    }
    const arr = Array.from(set).sort();
    arr.push(OTHER_SUB_LABEL);
    return arr;
  }
  return [OTHER_SUB_LABEL];
}
