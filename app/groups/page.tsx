import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "จัดกลุ่ม · คลองหลวง 2026" };

export default function Page() {
  return (
    <PlaceholderPage
      n="3"
      title="แบ่งกลุ่ม Group และ Sub-Group"
      description="7 ยุทธศาสตร์ × ~50 sub-categories + 4 Metier service areas — visualize ในรูปแบบ Treemap / Sunburst"
      upcoming={[
        "Treemap แสดงสัดส่วน Work Category L1 (7 กลุ่ม) → L2 (~50)",
        "Toggle ระหว่าง mode 'งบประมาณ' / 'จำนวน'",
        "Sunburst chart สำหรับ Metier Service Area Layer 1 → Layer 2",
        "Click เข้า group ใด ๆ → filter ไปหน้า projects",
      ]}
    />
  );
}
