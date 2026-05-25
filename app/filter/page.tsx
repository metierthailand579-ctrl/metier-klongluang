import {
  getAllProjects,
  uniqueDepartments,
  uniqueMetierAreas,
  uniqueStrategies,
} from "@/lib/data/projects";
import { FilterExplorer } from "@/components/filter/filter-explorer";

export const metadata = { title: "คัดเลือก · คลองหลวง 2026" };

export default function FilterPage() {
  const projects = getAllProjects();
  const departments = uniqueDepartments();
  const strategies = uniqueStrategies();
  const metierAreas = uniqueMetierAreas();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          5
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">
            กรอง + ติ๊กเลือกโครงการที่ Metier ทำได้
          </h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            กรองโครงการตามยุทธศาสตร์ / หน่วยงาน / Metier service area / ช่วงงบ
            แล้วติ๊กเลือก — <span className="font-medium text-fg">สรุปสด ๆ</span>{" "}
            ทางขวาจะอัปเดตทุกครั้งที่กด (จำนวน, มูลค่ารวม, mix ของบริการ, หน่วยงาน)
          </p>
          <p className="mt-2 text-[13px] text-[color:var(--color-muted)]">
            การเลือกถูกเก็บใน browser ของคุณเอง — เปิดใหม่จะยังอยู่.
            เมื่อต่อ Supabase แล้ว จะ sync ข้ามอุปกรณ์ได้
          </p>
        </div>
      </header>

      <FilterExplorer
        projects={projects}
        departments={departments}
        strategies={strategies}
        metierAreas={metierAreas}
      />
    </div>
  );
}
