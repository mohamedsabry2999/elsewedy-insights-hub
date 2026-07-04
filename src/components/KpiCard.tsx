import { LucideIcon } from "lucide-react";
import { fmtNum } from "@/lib/analytics";

type Tone = "default" | "gold" | "red" | "success" | "warning" | "info";

const toneText: Record<Tone, string> = {
  default: "text-foreground",
  gold: "text-brand-gold",
  red: "text-brand-red",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

const toneIconBg: Record<Tone, string> = {
  default: "bg-muted text-foreground",
  gold: "bg-brand-gold/10 text-brand-gold",
  red: "bg-brand-red/10 text-brand-red",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
};

export default function KpiCard({
  label, value, hint, icon: Icon, tone = "default", suffix, delta,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  suffix?: string;
  delta?: number;
}) {
  const deltaTone = delta === undefined ? "" : delta >= 0 ? "text-success" : "text-brand-red";
  const deltaSign = delta !== undefined && delta > 0 ? "+" : "";
  return (
    <div className="kpi-card flex flex-col justify-between min-h-[130px]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-muted-foreground text-[13px] font-medium leading-tight">{label}</div>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${toneIconBg[tone]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className={`text-[26px] md:text-[28px] leading-none font-bold whitespace-nowrap ${toneText[tone]}`}>
          <span className="num">{typeof value === "number" ? fmtNum(value) : value}</span>
          {suffix && <span className="text-[13px] text-muted-foreground mr-1.5 font-medium">{suffix}</span>}
        </div>
        {(delta !== undefined || hint) && (
          <div className="mt-2 flex items-center gap-2 text-[12.5px]">
            {delta !== undefined && (
              <span className={`font-semibold num ${deltaTone}`}>{deltaSign}{delta.toFixed(1)}%</span>
            )}
            {hint && <span className="text-muted-foreground">{hint}</span>}
          </div>
        )}
      </div>
    </div>
  );
}