import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "ย้อนหลังปี 2568 · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="4"
      title="โครงการจัดซื้อจัดจ้างปี 2568"
      description="1,449 รายการจริง (จากเอกสาร procurement) — ใช้เป็น reference เพื่อดูว่าโครงการที่คล้ายกัน เทศบาลเคยทำในรูปแบบไหน"
      upcoming={[
        "DataTable: เลขโครงการ, ชื่อโครงการ, ราคา, ประเภท, ปี",
        "Bar chart per ประเภท + per เดือน",
        "Search + filter ปี (2567/2568/2569)",
        "Fuzzy-match ไปหา selected project ใน Page 6",
      ]}
    />
  );
}
