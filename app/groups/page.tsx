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
          <h1 className="text-[32px] font-bold leading-tight">จัดกลุ่ม 1,333 โครงการ</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            แบ่งเป็น <strong>11 Main Groups</strong> — <strong>4 กลุ่ม Metier</strong>{" "}
            (MARKETING / MEDIA / CREATIVE / SOFTWARE) + <strong>7 กลุ่ม Municipal</strong>{" "}
            (โครงสร้างพื้นฐาน · ครุภัณฑ์ · บริหารจัดการ · คุณภาพชีวิต · การศึกษาฯ · ความสะอาดฯ · ชุมชนเข้มแข็ง).
            กดเปลี่ยนกลุ่มของแต่ละโครงการได้เองในตารางด้านล่าง — บันทึกอัตโนมัติ
          </p>
        </div>
      </header>

      <GroupsExplorer projects={projects} />
    </div>
  );
}
