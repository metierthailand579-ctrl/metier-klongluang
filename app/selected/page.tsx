import { getAllProjects } from "@/lib/data/projects";
import { SelectedExplorer } from "@/components/selected/selected-explorer";

export const metadata = { title: "TOR + SOW · คลองหลวง 2026" };

export default function SelectedPage() {
  const projects = getAllProjects();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          6
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">โครงการที่เลือก · TOR + SOW</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            แต่ละโครงการที่เลือกในหน้า 5 — ทีม Metier <strong>ร่าง TOR ของเราเอง</strong>,
            แนบ <strong>TOR อ้างอิง</strong> และใส่ <strong>SOW</strong> ในแต่ละ card
            แล้วให้ฝั่งเทศบาลคลองหลวงกด <strong>Confirm</strong>
          </p>
        </div>
      </header>

      <SelectedExplorer projects={projects} />
    </div>
  );
}
