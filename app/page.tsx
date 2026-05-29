import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    n: "1",
    href: "/methodology",
    title: "วิธีทำ",
    desc: "เล่าวิธีการทำงานทั้งหมดของเรา ตั้งแต่อ่านเอกสาร 6 PDF จนถึงคัดเลือก",
  },
  {
    n: "2",
    href: "/projects",
    title: "โครงการทั้งหมด",
    desc: "1,333 โครงการในแผนพัฒนาท้องถิ่น พ.ศ. 2566–2570 พร้อมสรุป KPI",
  },
  {
    n: "3",
    href: "/groups",
    title: "จัดกลุ่ม",
    desc: "11 Main Groups (4 Metier + 7 Municipal) — ติ๊กเปลี่ยนกลุ่มแต่ละโครงการเองได้",
  },
  {
    n: "4",
    href: "/history-2568",
    title: "ย้อนหลังปี 2568",
    desc: "1,449 รายการจัดซื้อจัดจ้างจริง — สรุป 3 มุม: ประเภทงาน / หน่วยงาน / วิธีจัดจ้าง",
  },
  {
    n: "5",
    href: "/filter",
    title: "คัดเลือก",
    desc: "Filter หลายมิติ + ติ๊กโครงการที่ Metier ทำได้ + ปุ่ม 'ทีมแนะนำ'",
  },
  {
    n: "6",
    href: "/selected",
    title: "TOR + SOW",
    desc: "ใส่ Priority + ไตรมาส + แนบไฟล์ TOR + ร่าง SOW + Confirm",
  },
  {
    n: "T",
    href: "/timeline",
    title: "Timeline",
    desc: "ภาพรวมโหลดต่อไตรมาส 2569 / 2570 — Kanban ตามวันเริ่ม",
  },
  {
    n: "7",
    href: "/status",
    title: "สถานะ",
    desc: "Kanban + auto-detect 'ล่าช้า/ตามแผน' จาก start date · Comments per card",
  },
  {
    n: "!",
    href: "/issues",
    title: "ปัญหา & Bug",
    desc: "บันทึกปัญหา · วิธีแก้ · แจ้ง bug — ทีมเห็นและอัปเดตร่วมกัน realtime",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-[color:var(--color-border)]">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:py-28">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] px-3 py-1 text-[13px] text-[color:var(--color-muted-fg)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-metier-orange" />
              เทศบาลเมืองคลองหลวง × Metier (Thailand)
            </div>
            <h1 className="mb-5 text-[40px] font-bold leading-[1.1] md:text-[56px]">
              คลองหลวง <span className="text-metier-orange">2026</span>
              <br />
              <span className="font-light text-[color:var(--color-muted-fg)]">
                โอกาสในแผนพัฒนา 5 ปี
              </span>
            </h1>
            <p className="mb-8 max-w-2xl text-[18px] font-light leading-relaxed text-[color:var(--color-muted-fg)]">
              วิเคราะห์เอกสารแผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง พ.ศ. 2566–2570
              จาก 6 PDF + 4 Excel รวม 1,333 โครงการ
              คัดเลือกโครงการที่ Metier มีโอกาสรับงาน และเทียบกับ
              ประวัติจัดซื้อจัดจ้างปี 2568 (1,449 รายการ) เพื่อร่าง SOW
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/methodology">
                  เริ่มดู วิธีการทำงาน <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/projects">ไปยังข้อมูลโครงการ</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-14">
        <h2 className="mb-6 text-[24px] font-bold">9 หน้าหลัก</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-metier-orange/40 group-hover:shadow-md">
                <CardContent className="pt-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-metier-orange font-bold text-white">
                      {s.n}
                    </span>
                    <CardTitle>{s.title}</CardTitle>
                  </div>
                  <CardDescription className="leading-relaxed">
                    {s.desc}
                  </CardDescription>
                  <div className="mt-4 flex items-center gap-1 text-[13px] text-metier-orange opacity-0 transition-opacity group-hover:opacity-100">
                    เข้าหน้านี้ <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
