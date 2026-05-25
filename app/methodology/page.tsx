import { getAllProjects, getMetierProjects } from "@/lib/data/projects";
import { getAllHistory } from "@/lib/data/history";
import { summarize } from "@/lib/data/stats";
import { AnimatedCounter } from "@/components/methodology/animated-counter";
import { StepCard, type Step } from "@/components/methodology/step-card";
import { formatBahtCompact } from "@/lib/utils";

export const metadata = { title: "วิธีทำ · คลองหลวง 2026" };

const STEPS: Step[] = [
  {
    id: "S1",
    title: "File Inventory",
    summary: "เปิดและจดบัญชีไฟล์ต้นฉบับทั้งหมด: 6 PDF (764 หน้า) + 4 Excel + เอกสารอ้างอิง",
    status: "done",
    bullets: [
      "PDF-01..06: แผนพัฒนาท้องถิ่นฯ ฉบับเปลี่ยนแปลง/เพิ่มเติม ปี 2568–2569",
      "XLSX-01..03: ตารางที่ผู้ใช้สกัดไว้ก่อนหน้า — ใช้เทียบความถูกต้อง",
      "XLSX-04: บันทึกจัดซื้อจัดจ้างจริง 1,449 รายการ ปี 2567–2569 (ไม่ใช่แผน)",
    ],
  },
  {
    id: "S2",
    title: "Duplicate / Overlap Detection",
    summary: "ตรวจซ้ำข้ามไฟล์ พบโครงการคู่ขนาน 6 กลุ่ม + เจอว่า XLSX-04 เป็น procurement records ไม่ใช่ planned projects",
    status: "done",
  },
  {
    id: "S3",
    title: "Review Existing Excel",
    summary: "Review schema 3 ไฟล์ที่ผู้ใช้สกัดไว้ — พบ schema 2 รุ่น + sample verification 3/3 PASS",
    status: "done",
  },
  {
    id: "S4",
    title: "Master Schema (57 fields)",
    summary: "ออกแบบ schema ครอบคลุม 13 กลุ่ม (A-M): ID/Source, Identity, Description, Budget, Procurement, QA, Change Tracking, Metier Fit, Selection, Historical Match, Category, Metier Service Area",
    status: "done",
    meta: "57 fields × 13 groups",
  },
  {
    id: "S5",
    title: "Document Extraction (v1)",
    summary: "Multi-agent parallel extraction จาก 6 PDFs → 937 records (v1) — Claude vision เป็นหลัก + tesseract OCR backup",
    status: "done",
  },
  {
    id: "S5b",
    title: "Cross-check Fix + Metier Categorization",
    summary: "แก้จุดที่ทีม cross-check Not Pass: PDF-04 +79 ครุภัณฑ์, PDF-03 v2 merge, PDF-05 unroll ครุภัณฑ์ → 1,333 records. เพิ่ม Metier service-area classification (4 areas) — เจอ 62 Metier-relevant",
    status: "done",
    bullets: [
      "PDF-04: pull 79 ครุภัณฑ์ จาก XLSX-01 Equipment_Master",
      "PDF-05: manual unroll ครุภัณฑ์การแพทย์ 12 → 311 line items",
      "Classifier ตั้งต้น: keyword-based 4 areas + 9 sub-services",
    ],
  },
  {
    id: "S5c",
    title: "Re-classify NOT_APPLICABLE",
    summary: "แบ่ง sub-group ของงานที่ไม่ใช่ Metier service ให้ละเอียดขึ้น — 114 records ที่เคยเป็น 'อื่นๆ' → 26 sub-categories ใหม่; พร้อม re-check Metier classifier เจอ +6 (วารสาร, แอปพลิเคชัน, เสียงไร้สาย)",
    status: "done",
    meta: "Metier 62 → 68",
  },
  {
    id: "S6",
    title: "Merge & Reconciliation",
    summary: "Cross-PDF duplicate detection + normalize ชื่อหน่วยงาน + re-sequence master_project_id (รอเริ่ม)",
    status: "pending",
  },
  {
    id: "S7",
    title: "Metier Fit Scoring & Selection",
    summary: "ให้ score 1-10 + tier (high/medium/low) — ผู้ใช้คัดเลือกในหน้า /filter ของ web app",
    status: "pending",
  },
  {
    id: "S8",
    title: "Historical Comparison vs XLSX-04",
    summary: "Fuzzy-match selected projects กับ 1,449 procurement records ปี 2568 → ระบุ TOR ที่ควร download",
    status: "pending",
  },
  {
    id: "S9",
    title: "SOW / TOR Component Mapping",
    summary: "Parse TOR ที่ download → แยก source-grounded SOW (จาก TOR จริง) vs inferred (จาก similarity)",
    status: "pending",
  },
  {
    id: "S10",
    title: "Generate Final Deliverables",
    summary: "D1 Excel master · D2 DOCX comparison report · D3 DOCX executive summary (Thai)",
    status: "pending",
  },
  {
    id: "S11",
    title: "Final QA",
    summary: "13-item checklist + Sheet 12_QA_Log: source grounding, conflicts preserved, ไม่ทราบข้อมูลในส่วนนี้, no chain-of-thought",
    status: "pending",
  },
];

export default function MethodologyPage() {
  const projects = getAllProjects();
  const metier = getMetierProjects();
  const history = getAllHistory();
  const s = summarize(projects);

  return (
    <div>
      {/* Hero with animated counters */}
      <section className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto max-w-[1440px] px-6 py-16 md:py-24">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] px-3 py-1 text-[13px] text-[color:var(--color-muted-fg)]">
            <span className="font-mono">หน้า 1</span> · วิธีการทำงาน
          </div>
          <h1 className="text-[40px] font-bold leading-[1.1] md:text-[56px]">
            จาก PDF 6 ไฟล์
            <br />
            <span className="font-light text-[color:var(--color-muted-fg)]">
              สู่โอกาส{" "}
              <span className="font-bold text-metier-orange">
                <AnimatedCounter to={metier.length} /> โครงการ
              </span>{" "}
              ของ Metier
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-[18px] font-light leading-relaxed text-[color:var(--color-muted-fg)]">
            กระบวนการ 13 ขั้น (S1 → S11) วิเคราะห์เอกสารแผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง
            พ.ศ. 2566–2570 จากเอกสารต้นฉบับ scan PDF ทั้งหมด 764 หน้า
            แปลงเป็นข้อมูลที่มีโครงสร้าง พร้อมเทียบกับประวัติจัดซื้อจัดจ้างปี 2568
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="โครงการในแผน"
              value={<AnimatedCounter to={projects.length} />}
              unit="รายการ"
              hint="ครอบคลุม 6 PDF + 4 Excel"
            />
            <Stat
              label="งบประมาณรวม"
              value={<AnimatedCounter to={Math.round(s.totalBudget / 1_000_000)} />}
              unit="ล้านบาท"
              hint={formatBahtCompact(s.totalBudget)}
            />
            <Stat
              label="Metier-relevant"
              value={<AnimatedCounter to={metier.length} />}
              unit="โครงการ"
              accent
              hint={`${(s.metierShare * 100).toFixed(1)}% ของทั้งหมด`}
            />
            <Stat
              label="งบ Metier"
              value={<AnimatedCounter to={Math.round(s.metierBudget / 1_000_000)} />}
              unit="ล้านบาท"
              accent
              hint={`${(s.metierBudgetShare * 100).toFixed(1)}% ของงบรวม`}
            />
          </div>
        </div>
      </section>

      {/* Pipeline diagram (visual) */}
      <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40">
        <div className="mx-auto max-w-[1440px] px-6 py-12">
          <h2 className="mb-6 text-[24px] font-bold">Pipeline</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <PipelineStep n={1} title="PDF ต้นฉบับ" sub={`6 ไฟล์ · 764 หน้า`} />
            <PipelineStep n={2} title="OCR + Vision" sub="Claude vision + tesseract Thai" />
            <PipelineStep n={3} title="Extract" sub={`${projects.length.toLocaleString("th-TH")} records`} />
            <PipelineStep n={4} title="Classify" sub="7 ยุทธศาสตร์ + 4 Metier areas" />
            <PipelineStep n={5} title="Merge" sub="duplicate / pair detection" />
            <PipelineStep n={6} title="Select + SOW" sub={`${metier.length} candidates`} highlight />
          </div>
          <div className="mt-6 text-[13px] text-[color:var(--color-muted)]">
            ทุก record อ้างอิงกลับไปยัง <code>source_pdf_file</code> +{" "}
            <code>source_page</code> ได้ — ไม่มีการประดิษฐ์ข้อมูล (ใช้
            <span className="font-medium"> "ไม่ทราบข้อมูลในส่วนนี้" </span>
            เมื่อข้อมูลขาด)
          </div>
        </div>
      </section>

      {/* Steps timeline */}
      <section className="mx-auto max-w-[1100px] px-6 py-14">
        <h2 className="mb-2 text-[24px] font-bold">13 ขั้นตอน (S1 → S11)</h2>
        <p className="mb-10 max-w-2xl font-light text-[color:var(--color-muted-fg)]">
          แต่ละขั้นมี <code>step_review_schema</code> เพื่อรอ approval จากผู้ใช้
          ก่อน execute ขั้นถัดไป — ทำให้ไม่หลงไปทำสิ่งที่ผู้ใช้ไม่ต้องการ
        </p>
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-0 w-px bg-[color:var(--color-border)]" />
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Glossary */}
      <section className="border-t border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40">
        <div className="mx-auto max-w-[1100px] px-6 py-12">
          <h2 className="mb-6 text-[24px] font-bold">ศัพท์ที่ใช้</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <GlossaryItem
              term="Layer 1 / Layer 2"
              def="Layer 1 = หมวดใหญ่ (เช่น 7 ยุทธศาสตร์, 4 Metier areas) · Layer 2 = sub-category"
            />
            <GlossaryItem
              term="NOT_APPLICABLE"
              def={`โครงการที่ไม่ตรงสาย Metier (1,265 รายการ — ส่วนใหญ่เป็นถนน คสล., ครุภัณฑ์การแพทย์, สะพาน) แต่ยังจัดกลุ่มย่อยให้เพื่อ context`}
            />
            <GlossaryItem
              term="duplicate_group_id / pair_id"
              def="เก็บโครงการที่ซ้ำกันข้ามไฟล์ (DUP-001..006) และคู่ ORIG/CHG (โครงการเดิม vs เปลี่ยนแปลง) ในไฟล์เดียวกัน"
            />
            <GlossaryItem
              term="ไม่ทราบข้อมูลในส่วนนี้"
              def="วลีเฉพาะที่ใช้เมื่อข้อมูลขาดจาก source — ไม่ใช่ ⁠null หรือ empty string เพื่อแยกจากความว่างปกติ"
            />
            <GlossaryItem
              term="metier_fit_score / tier"
              def="คะแนน 1-10 + ระดับ high/medium/low ที่ Metier ให้กับ candidate (กำหนดใน S7)"
            />
            <GlossaryItem
              term={`procurement_history_2568 (${history.length.toLocaleString("th-TH")})`}
              def="บันทึกจัดซื้อจัดจ้างจริงปี 2567–2569 (XLSX-04) ใช้เป็น reference เทียบกับ selected projects"
            />
          </dl>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-5 " +
        (accent
          ? "border-metier-orange/30 bg-[color:var(--color-metier-orange)]/[0.04]"
          : "border-[color:var(--color-border)] bg-white")
      }
    >
      <div className="text-[12px] uppercase tracking-wide text-[color:var(--color-muted)]">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={
            "text-[36px] font-bold leading-none tabular-nums " +
            (accent ? "text-metier-orange" : "")
          }
        >
          {value}
        </span>
        {unit && (
          <span className="text-[14px] font-light text-[color:var(--color-muted-fg)]">{unit}</span>
        )}
      </div>
      {hint && <div className="mt-2 text-[12px] text-[color:var(--color-muted)]">{hint}</div>}
    </div>
  );
}

function PipelineStep({
  n,
  title,
  sub,
  highlight = false,
}: {
  n: number;
  title: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 transition-colors " +
        (highlight
          ? "border-metier-orange/40 bg-white"
          : "border-[color:var(--color-border)] bg-white")
      }
    >
      <div
        className={
          "mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold " +
          (highlight
            ? "bg-metier-orange text-white"
            : "bg-[color:var(--color-subtle)] text-[color:var(--color-muted-fg)]")
        }
      >
        {n}
      </div>
      <div className="font-bold leading-tight">{title}</div>
      {sub && (
        <div className="mt-1 text-[12px] text-[color:var(--color-muted)]">{sub}</div>
      )}
    </div>
  );
}

function GlossaryItem({ term, def }: { term: string; def: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border)] bg-white p-4">
      <dt className="text-[14px] font-bold">{term}</dt>
      <dd className="mt-1 text-[13px] font-light leading-relaxed text-[color:var(--color-muted-fg)]">
        {def}
      </dd>
    </div>
  );
}
