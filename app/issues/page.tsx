import { IssuesBoard } from "@/components/issues/issues-board";

export const metadata = { title: "ปัญหา & Bug · คลองหลวง 2026" };

export default function IssuesPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <header className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          !
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">ปัญหา &amp; Bug Log</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            บันทึกปัญหาที่เกิดขึ้น · วิธีแก้ · แจ้ง bug ของเว็บ — ทุกคนในทีมเห็นและอัปเดตร่วมกันได้
            (sync ผ่าน Supabase realtime)
          </p>
        </div>
      </header>

      <IssuesBoard />
    </div>
  );
}
