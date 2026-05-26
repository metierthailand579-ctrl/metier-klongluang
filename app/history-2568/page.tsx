import { getAllHistory, uniqueHistoryYears } from "@/lib/data/history";
import { HistoryExplorer } from "@/components/history/history-explorer";

export const metadata = { title: "ย้อนหลังปี 2568 · คลองหลวง 2026" };

export default function HistoryPage() {
  const records = getAllHistory();
  const years = uniqueHistoryYears();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          4
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">โครงการจัดซื้อจัดจ้างปี 2568</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            1,449 รายการที่เทศบาลจัดซื้อจัดจ้างจริง — สรุปเป็น 3 มุม:
            ประเภทงาน · หน่วยงาน · ประเภทการจัดจ้าง คลิกแต่ละบรรทัดเพื่อ filter ทั้งตาราง
          </p>
        </div>
      </header>

      <HistoryExplorer records={records} years={years} />
    </div>
  );
}
