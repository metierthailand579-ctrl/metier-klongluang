import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "วิธีทำ · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="1"
      title="วิธีการทำงานทั้งหมดของเรา"
      description="เล่าตั้งแต่ S1 (File inventory 10 ไฟล์ + 764 หน้า PDF) → S5b (Metier classification 62 โครงการ) → S6 (Merge) → S7 (Selection) → S11 (Final QA) แบบ interactive scroll storytelling"
      upcoming={[
        "Vertical timeline แสดง 11 steps พร้อม scroll-triggered animation",
        "ตัวเลขสำคัญ (1,333 records, 62 Metier-relevant, 495.6M บาท) เป็น animated counters",
        "Pipeline diagram: PDFs → OCR → Extract → Classify → Merge → Select → SOW",
        "Glossary ของศัพท์ที่ใช้ (Layer 1/2, NOT_APPLICABLE, duplicate pair, etc.)",
      ]}
    />
  );
}
