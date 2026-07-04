import { useMemo } from "react";
import { store } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import Section from "@/components/Section";
import {
  totalSales, ordersCount, uniqueClients, avgOrderValue, yoyGrowth,
  topClient, topProducts, byYear, byMonth, generateAlerts, fmtCurrency, fmtDate, fmtNum,
} from "@/lib/analytics";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { DollarSign, ShoppingCart, Users, TrendingUp, Star, Package, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const tx = store.getTransactions();
  const uploads = store.getUploads();

  const kpis = useMemo(() => ({
    sales: totalSales(tx),
    orders: ordersCount(tx),
    clients: uniqueClients(tx),
    aov: avgOrderValue(tx),
    growth: yoyGrowth(tx),
    top: topClient(tx),
  }), [tx]);

  const products = topProducts(tx, 8);
  const years = byYear(tx);
  const months = byMonth(tx).slice(-18);
  const alerts = generateAlerts(tx).slice(0, 6);
  const topProd = products[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة القيادة التنفيذية"
        subtitle="نظرة شاملة على أداء العملاء والمبيعات وفرص النمو."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="إجمالي المبيعات" value={fmtCurrency(kpis.sales)} icon={DollarSign} tone="default" />
        <KpiCard label="عدد الطلبات" value={kpis.orders} icon={ShoppingCart} />
        <KpiCard label="عدد العملاء" value={kpis.clients} icon={Users} />
        <KpiCard label="متوسط قيمة الطلب" value={fmtCurrency(kpis.aov)} icon={TrendingUp} tone="gold" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="نمو سنوي" value={`${kpis.growth.toFixed(1)}%`} tone={kpis.growth >= 0 ? "success" : "red"} icon={TrendingUp} />
        <KpiCard label="أفضل عميل" value={kpis.top?.name || "—"} hint={kpis.top ? fmtCurrency(kpis.top.revenue) : ""} icon={Star} tone="gold" />
        <KpiCard label="أفضل منتج" value={topProd?.name || "—"} hint={topProd ? fmtCurrency(topProd.revenue) : ""} icon={Package} />
        <KpiCard label="فرص عاجلة" value={alerts.length} icon={AlertTriangle} tone="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="المبيعات الشهرية">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={months} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} reversed />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} orientation="right" />
                <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
                <Line type="monotone" dataKey="sales" name="المبيعات" stroke="hsl(var(--brand-navy))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Section>
        </div>
        <Section title="المبيعات السنوية">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={years} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} orientation="right" />
              <Tooltip contentStyle={{ direction: "rtl", fontFamily: "Cairo" }} />
              <Bar dataKey="sales" name="المبيعات" fill="hsl(var(--brand-gold))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="أكثر المنتجات مبيعًا">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-right py-2 px-2">المنتج</th>
                    <th className="text-right py-2 px-2">الإيراد</th>
                    <th className="text-right py-2 px-2">الطلبات</th>
                    <th className="text-right py-2 px-2">الكمية</th>
                    <th className="text-right py-2 px-2">آخر طلب</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.name} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                      <td className="py-2 px-2 font-medium">{p.name}</td>
                      <td className="py-2 px-2"><span className="num">{fmtCurrency(p.revenue)}</span></td>
                      <td className="py-2 px-2"><span className="num">{fmtNum(p.orders)}</span></td>
                      <td className="py-2 px-2"><span className="num">{fmtNum(p.qty)}</span></td>
                      <td className="py-2 px-2 text-muted-foreground">{fmtDate(p.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
        <Section title="آخر عمليات الرفع">
          {uploads.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عمليات رفع بعد. البيانات التجريبية جاهزة للاستخدام.</p>}
          <ul className="space-y-3">
            {uploads.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0">
                <div>
                  <div className="font-medium text-brand-navy">{u.clientName}</div>
                  <div className="text-xs text-muted-foreground">{u.fileName} • {u.year}</div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  <span className="num">{fmtNum(u.rows)}</span> سطر
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="أهم التنبيهات والفرص">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((a, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${a.color === "red" ? "bg-brand-red" : a.color === "gold" ? "bg-brand-gold" : "bg-success"}`} />
                <span className="text-xs font-semibold text-brand-navy">{a.label}</span>
              </div>
              {a.clientName && <div className="text-sm font-medium">{a.clientName}</div>}
              <div className="text-xs text-muted-foreground mt-1">{a.detail}</div>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالية.</p>}
        </div>
      </Section>
    </div>
  );
}