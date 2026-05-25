import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "โครงการทั้งหมด · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="2"
      title="ข้อมูลโครงการทั้งหมดในแผน"
      description="1,333 โครงการในแผนพัฒนา 5 ปี — แสดงเฉพาะ field สำคัญ + KPI สรุป (มูลค่ารวม, จำนวน, แยกตามแผน)"
      upcoming={[
        "KPI cards: รวม 1,333 / มูลค่า / per ปี",
        "DataTable สำคัญ: ชื่อ, หน่วยงาน, ยุทธศาสตร์, งบ, ปี",
        "Search, Filter, Sort, pagination",
        "Drill-down คลิกเข้าหน้า detail แต่ละโครงการ",
      ]}
    />
  );
}
