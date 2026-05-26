import {
  getAllProjects,
  uniqueDepartments,
  uniqueStrategies,
} from "@/lib/data/projects";
import { ProjectsExplorer } from "@/components/projects/projects-explorer";

export const metadata = { title: "โครงการทั้งหมด · คลองหลวง 2026" };

export default function ProjectsPage() {
  const projects = getAllProjects();
  const strategies = uniqueStrategies();
  const departments = uniqueDepartments();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          2
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">โครงการทั้งหมดในแผน</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            1,333 โครงการในแผนพัฒนาท้องถิ่นเทศบาลเมืองคลองหลวง พ.ศ. 2568–2570
            — ทุกโครงการอ้างกลับไปยัง PDF ต้นฉบับ + เลขหน้า · งบประมาณแบ่งตามหน่วยงาน × ปี
          </p>
        </div>
      </header>

      <ProjectsExplorer
        initialProjects={projects}
        strategies={strategies}
        departments={departments}
      />
    </div>
  );
}
