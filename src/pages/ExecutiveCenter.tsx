import { useMemo } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import Section from "@/components/Section";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { store } from "@/lib/store";
import {
  totalSales, ordersCount, uniqueClients, avgOrderValue, yoyGrowth, cagr,
  topProducts, byYear, reorderStats, clientSummary, clientStatus, healthScore,
  generateOpportunities, executiveNarrative, bySector, fmtCurrency, fmtDate, fmtNum, trendLabel,
} from "@/lib/analytics";
import {
  DollarSign, ShoppingCart, Users, TrendingUp, Star, Package,
  AlertTriangle, Sparkles, Crown, Skull, HeartPulse,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function ExecutiveCenter() {
  const tx = store.getTransactions();
  const clients = store.getClients();

  const kpis = useMemo(() => ({
    sales: totalSales(tx),
    orders: ordersCount(tx),
    clients: uniqueClients(tx),
    aov: avgOrderValue(tx),
    growth: yoyGrowth(tx),
    cagr: cagr(tx),
  }), [tx]);

  const products = topProducts(tx, 8);
  const years = byYear(tx);
  const opps = generateOpportunities(tx);
  const urgent = opps.filter((o) => o.priority === "عاجل");
  const narrative = executiveNarrative(tx);
  const sectorPerf = bySector(tx, clients);

  // Client ranking
  const clientRows = clients.map((c) => {
    const s = clientSummary(tx, c.id);
    return { ...c, sales: s?.sales || 0, orders: s?.orders || 0,
      last: s?.last, growth: s?.growth || 0,
      health: healthScore(tx, c.id), status: clientStatus(tx, c.id) };
  });
  const strongest = [...clientRows].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const atRisk = clientRows.filter((c) => c.status === "خطر").sort((a, b) => b.sales - a.sales).slice(0, 5);
  const lost = clientRows.filter((c) => c.status === "مفقود").sort((a, b) => b.sales - a.sales).slice(0, 5);

  const cycles = reorderStats(tx);
  const stoppedProducts = cycles.filter((r) => r.status === "متوقف" && r.orders >= 2).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  const topFrequency = [...products].sort((a, b) => b.orders - a.orders).slice(0, 6);

  const expectedPipeline = opps
    .filter((o) => o.kind === "reorder" || o.kind === "lost_product" || o.kind === "reactivate")
    .reduce((s, o) => {
      const m = /([\d,]+)\s*ج\.م/.exec(o.impact);
      return s + (m ? +m[1].replace(/,/g, "") : 0);
    }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز القيادة التنفيذي"
        subtitle="مؤشرات إدارية شاملة لأداء العملاء والمنتجات وفرص النمو."
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className={`px-3 py-1.5 rounded-full border ${kpis.growth >= 0 ? "border-success/40 bg-success/10 text-success" : "border-brand-red/40 bg-brand-red/10 text-brand-red"}`}>
              الاتجاه: {trendLabel(kpis.growth)}
            </span>
          </div>
        }
      />

      {/* KPI hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KpiCard label="إجمالي المبيعات" value={fmtCurrency(kpis.sales)} icon={DollarSign} />
        <KpiCard label="عدد الطلبات" value={kpis.orders} icon={ShoppingCart} />
        <KpiCard label="العملاء النشطون" value={kpis.clients} icon={Users} />
        <KpiCard label="متوسط قيمة الطلب" value={fmtCurrency(kpis.aov)} icon={TrendingUp} tone="gold" />
        <KpiCard label="نمو سنوي" value={`${kpis.growth.toFixed(1)}%`} tone={kpis.growth >= 0 ? "success" : "red"} />
        <KpiCard label="CAGR" value={kpis.cagr ? `${kpis.cagr.toFixed(1)}%` : "—"} tone="gold" />
      </div>

      {/* Narrative */}
      <Section title="ملخص تنفيذي ذكي">
        <ul className="space-y-2 text-sm leading-relaxed">
          {narrative.map((s, i) => (
            <li key={i} className="flex gap-2 items-start">
              <Sparkles className="w-4 h-4 text-brand-gold mt-0.5 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Row: Sector performance + Sales by year */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="أداء القطاعات">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-right py-2 px-2">القطاع</th>
                  <th className="text-right py-2 px-2">المبيعات</th>
                  <th className="text-right py-2 px-2">الطلبات</th>
                  <th className="text-right py-2 px-2">العملاء</th>
                  <th className="text-right py-2 px-2">الحصة</th>
                </tr>
              </thead>
              <tbody>
                {sectorPerf.map((s) => {
                  const share = kpis.sales ? (s.sales / kpis.sales) * 100 : 0;
                  return (
                    <tr key={s.sector} className="border-b border-border/40">
                      <td className="py-2 px-2 font-medium">{s.sector}</td>
                      <td className="py-2 px-2 num">{fmtCurrency(s.sales)}</td>
                      <td className="py-2 px-2 num">{fmtNum(s.orders)}</td>
                      <td className="py-2 px-2 num">{s.clients}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-brand-gold" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-xs num">{share.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="المبيعات السنوية">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={years}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} orientation="right" />
              <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
              <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--brand-gold))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* Clients: strongest / at risk / lost */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ClientList title="أقوى العملاء" icon={<Crown className="w-4 h-4 text-brand-gold" />} rows={strongest} />
        <ClientList title="عملاء في خطر" icon={<HeartPulse className="w-4 h-4 text-brand-red" />} rows={atRisk} empty="لا يوجد عملاء في خطر حاليًا." />
        <ClientList title="عملاء مفقودون" icon={<Skull className="w-4 h-4 text-muted-foreground" />} rows={lost} empty="لا يوجد عملاء مفقودون." />
      </div>

      {/* Top products / stopped */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="المنتجات الأعلى مبيعًا والأكثر تكرارًا">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">أعلى إيرادًا</h4>
              <ul className="text-sm space-y-1">
                {products.slice(0, 6).map((p) => (
                  <li key={p.name} className="flex justify-between border-b border-border/40 py-1.5">
                    <span className="truncate">{p.name}</span>
                    <span className="num text-muted-foreground">{fmtCurrency(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">أكثر تكرارًا</h4>
              <ul className="text-sm space-y-1">
                {topFrequency.map((p) => (
                  <li key={p.name} className="flex justify-between border-b border-border/40 py-1.5">
                    <span className="truncate">{p.name}</span>
                    <span className="num text-muted-foreground">{p.orders} طلب</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <Section title="منتجات متوقفة (مرشحة لإعادة التنشيط)">
          {stoppedProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد منتجات متوقفة حاليًا.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {stoppedProducts.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.product}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      <Link to={`/client/${r.clientId}`} className="hover:underline">{r.clientName}</Link> • آخر طلب {fmtDate(r.lastOrder)}
                    </div>
                  </div>
                  <div className="text-xs text-brand-red num whitespace-nowrap">{fmtCurrency(r.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Urgent opportunities */}
      <Section title="فرص متابعة عاجلة" actions={<span className="text-xs text-muted-foreground">قيمة تقريبية للأنبوب: <b className="num text-brand-navy">{fmtCurrency(expectedPipeline)}</b></span>}>
        {urgent.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد فرص عاجلة حاليًا. جميع المؤشرات مستقرة.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgent.slice(0, 9).map((o, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-background">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-brand-red" />
                  <span className="text-xs font-semibold">{o.label}</span>
                  <StatusBadge status={o.priority} />
                </div>
                {o.clientName && (
                  <div className="text-sm font-medium text-brand-navy">
                    {o.clientId ? <Link to={`/client/${o.clientId}`} className="hover:text-brand-red hover:underline">{o.clientName}</Link> : o.clientName}
                  </div>
                )}
                {o.product && <div className="text-xs text-muted-foreground">{o.product}</div>}
                <div className="text-xs text-muted-foreground mt-2">{o.reason}</div>
                <div className="text-xs mt-2 text-brand-navy">💡 {o.action}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ClientList({
  title, icon, rows, empty,
}: {
  title: string; icon: React.ReactNode;
  rows: { id: string; name: string; sector?: string; sales: number; status: string }[];
  empty?: string;
}) {
  return (
    <Section title={title} actions={<span>{icon}</span>}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty || "لا توجد بيانات."}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="min-w-0">
                <Link to={`/client/${c.id}`} className="font-medium text-brand-navy hover:text-brand-red hover:underline block truncate">{c.name}</Link>
                <div className="text-xs text-muted-foreground">{c.sector || "—"}</div>
              </div>
              <div className="text-left">
                <div className="num text-xs text-muted-foreground">{fmtCurrency(c.sales)}</div>
                <StatusBadge status={c.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}