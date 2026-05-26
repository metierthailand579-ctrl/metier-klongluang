import { getAllProjects, getMetierProjects } from "@/lib/data/projects";
import { getAllHistory } from "@/lib/data/history";
import { summarize } from "@/lib/data/stats";
import { AnimatedCounter } from "@/components/methodology/animated-counter";
import { StepCard, type Step } from "@/components/methodology/step-card";
import { StepsHeader } from "@/components/methodology/steps-header";
import { PipelineFlow } from "@/components/methodology/pipeline-flow";
import { formatBaht } from "@/lib/utils";

export const metadata = { title: "วิธีทำ · คลองหลวง 2026" };

const STEPS: Step[] = [
  {
    id: "S1",
    title: "รวบรวมไฟล์ต้นฉบับทั้งหมด",
    summary:
      "เปิดและจดบัญชีเอกสารต้นฉบับ — PDF แผนพัฒนาท้องถิ่น 6 ไฟล์ (รวม 764 หน้า) + Excel งบประมาณ 4 ไฟล์",
    status: "done",
    bullets: [
      "PDF: แผนพัฒนาท้องถิ่นฯ ปี 2566–2570 รวมฉบับเปลี่ยนแปลง/เพิ่มเติม",
      "Excel: ตารางที่ทีมเทศบาลสกัดข้อมูลไว้แล้ว ใช้เทียบความถูกต้อง",
      "Excel: บันทึกจัดซื้อจัดจ้างจริง 1,449 รายการ (ของจริง ไม่ใช่แผน) ใช้เป็น reference",
    ],
  },
  {
    id: "S2",
    title: "เช็คโครงการซ้ำกันก่อน",
    summary:
      "ตรวจว่าโครงการเดียวกันถูกใส่ในหลายไฟล์ไหม — เจอ 6 กลุ่มที่ซ้ำกัน และพบว่าไฟล์งบประมาณจริงคือคนละชุดกับแผน",
    status: "done",
  },
  {
    id: "S3",
    title: "อ่าน Excel ที่ทีมเทศบาลสกัดไว้",
    summary:
      "ตรวจโครงสร้างข้อมูลที่ทีมเทศบาลสรุปไว้ก่อน — verify 3 ตัวอย่าง ผ่านทั้ง 3 → เข้าใจตรงกัน",
    status: "done",
  },
  {
    id: "S4",
    title: "ออกแบบโครงสร้างข้อมูลให้ครบทุกมุม",
    summary:
      "กำหนดว่าทุกโครงการต้องมีข้อมูลอะไรบ้าง — ชื่อ, งบ, ปีที่จะทำ, หน่วยงาน, ที่มา PDF, หน้าที่อ้างอิง, สาย Metier ฯลฯ รวม 57 ข้อมูลต่อโครงการ",
    status: "done",
    meta: "57 ช่องข้อมูล / โครงการ",
  },
  {
    id: "S5",
    title: "ดึงข้อมูลจาก PDF ทั้งหมดด้วย AI",
    summary:
      "อ่าน PDF อัตโนมัติด้วย Claude vision (รุ่นที่อ่านภาพได้) — รอบแรกได้ 937 โครงการ พร้อมเลขหน้าที่อ้างอิงกลับไฟล์ต้นทาง",
    status: "done",
  },
  {
    id: "S5b",
    title: "ตรวจสอบ + แตกครุภัณฑ์ที่ขาด",
    summary:
      "ทีม cross-check พบว่ามีครุภัณฑ์การแพทย์ที่ PDF รวบไว้เป็นรายการเดียว — แตกออกเป็น 311 รายการย่อย → รวมเป็น 1,333 โครงการ พร้อมจัดสายงาน Metier ครั้งแรก",
    status: "done",
  },
  {
    id: "S5c",
    title: "จัดกลุ่มย่อยให้ละเอียดขึ้น",
    summary:
      "โครงการที่ไม่ใช่สายงาน Metier (ถนน คสล., สะพาน, ครุภัณฑ์) แบ่งเป็นกลุ่มย่อยให้ละเอียด เพื่อใช้ดู context ได้ — กลับมา re-check สาย Metier เจอเพิ่ม 6 ตัว (วารสาร, แอป, เสียงไร้สาย)",
    status: "done",
  },
  {
    id: "S6",
    title: "รวมข้อมูล + ทำให้สะอาด",
    summary:
      "เช็คโครงการซ้ำข้ามไฟล์ + ทำให้ชื่อหน่วยงานสะกดเหมือนกันทุกที่ + จัดเลข ID ใหม่ให้เรียง (รอเริ่ม)",
    status: "pending",
  },
  {
    id: "S7",
    title: "ทีม Metier ให้คะแนน + คัดเลือก",
    summary:
      "ทีม Metier ใช้หน้า ‘คัดเลือก’ ในเว็บนี้เพื่อให้คะแนน 1-10 + ตัดสินใจว่าจะยื่นโครงการไหน",
    status: "pending",
  },
  {
    id: "S8",
    title: "เทียบกับโครงการเก่าที่เทศบาลเคยจัดซื้อ",
    summary:
      "หาว่าโครงการที่เลือกไว้ คล้ายกับโครงการที่เทศบาลเคยจัดซื้อจัดจ้างจริงปี 2568 ตัวไหนบ้าง — เพื่อขอ TOR ฉบับเดิมมาดูเป็น reference",
    status: "pending",
  },
  {
    id: "S9",
    title: "อ่าน TOR เก่า → ร่าง SOW",
    summary:
      "Parse TOR ที่ download มา → ทำเป็นร่าง Scope of Work — แยกชัดว่าส่วนไหนมาจาก TOR จริง vs ส่วนไหน Metier ใส่เพิ่มเอง",
    status: "pending",
  },
  {
    id: "S10",
    title: "ส่งมอบ deliverables",
    summary:
      "ส่ง Excel หลัก (master) + รายงานเปรียบเทียบกับ TOR เก่า + executive summary ภาษาไทย",
    status: "pending",
  },
  {
    id: "S11",
    title: "ตรวจคุณภาพรอบสุดท้าย",
    summary:
      "เช็ค 13 ข้อก่อนส่ง: ทุกข้อมูลต้องอ้างที่มาได้ + ไม่มีการเดา/ประดิษฐ์ + ไม่มี chain-of-thought + ใช้คำว่า ‘ไม่ทราบข้อมูลในส่วนนี้’ ตามมาตรฐาน",
    status: "pending",
  },
];

export default function MethodologyPage() {
  const projects = getAllProjects();
  const metier = getMetierProjects();
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
            กระบวนการ <strong className="text-fg">13 ขั้น</strong> ตั้งแต่{" "}
            <span className="font-mono">S1</span> ถึง{" "}
            <span className="font-mono">S11</span> (มี{" "}
            <span className="font-mono">S5b</span> /{" "}
            <span className="font-mono">S5c</span> แตกระหว่างทาง) — เริ่มจากอ่าน PDF
            ต้นฉบับ 764 หน้า แปลงเป็นข้อมูลที่มีโครงสร้าง จัดกลุ่ม คัดเลือกตามสายงาน
            Metier แล้วเทียบกับประวัติจัดซื้อจัดจ้างปี 2568 เพื่อร่าง SOW
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="โครงการในแผน"
              value={<AnimatedCounter to={projects.length} />}
              unit="รายการ"
              hint="อ่านจาก PDF 6 ไฟล์ + Excel 4 ไฟล์"
            />
            <Stat
              label="งบประมาณรวม"
              value={
                <AnimatedCounter
                  to={s.totalBudget / 1_000_000_000}
                  format="fixed2"
                />
              }
              unit="พันล้านบาท"
              hint={formatBaht(s.totalBudget) + " บาท"}
            />
            <Stat
              label="โครงการสาย Metier"
              value={<AnimatedCounter to={metier.length} />}
              unit="โครงการ"
              accent
              hint={`${(s.metierShare * 100).toFixed(1)}% ของทั้งหมด`}
            />
            <Stat
              label="งบสาย Metier"
              value={
                <AnimatedCounter
                  to={s.metierBudget / 1_000_000}
                  format="fixed1"
                />
              }
              unit="ล้านบาท"
              accent
              hint={`${(s.metierBudgetShare * 100).toFixed(1)}% ของงบรวม`}
            />
          </div>
        </div>
      </section>

      {/* Pipeline diagram — animated */}
      <section className="border-b border-[color:var(--color-border)] bg-[color:var(--color-subtle)]/40">
        <div className="mx-auto max-w-[1440px] px-6 py-14">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-[24px] font-bold">Pipeline ภาพรวม</h2>
            <span className="text-[12px] text-[color:var(--color-muted)]">
              6 ขั้นหลัก · ลำดับการไหลของข้อมูล
            </span>
          </div>
          <PipelineFlow totalRecords={projects.length} metierCount={metier.length} />
          <div className="mt-8 rounded-md border border-[color:var(--color-border)] bg-white px-4 py-3 text-[13px] text-[color:var(--color-muted-fg)]">
            ทุกโครงการอ้างกลับไปยังไฟล์ต้นฉบับ + เลขหน้าได้
            (ไม่มีการประดิษฐ์ข้อมูล — ใช้คำว่า{" "}
            <span className="font-medium text-fg">‘ไม่ทราบข้อมูลในส่วนนี้’</span>{" "}
            เมื่อ source ไม่บอก)
          </div>
        </div>
      </section>

      {/* Steps timeline */}
      <section className="mx-auto max-w-[1100px] px-6 py-14">
        <StepsHeader steps={STEPS} />
        <div className="relative mt-10">
          <div className="absolute left-[23px] top-2 bottom-0 w-px bg-[color:var(--color-border)]" />
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <StepCard key={step.id} step={step} index={i} />
            ))}
          </div>
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
