// Map the raw "PDF-01..06" identifiers in the seed data to human-readable
// short titles, derived from the actual PDF filenames in File Project/
// (alphabetical order — confirmed with the user).
//
// Full filenames for reference:
//   PDF-01: แผนพัฒนาท้องถิ่น (พ.ศ.2566-2570) ของเทศบาลเมืองคลองหลวง เปลี่ยนแปลง ครั้งที่ 1 พ.ศ.2568
//   PDF-02: แผนพัฒนาท้องถิ่น (พ.ศ.2566-2570) ของเทศบาลเมืองคลองหลวง เปลี่ยนแปลง ครั้งที่ 2 พ.ศ. 2568
//   PDF-03: แผนพัฒนาท้องถิ่น(2566-2570) ของเทศบาลฯ เพิ่มเติม ครั้งที่ 1 พ.ศ. 2568
//   PDF-04: แผนพัฒนาท้องถิ่น(2566-2570) ของเทศบาลฯ เพิ่มเติม ครั้งที่ 1 พ.ศ. 2569
//   PDF-05: แผนพัฒนาท้องถิ่น(2566-2570) ของเทศบาลฯ เพิ่มเติม ครั้งที่ 2 พ.ศ. 2568
//   PDF-06: แผนพัฒนาท้องถิ่น(2566-2570) ของเทศบาลฯ เพิ่มเติม ครั้งที่ 3 พ.ศ. 2568

export type PdfMeta = {
  short: string; // chip / inline display
  full: string; // tooltip + filter dropdown
};

export const PDF_LABELS: Record<string, PdfMeta> = {
  "PDF-01": {
    short: "เปลี่ยนแปลง ครั้งที่ 1 (2568)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เปลี่ยนแปลง ครั้งที่ 1 พ.ศ.2568",
  },
  "PDF-02": {
    short: "เปลี่ยนแปลง ครั้งที่ 2 (2568)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เปลี่ยนแปลง ครั้งที่ 2 พ.ศ.2568",
  },
  "PDF-03": {
    short: "เพิ่มเติม ครั้งที่ 1 (2568)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เพิ่มเติม ครั้งที่ 1 พ.ศ.2568",
  },
  "PDF-04": {
    short: "เพิ่มเติม ครั้งที่ 1 (2569)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เพิ่มเติม ครั้งที่ 1 พ.ศ.2569",
  },
  "PDF-05": {
    short: "เพิ่มเติม ครั้งที่ 2 (2568)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เพิ่มเติม ครั้งที่ 2 พ.ศ.2568",
  },
  "PDF-06": {
    short: "เพิ่มเติม ครั้งที่ 3 (2568)",
    full: "แผนพัฒนาท้องถิ่น 2566-2570 · เพิ่มเติม ครั้งที่ 3 พ.ศ.2568",
  },
};

export function pdfShort(id: string | null | undefined): string {
  if (!id) return "—";
  return PDF_LABELS[id]?.short ?? id;
}

export function pdfFull(id: string | null | undefined): string {
  if (!id) return "—";
  return PDF_LABELS[id]?.full ?? id;
}
