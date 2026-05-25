import { MetierSymbol } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--color-border)]">
      <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-2 px-6 py-6 text-[14px] text-[color:var(--color-muted)] md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <MetierSymbol variant="color" size={20} />
          <span>
            Metier (Thailand) Co.,Ltd. · Where Marketing Meets Technology
          </span>
        </div>
        <div>
          วิเคราะห์แผนพัฒนาฯ เทศบาลเมืองคลองหลวง พ.ศ. 2566–2570
        </div>
      </div>
    </footer>
  );
}
