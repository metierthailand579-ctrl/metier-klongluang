import { getAllProjects } from "@/lib/data/projects";
import { StatusKanban } from "@/components/status/status-kanban";

export const metadata = { title: "สถานะ · คลองหลวง 2026" };

export default function StatusPage() {
  const projects = getAllProjects();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          7
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">ติดตามสถานะโครงการ</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            Kanban 5 คอลัมน์สำหรับโครงการที่ <strong>ยืนยันแล้ว</strong> จากหน้า 6
            — ลาก-วางการ์ดเพื่อเลื่อนสถานะ. ทุกการเปลี่ยนเก็บลง timeline log
          </p>
        </div>
      </header>

      <StatusKanban projects={projects} />
    </div>
  );
}
