// Projects the Metier team picked as relevant, sent via:
//   /Users/ddoyle/Downloads/Potentail Project KL.xlsx
//
// Mapping verified manually against projects.json (the xlsx project names
// don't always match data exactly — some have typos, abbreviations, or
// list the same project twice across Sheet1 + Sheet2). The IDs below
// resolve every team-picked row to a canonical master_project_id.

export const TEAM_PICKS: ReadonlyArray<{ id: string; reason?: string }> = [
  // Marketing / Comms / Strategy
  { id: "KL-AD1-2569-P003", reason: "Smart Living consultancy (500K — แพลตฟอร์มดิจิทัล)" },
  { id: "KL-AD1-2569-P004", reason: "ปรับปรุงเว็บไซต์เทศบาล (10M)" },
  { id: "KL-AD1-2569-P005", reason: "ระบบการปฏิบัติราชการอิเล็กทรอนิกส์ ด้านการสื่อสาร (1M)" },
  { id: "KL-AD1-2569-P007", reason: "จัดทำแอพพลิเคชั่นเทศบาล (44M)" },
  { id: "KL-AD1-2569-P008", reason: "สัมมนา Digital Transformation (400K)" },
  { id: "KL-AD1-2569-P009", reason: "แผนการสื่อสารประชาสัมพันธ์ (800K)" },
  { id: "KL-AD1-2569-P125", reason: "Smart Environment consultancy (500K)" },
  { id: "KL-AD1-2569-P106", reason: "แอป สุนัข/แมว (10M)" },
  // Events
  { id: "KL-AD1-2569-P097", reason: "วันสตรีสากล (400K)" },
  { id: "KL-AD1-2569-P099", reason: "สัปดาห์วันสตรีสากล (2M)" },
  // Civic / Sustainability
  { id: "KL-AD1-2569-P112", reason: "ธนาคารขยะ (200K)" },
  { id: "KL-AD3-2568-P-Y3-COMM-003", reason: "ส่งเสริมศักยภาพคณะกรรมการชุมชน (1.5M)" },
  // Infrastructure / Lighting — multiple variants the team listed
  { id: "KL-AD1-2569-P064", reason: "ยกระดับความปลอดภัย ไฟฟ้าส่องสว่างถนน (36M)" },
  { id: "KL-AD1-2569-P065", reason: "ยกระดับความปลอดภัย ไฟฟ้าส่องสว่างถนน (46M)" },
  { id: "KL-AD1-2569-P066", reason: "ยกระดับความปลอดภัย ไฟฟ้าส่องสว่างถนน (46M)" },
  { id: "KL-AD1-2569-P067", reason: "ไฟฟ้าส่องสว่างสันเขื่อน ฝั่งตะวันตก (10.05M)" },
  { id: "KL-AD1-2569-P068", reason: "ไฟฟ้าส่องสว่างสันเขื่อน ฝั่งตะวันออก (5.25M)" },
  { id: "KL-CH2-2568-P06-ORIG", reason: "ไฟฟ้าส่องสว่างสันเขื่อน (variant)" },
  { id: "KL-CH2-2568-P07-ORIG", reason: "ไฟฟ้าส่องสว่างสันเขื่อน (variant)" },
  { id: "KL-AD3-2568-P-Y3-SPORT-001", reason: "ไฟฟ้าส่องสว่างสนามกีฬา เคหะเอื้ออาทร (1M)" },
  // Sports / Youth
  { id: "KL-AD3-2568-P-Y5-SPORT-001", reason: "พัฒนาทักษะกีฬาเด็กเยาวชน (2M)" },
];

export const TEAM_PICK_IDS: ReadonlySet<string> = new Set(TEAM_PICKS.map((t) => t.id));
