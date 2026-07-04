import { LucideIcon } from "lucide-react";
import { fmtNum } from "@/lib/analytics";

export default function KpiCard({
  label, value, hint, icon: Icon, tone = "default", suffix,
}: {
  label: string; value: number | string; hint?: string;
  icon?: LucideIcon; tone?: "default" | "gold" | "red" | "success"; suffix?: string;
}) {
  const toneMap = {
    default: "text-brand-navy",
    gold: "text-brand-gold",
    red: "text-brand-red",
    success: "text-success",
  };
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="text-muted-foreground text-xs font-medium">{label}</div>
        {Icon && <Icon className={`w-4 h-4 ${toneMap[tone]}`} />}
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneMap[tone]}`}>
        <span className="num">{typeof value === "number" ? fmtNum(value) : value}</span>
        {suffix && <span className="text-sm text-muted-foreground mr-1 font-medium">{suffix}</span>}
      </div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}