import { getAllProjects } from "@/lib/data/projects";
import { TimelineView } from "@/components/timeline/timeline-view";

export const metadata = { title: "Timeline · คลองหลวง 2026" };

export default function TimelinePage() {
  const projects = getAllProjects();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          T
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">Timeline · ไตรมาส 2569–2570</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            สรุปจากหน้า{" "}
            <a href="/selected" className="font-medium text-metier-orange underline">
              6 · TOR + SOW
            </a>{" "}
            — จัดเรียงโครงการที่เลือกตามไตรมาสที่ตั้งใจจะเริ่ม + Priority ของแต่ละงาน
            (เลือก/เปลี่ยนได้ที่หน้า 6)
          </p>
        </div>
      </header>

      <TimelineView projects={projects} />
    </div>
  );
}
