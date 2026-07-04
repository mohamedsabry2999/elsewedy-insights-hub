import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import StatusBadge from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { store } from "@/lib/store";
import { generateOpportunities, Opportunity } from "@/lib/analytics";
import {
  Bell, RefreshCw, PackageX, TrendingDown, Layers, ArrowUpRight,
  CalendarClock, ShieldAlert, HeartPulse, Search, Sparkles,
} from "lucide-react";

const KINDS: Record<Opportunity["kind"], { label: string; icon: any; color: string }> = {
  reorder: { label: "متابعة إعادة طلب", icon: RefreshCw, color: "gold" },
  lost_product: { label: "منتج متوقف", icon: PackageX, color: "red" },
  slowdown: { label: "تباطؤ نمو", icon: TrendingDown, color: "red" },
  cross_sell: { label: "بيع متقاطع", icon: Layers, color: "success" },
  upsell: { label: "بيع أعلى (Upsell)", icon: ArrowUpRight, color: "success" },
  seasonal: { label: "تذكير موسمي", icon: CalendarClock, color: "gold" },
  dependency: { label: "اعتماد مرتفع", icon: ShieldAlert, color: "gold" },
  reactivate: { label: "إعادة تنشيط عميل", icon: HeartPulse, color: "gold" },
};

const PRIORITY_ORDER = ["عاجل", "مرتفع", "متوسط", "منخفض"] as const;

export default function Opportunities() {
  const tx = store.getTransactions();
  const opps = useMemo(() => generateOpportunities(tx), [tx]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("__all__");
  const [prio, setPrio] = useState<string>("__all__");

  const filtered = opps.filter((o) =>
    (!q || (o.clientName || "").includes(q) || (o.product || "").includes(q) || o.reason.includes(q)) &&
    (kind === "__all__" || o.kind === kind) &&
    (prio === "__all__" || o.priority === prio)
  );

  const grouped = useMemo(() => {
    const g: Record<string, Opportunity[]> = {};
    for (const a of opps) (g[a.kind] ||= []).push(a);
    return g;
  }, [opps]);

  const urgentCount = opps.filter((o) => o.priority === "عاجل").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="محرك فرص البيع والتنبيهات"
        subtitle="تنبيهات ذكية مصنّفة بالنوع والأولوية والإجراء المقترح لفريق المبيعات."
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <span>{opps.length} فرصة</span>
            {urgentCount > 0 && <span className="text-brand-red font-semibold">• {urgentCount} عاجلة</span>}
          </div>
        }
      />

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(KINDS) as Opportunity["kind"][]).map((k) => {
          const meta = KINDS[k]; const Icon = meta.icon;
          const count = grouped[k]?.length || 0;
          const tone = meta.color === "red" ? "text-brand-red" : meta.color === "gold" ? "text-brand-gold" : "text-success";
          return (
            <button key={k} onClick={() => setKind(kind === k ? "__all__" : k)}
              className={`kpi-card text-right flex items-center gap-3 transition ${kind === k ? "ring-2 ring-brand-navy" : ""}`}>
              <div className={`w-10 h-10 rounded-lg bg-muted grid place-items-center ${tone}`}><Icon className="w-5 h-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground">{meta.label}</div>
                <div className={`text-xl font-bold num ${tone}`}>{count}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالعميل أو المنتج أو السبب..." className="pr-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["__all__", ...PRIORITY_ORDER] as const).map((p) => (
            <button key={p} onClick={() => setPrio(p)}
              className={`text-xs px-3 py-1.5 rounded-full border ${prio === p ? "bg-brand-navy text-primary-foreground border-brand-navy" : "border-border hover:bg-muted"}`}>
              {p === "__all__" ? "كل الأولويات" : p}
            </button>
          ))}
        </div>
        {(kind !== "__all__" || prio !== "__all__" || q) && (
          <button onClick={() => { setKind("__all__"); setPrio("__all__"); setQ(""); }}
            className="text-xs text-brand-red hover:underline">مسح الفلاتر</button>
        )}
      </div>

      {/* Rich table */}
      <Section title={`قائمة الفرص (${filtered.length})`}>
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-40" />
            لا توجد فرص مطابقة للفلاتر الحالية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-right py-2 px-2">النوع</th>
                  <th className="text-right py-2 px-2">العميل</th>
                  <th className="text-right py-2 px-2">المنتج</th>
                  <th className="text-right py-2 px-2">السبب</th>
                  <th className="text-right py-2 px-2">التأثير المتوقع</th>
                  <th className="text-right py-2 px-2">الأولوية</th>
                  <th className="text-right py-2 px-2 min-w-64">الإجراء المقترح</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const meta = KINDS[o.kind]; const Icon = meta.icon;
                  const tone = meta.color === "red" ? "text-brand-red" : meta.color === "gold" ? "text-brand-gold" : "text-success";
                  return (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/30 align-top">
                      <td className="py-3 px-2">
                        <div className={`flex items-center gap-2 ${tone}`}>
                          <Icon className="w-4 h-4" />
                          <span className="text-xs font-semibold whitespace-nowrap">{meta.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium">
                        {o.clientId ? (
                          <Link to={`/client/${o.clientId}`} className="text-brand-navy hover:text-brand-red hover:underline">{o.clientName}</Link>
                        ) : (o.clientName || "—")}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{o.product || "—"}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground max-w-xs">{o.reason}</td>
                      <td className="py-3 px-2 text-xs">{o.impact}</td>
                      <td className="py-3 px-2"><StatusBadge status={o.priority} /></td>
                      <td className="py-3 px-2 text-xs leading-relaxed">{o.action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}