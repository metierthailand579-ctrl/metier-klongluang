import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PlaceholderPage({
  n,
  title,
  description,
  upcoming,
}: {
  n: string;
  title: string;
  description: string;
  upcoming: string[];
}) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-12">
      <div className="mb-8 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-metier-orange text-[20px] font-bold text-white">
          {n}
        </span>
        <div>
          <h1 className="text-[32px] font-bold leading-tight">{title}</h1>
          <p className="mt-2 max-w-3xl font-light text-[color:var(--color-muted-fg)]">
            {description}
          </p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="muted">กำลังพัฒนา</Badge>
            <CardTitle>หน้านี้จะมีอะไรบ้าง</CardTitle>
          </div>
          <CardDescription className="mb-4">
            จะ implement ในเฟสถัดไป — รายการความสามารถที่กำลังจะมา:
          </CardDescription>
          <ul className="space-y-2 text-[15px]">
            {upcoming.map((u) => (
              <li key={u} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-metier-orange" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
