import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "คัดเลือก · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="5"
      title="Filter + ติ๊กโครงการที่ Metier ทำได้"
      description="กรอง 1,333 โครงการ → ติ๊กเลือก → สรุปสด ๆ (มูลค่ารวม, จำนวน, mix ของประเภท) เปลี่ยนทุกครั้งที่กด"
      upcoming={[
        "Filter sidebar: ยุทธศาสตร์, Metier service area, หน่วยงาน, ปี, ช่วงงบ",
        "Sticky summary panel: total ฿, count, ประเภทแยก doughnut",
        "Bulk select / select-by-filter / save selection",
        "Selection state saved to Supabase (per user)",
      ]}
    />
  );
}
