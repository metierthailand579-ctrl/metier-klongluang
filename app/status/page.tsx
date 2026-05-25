import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "สถานะ · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="7"
      title="ติดตามสถานะโครงการที่ยืนยันแล้ว"
      description="Kanban 5 คอลัมน์: ร่าง TOR → เปิดโครงการ → ยื่นโครงการ → กำลังดำเนินงาน → เสร็จสิ้น"
      upcoming={[
        "Drag-and-drop เปลี่ยนสถานะ",
        "Timeline log per project",
        "Filter ตามผู้รับผิดชอบ, เดือน",
        "ใช้ในอนาคต — track งานที่ Metier ได้รับ",
      ]}
    />
  );
}
