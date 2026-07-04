import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import { store } from "@/lib/store";
import { generateAlerts } from "@/lib/analytics";
import {
  Bell, RefreshCw, PackageX, TrendingDown, Layers, ArrowUpRight,
  CalendarClock, ShieldAlert, HeartPulse,
} from "lucide-react";

const KINDS: Record<string, { label: string; icon: any; color: string }> = {
  reorder: { label: "متابعة إعادة طلب", icon: RefreshCw, color: "gold" },
  lost_product: { label: "منتج متوقف", icon: PackageX, color: "red" },
  slowdown: { label: "تباطؤ نمو", icon: TrendingDown, color: "red" },
  cross_sell: { label: "بيع متقاطع", icon: Layers, color: "success" },
  upsell: { label: "بيع أعلى", icon: ArrowUpRight, color: "success" },
  seasonal: { label: "تذكير موسمي", icon: CalendarClock, color: "gold" },
  dependency: { label: "اعتماد مرتفع", icon: ShieldAlert, color: "gold" },
  reactivate: { label: "إعادة تنشيط", icon: HeartPulse, color: "gold" },
};

export default function Opportunities() {
  const tx = store.getTransactions();
  const alerts = useMemo(() => generateAlerts(tx), [tx]);
  const grouped = useMemo(() => {
    const g: Record<string, typeof alerts> = {};
    for (const a of alerts) (g[a.kind] ||= []).push(a);
    return g;
  }, [alerts]);

  return (
    <div className="space-y-6">
      <PageHeader title="الفرص والتنبيهات" subtitle="بطاقات تنبيه ذكية للمتابعة، البيع المتقاطع، إعادة التنشيط، وتقليل المخاطر." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(KINDS).map(([k, meta]) => {
          const Icon = meta.icon;
          const count = grouped[k]?.length || 0;
          const tone = meta.color === "red" ? "text-brand-red" : meta.color === "gold" ? "text-brand-gold" : "text-success";
          return (
            <div key={k} className="kpi-card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted grid place-items-center ${tone}`}><Icon className="w-5 h-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground">{meta.label}</div>
                <div className={`text-xl font-bold num ${tone}`}>{count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {Object.entries(grouped).map(([k, list]) => {
        const meta = KINDS[k] || { label: k, icon: Bell, color: "gold" };
        const Icon = meta.icon;
        return (
          <Section key={k} title={`${meta.label} (${list.length})`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((a, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${meta.color === "red" ? "text-brand-red" : meta.color === "gold" ? "text-brand-gold" : "text-success"}`} />
                    <span className="text-xs font-semibold">{a.label}</span>
                  </div>
                  {a.clientName && <div className="text-sm font-medium text-brand-navy">{a.clientName}</div>}
                  {a.product && <div className="text-xs text-muted-foreground">{a.product}</div>}
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{a.detail}</div>
                </div>
              ))}
            </div>
          </Section>
        );
      })}

      {alerts.length === 0 && (
        <Section title="لا توجد فرص حالية">
          <p className="text-sm text-muted-foreground">جميع المؤشرات ضمن المعدل الطبيعي. تابع الرفع الدوري للبيانات لاكتشاف فرص جديدة.</p>
        </Section>
      )}
    </div>
  );
}