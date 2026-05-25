import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "TOR + SOW · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="6"
      title="โครงการที่เลือก พร้อม TOR เทียบ + ร่าง SOW"
      description="แต่ละโครงการ — แสดง TOR ปีก่อนที่คล้ายกัน + สรุป SOW ที่คาดว่าจะมี + ฝั่งเทศบาลคลองหลวงกด Confirm ได้"
      upcoming={[
        "Card per โครงการ พร้อม TOR matches (fuzzy similarity)",
        "ร่าง SOW components — แยก source-grounded vs inferred",
        "ปุ่ม Confirm พร้อมหมายเหตุ (สำหรับเทศบาลคลองหลวง)",
        "Export ไป DOCX (D2 comparison report)",
      ]}
    />
  );
}
