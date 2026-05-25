import { getAllProjects } from "@/lib/data/projects";
import { GroupsExplorer } from "@/components/groups/groups-explorer";

export const metadata = { title: "จัดกลุ่ม · คลองหลวง 2026" };

export default function GroupsPage() {
  const projects = getAllProjects();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          3
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">ตั้งค่าจัดกลุ่มเอง</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            เลือก <strong>มิติหลัก</strong> + <strong>มิติย่อย</strong> +{" "}
            <strong>หน่วยวัด</strong> ได้เอง — เช่น "หน่วยงาน × ยุทธศาสตร์ ด้วยงบรวม"
            หรือ "Metier area × ปีเริ่ม ด้วยจำนวน".
            Treemap + ตารางกลุ่มจะ render ตามที่เลือกทันที
          </p>
        </div>
      </header>

      <GroupsExplorer projects={projects} />
    </div>
  );
}
